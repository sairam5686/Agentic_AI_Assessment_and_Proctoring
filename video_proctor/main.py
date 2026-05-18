"""
main.py  (clean — single front cam only)
────────────────────────────────────────
Proctoring loop for front camera only.

Concurrency model
─────────────────
• ThreadPoolExecutor(max_workers=4) wraps the entire proctoring loop.
• audio_agent runs in a dedicated background thread that pushes results
  into an audio_queue (queue.Queue).  The main loop drains the queue
  each iteration with get_nowait(); if the queue is empty it falls back
  to a safe default dict.
• vision_agent, attention_agent, and spoofing_agent are submitted to
  the executor simultaneously via executor.submit() each iteration,
  using an immutable frame_snapshot so no thread races on the frame.
• Each future is resolved with .result(timeout=2.0) in its own
  try/except; on failure a safe default dict is substituted.
• Only the main thread writes to session.*  No worker thread touches global state.
"""

import cv2
import time
import queue
import threading
import numpy as np
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError, as_completed
from datetime import datetime  # DEBUG – remove after testing

import state
from agents.vision_agent     import VisionAgent
from agents.attention_agent  import AttentionAgent
from agents.violation_agent  import ViolationAgent
from agents.supervisor_agent import SupervisorAgent
from agents.report_agent     import ReportAgent
from agents.risk_agent       import RiskAgent
from agents.audio_agent      import AudioAgent
from agents.spoofing_agent   import SpoofingAgent
from Connections.ViolationLogsDB import Risk_Score_DB


# ─────────────────────────────────────────────────────────────
# Safe default dicts  (used when an agent future times out / fails)
# ─────────────────────────────────────────────────────────────
_DEFAULT_VISION = {
    "face_visible": False,
    "multiple_people": False,
    "illegal_objects": False,
}

_DEFAULT_ATTENTION = {
    "attention": True,
    "drowsy": False,
    "head_turn": False,
    "mouth_open": False,
}

_DEFAULT_AUDIO = {
    "talking": False,
    "loud_noise": False,
}

_DEFAULT_SPOOF = {
    "is_fake": False,
}


# ─────────────────────────────────────────────────────────────
# Audio background worker
# ─────────────────────────────────────────────────────────────
def _audio_worker(audio_agent, audio_q: queue.Queue, stop_event: threading.Event) -> None:
    """Continuously calls audio_agent.analyze_audio() and enqueues results."""
    while not stop_event.is_set():
        try:
            result = audio_agent.analyze_audio()
            audio_q.put(result)
        except Exception as e:
            print(f"[AUDIO WORKER] error: {e}")
        time.sleep(0.05)


# ─────────────────────────────────────────────────────────────
# Front-cam proctoring loop
# ─────────────────────────────────────────────────────────────
def run_proctoring(session):
    # Create fresh agent instances isolated to this session
    vision_agent    = VisionAgent()
    attention_agent = AttentionAgent()
    audio_agent     = AudioAgent()
    spoofing_agent  = SpoofingAgent()

    session.risk_agent      = RiskAgent()
    session.violation_agent = ViolationAgent(session=session)

    supervisor_agent = SupervisorAgent(session.risk_agent, session.violation_agent)
    report_agent     = ReportAgent(session.risk_agent, session.violation_agent, session=session)

    attention_scores = []
    audio_agent.start()

    start   = time.time()
    elapsed = 0

    audio_q    = queue.Queue()
    stop_event = threading.Event()

    with ThreadPoolExecutor(max_workers=4) as executor:
        # Launch dedicated audio thread inside the executor
        executor.submit(_audio_worker, audio_agent, audio_q, stop_event)

        while session.proctoring_active:
            frame     = session.latest_frame
            frame_age = time.time() - session.latest_frame_time

            if frame is None or frame_age > 2.0:
                time.sleep(0.03)
                continue

            frame = cv2.resize(frame, (640, 480))

            # ── Immutable snapshot for all agent calls ─────────
            frame_snapshot = frame.copy()

            # ── Drain audio queue (non-blocking) ───────────────
            audio_data = _DEFAULT_AUDIO.copy()
            try:
                audio_data = audio_q.get_nowait()
            except queue.Empty:
                pass

            # ── Submit vision / attention / spoofing in parallel ─
            print(f"[DEBUG][SUBMIT] vision_agent    @ {datetime.now().strftime('%H:%M:%S.%f')}")  # DEBUG
            print(f"[DEBUG][SUBMIT] attention_agent @ {datetime.now().strftime('%H:%M:%S.%f')}")  # DEBUG
            print(f"[DEBUG][SUBMIT] spoofing_agent  @ {datetime.now().strftime('%H:%M:%S.%f')}")  # DEBUG

            futures = {
                executor.submit(vision_agent.analyze_vision,      frame_snapshot): "vision",
                executor.submit(attention_agent.analyze_attention, frame_snapshot): "attention",
                executor.submit(spoofing_agent.analyze_spoofing,  frame_snapshot): "spoofing",
            }

            # ── Process each result as soon as it arrives ───────
            try:
                for future in as_completed(futures, timeout=2.0):
                    agent_name = futures[future]
                    try:
                        result = future.result()
                        print(f"[DEBUG][RESULT] {agent_name}_agent @ {datetime.now().strftime('%H:%M:%S.%f')} – OK")  # DEBUG
                        if agent_name == "vision":
                            supervisor_agent.supervise_vision(result, frame_snapshot)
                        elif agent_name == "attention":
                            supervisor_agent.supervise_attention(result, frame_snapshot)
                        elif agent_name == "spoofing":
                            supervisor_agent.supervise_spoofing(result, frame_snapshot)
                    except Exception as e:
                        print(f"[{agent_name.upper()}] agent failed: {e}")
            except FuturesTimeoutError:
                print("[MAIN] as_completed timed out — some agents did not finish in 2.0 s")

            # ── Audio is always from queue — supervise immediately ─
            supervisor_agent.supervise_audio(audio_data, frame_snapshot)

            # ── All state writes happen here on the main thread ─
            try:
                cv2.putText(
                    frame_snapshot,
                    f"Suspicion:{session.risk_agent.suspicion_score}",
                    (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.7,
                    (0, 0, 255),
                    2,
                )

                # ── Periodic Report Update (every 30 frames) ───
                session.frame_count = getattr(session, "frame_count", 0) + 1
                if session.frame_count % 30 == 0:
                    avg_attention = int(np.mean(attention_scores)) if attention_scores else 0
                    elapsed = time.time() - start
                    report_agent.generate_reports(elapsed, avg_attention)
                    print(f"[FRONT] Periodic report updated for {session.email_id} (Frame {session.frame_count})")
                    
                    # ── Real-time MongoDB Score Upsert ──────────────────────────────────
                    if Risk_Score_DB is not None:
                        try:
                            Risk_Score_DB.update_one(
                                {"assessment_id": session.assessment_id, "email": session.email_id},
                                {"$set": {
                                    "video_proctoring.risk_score":      session.risk_agent.suspicion_score,
                                    "video_proctoring.trust_score":     session.risk_agent.get_trust_score(),
                                    "video_proctoring.violation_score": sum(session.risk_agent.violation_counts.values()),
                                    "timestamp":                       time.strftime("%Y-%m-%d %H:%M:%S")
                                }},
                                upsert=True
                            )
                        except Exception as db_err:
                            print(f"[Video DB Sync] Error: {db_err}")

                session.latest_frame = frame_snapshot

            except Exception as e:
                print(f"[MAIN] state-write error: {e}")

            time.sleep(0.03)

        # ── Signal audio worker to stop ────────────────────────
        stop_event.set()

    # ── Clean shutdown ───────────────────────────────
    audio_agent.stop()
    try:
        cv2.destroyAllWindows()
    except Exception:
        pass

    avg_attention = int(np.mean(attention_scores)) if attention_scores else 0
    elapsed = time.time() - start
    report_agent.generate_reports(elapsed, avg_attention)

    # ── Final Score Sync  (main thread only) ─────────
    session.risk_score      = session.risk_agent.suspicion_score
    session.trust_score     = session.risk_agent.get_trust_score()
    session.violation_score = sum(session.risk_agent.violation_counts.values())
    session.save_state()

    print(f"FRONT CAM PROCTORING DONE FOR {session.email_id} ✅")
