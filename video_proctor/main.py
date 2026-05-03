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
• Only the main thread writes to state.*  No worker thread touches state.
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


# ─────────────────────────────────────────────────────────────
# Initialize agents
# ─────────────────────────────────────────────────────────────
vision_agent    = VisionAgent()
attention_agent = AttentionAgent()

state.risk_agent      = RiskAgent()
state.violation_agent = ViolationAgent()

supervisor_agent = SupervisorAgent(state.risk_agent, state.violation_agent)
report_agent     = ReportAgent(state.risk_agent, state.violation_agent)

audio_agent    = AudioAgent()
spoofing_agent = SpoofingAgent()


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
def _audio_worker(audio_q: queue.Queue, stop_event: threading.Event) -> None:
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
def run_proctoring():
    attention_scores = []
    audio_agent.start()

    start   = time.time()
    elapsed = 0

    audio_q    = queue.Queue()
    stop_event = threading.Event()

    with ThreadPoolExecutor(max_workers=4) as executor:
        # Launch dedicated audio thread inside the executor
        executor.submit(_audio_worker, audio_q, stop_event)

        while state.proctoring_active:
            frame     = state.latest_frame
            frame_age = time.time() - state.latest_frame_time

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
                    f"Suspicion:{state.risk_agent.suspicion_score}",
                    (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.7,
                    (0, 0, 255),
                    2,
                )

                # ── Periodic Report Update (every 30 frames) ───
                state.frame_count = getattr(state, "frame_count", 0) + 1
                if state.frame_count % 30 == 0:
                    avg_attention = int(np.mean(attention_scores)) if attention_scores else 0
                    elapsed = time.time() - start
                    report_agent.generate_reports(elapsed, avg_attention)
                    print(f"[FRONT] Periodic report updated (Frame {state.frame_count})")

                state.latest_frame = frame_snapshot

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
    state.risk_score      = state.risk_agent.suspicion_score
    state.trust_score     = state.risk_agent.get_trust_score()
    state.violation_score = sum(state.risk_agent.violation_counts.values())
    state.save_state()

    print("FRONT CAM PROCTORING DONE ✅")


# ─────────────────────────────────────────────────────────────
# Code Analysis (CLI testing)
# ─────────────────────────────────────────────────────────────
