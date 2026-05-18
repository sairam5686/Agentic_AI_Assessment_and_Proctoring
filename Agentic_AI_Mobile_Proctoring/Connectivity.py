"""
Connectivity.py — Pure function-call proctoring entry point.

Public API
──────────
  analyze_frame(frame, assessment_id, email_id, session) → dict
      Run ONE frame through all agents. Returns a structured result dict.

  run_session(source, assessment_id, email_id, show_preview) → dict
      Run a full proctoring session from a webcam index or video file path.
      Blocks until the source ends or the user presses 'q'.
      Generates outputs/analytics.json and outputs/report.pdf.
      Returns the final analytics dict.
"""

import time
import cv2
import numpy as np
from concurrent.futures import ThreadPoolExecutor, as_completed
from concurrent.futures import TimeoutError as FuturesTimeoutError
from collections import defaultdict
from typing import Optional

from agents.vision_agent     import VisionAgent
from agents.gesture_agent    import GestureAgent
from agents.supervisor_agent import SupervisorAgent
from agents.risk_agent       import RiskAgent
from agents.violation_agent  import ViolationAgent
from agents.report_agent     import ReportAgent


# ─────────────────────────────────────────────────────────────────────────────
# Data class to hold a live session's agent instances
# ─────────────────────────────────────────────────────────────────────────────

class ProctoringSession:
    """
    Holds all agent instances for one exam session.
    Create once per session; reuse across many analyze_frame() calls.
    """

    def __init__(self, model_path: str = "models/yolov8s.pt"):
        self.risk_agent      = RiskAgent()
        self.violation_agent = ViolationAgent()
        self.vision_agent    = VisionAgent(model_path=model_path)
        self.gesture_agent   = GestureAgent()
        self.supervisor      = SupervisorAgent(self.risk_agent, self.violation_agent)
        self.report_agent    = ReportAgent(self.risk_agent, self.violation_agent)
        self.session_start   = time.time()
        self.frame_count     = 0

        # ── Concurrency & frame-drop guard ────────────────────────────────────
        self.processing  = False  # True while a frame is being analysed
        self._executor   = ThreadPoolExecutor(max_workers=2)  # vision + gesture in parallel

        # ── Per-agent result cache (used as fallback on timeout / error) ──────
        self._last_valid = {"vision": None, "gesture": None}

        # ── N-frame consolidation buffers (violation name → deque of bools) ──
        self._buffers = defaultdict(list)

        # ── Minimum consecutive detections required before a violation fires ─
        self._thresholds = {
            "face_not_visible":   2,
            "multiple_people":    1,
            "illegal_objects":    1,
            "suspicious_gesture": 2,
            "phone_detected":     1,
            "looking_away":       2,
            "reaching_down":      2,
            "person_not_found":   2,
        }

        print("[MobileProctor] All agents initialised.")

    def _should_fire(self, violation: str, detected: bool) -> bool:
        """
        N-frame debounce gate: returns True only when the violation has been
        detected in every one of the last N consecutive frames.

        This eliminates single-frame false positives (lighting glitch, YOLO
        jitter, etc.) without modifying any agent or supervisor file.

        Args:
            violation : key matching self._thresholds (e.g. "multiple_people")
            detected  : whether this agent flagged the violation this frame

        Returns:
            True  → violation is genuine; pass it through to supervisor
            False → not enough consecutive detections yet; suppress this frame
        """
        n   = self._thresholds.get(violation, 5)
        buf = self._buffers[violation]
        buf.append(detected)
        # Keep only the last N entries to bound memory
        if len(buf) > n:
            del buf[:-n]
        return len(buf) == n and all(buf)


    def close(self):
        """
        Explicitly close all resource-heavy agents and the thread-pool executor.
        """
        # Shut down the shared executor (non-blocking so FastAPI can respond)
        if hasattr(self, "_executor"):
            self._executor.shutdown(wait=False)
        if hasattr(self, "vision_agent"):
            self.vision_agent.close()
        if hasattr(self, "gesture_agent"):
            self.gesture_agent.close()
        print("[MobileProctor] Session resources closed.")




# ─────────────────────────────────────────────────────────────────────────────
# Single-frame function call
# ─────────────────────────────────────────────────────────────────────────────

def analyze_frame(
    frame: np.ndarray,
    assessment_id: str = "",
    email_id:      str = "",
    session: Optional[ProctoringSession] = None,
) -> dict:
    """
    Analyse ONE video frame through all proctoring agents.

    Args:
        frame         : BGR OpenCV frame (numpy array)
        assessment_id : exam / assessment identifier string
        email_id      : candidate email string
        session       : a ProctoringSession instance to reuse across calls.
                        If None, a fresh session is created (agents re-init each call —
                        use for single-shot testing only).

    Returns:
        {
          "suspicion_score":      int,        # 0–30
          "trust_score":          int,        # 0–30
          "risk_level":           str,        # "NORMAL" / "LOW RISK" / "MEDIUM RISK" / "HIGH RISK"
          "active_warning":       dict|None,  # {title, message, event, repeat, penalty, time}
          "violations_this_frame":list[str],  # violation types that fired this frame
          "vision":               dict,       # raw output of VisionAgent
          "gesture":              dict,       # raw output of GestureAgent
          "total_violation_count":int,        # cumulative count for the session
          "test_terminated":      bool,       # True if identity verification fails or other critical violation occurs
        }
    """
    own_session = session is None
    if own_session:
        session = ProctoringSession()

    session.frame_count += 1

    # ── Safe defaults (used on agent timeout / error) ─────────────────────────
    _DEFAULT_VISION  = {"face_visible": True, "multiple_people": False, "illegal_objects": [], "people_count": 1}
    _DEFAULT_GESTURE = {"suspicious_gesture": False, "phone_detected": False,
                        "looking_away": False, "reaching_down": False}

    # ── Take a single snapshot so both agents see the exact same frame ────────
    frame_snapshot = frame.copy()

    # ── Dispatch vision + gesture in parallel via the session executor ────────
    futures = {
        session._executor.submit(session.vision_agent.analyze_vision,    frame_snapshot): "vision",
        session._executor.submit(session.gesture_agent.analyze_gestures, frame_snapshot): "gesture",
    }

    vision_data  = None
    gesture_data = None

    for future in as_completed(futures, timeout=2.0):
        agent_name = futures[future]
        try:
            result = future.result()
            if result:                              # cache the last valid output
                session._last_valid[agent_name] = result
            if agent_name == "vision":
                vision_data  = result or session._last_valid["vision"]  or _DEFAULT_VISION
            else:
                gesture_data = result or session._last_valid["gesture"] or _DEFAULT_GESTURE
        except (FuturesTimeoutError, Exception) as exc:
            print(f"[Mobile][{agent_name}] agent failed: {exc}")
            if agent_name == "vision":
                vision_data  = session._last_valid["vision"]  or _DEFAULT_VISION
            else:
                gesture_data = session._last_valid["gesture"] or _DEFAULT_GESTURE

    # ── Final safety fallback if as_completed itself timed out ────────────────
    if vision_data  is None: vision_data  = _DEFAULT_VISION
    if gesture_data is None: gesture_data = _DEFAULT_GESTURE

    # ── N-frame debounce: pre-filter vision_data before supervisor sees it ────
    # We build a filtered copy so the supervisor fires only on genuine,
    # consecutive detections — without touching supervisor_agent.py at all.
    filtered_vision = {
        "face_visible":    vision_data.get("face_visible", True),
        # multiple_people fires only after 1 consecutive detection
        "multiple_people": (
            vision_data.get("multiple_people", False)
            and session._should_fire("multiple_people", vision_data.get("multiple_people", False))
        ),
        # person_not_found fires only after 2 consecutive detections
        "person_not_found": (
            vision_data.get("people_count", 1) == 0
            and session._should_fire("person_not_found", vision_data.get("people_count", 1) == 0)
        ),
        # illegal_objects fires only after 1 consecutive frame for each obj
        "illegal_objects": [
            obj for obj in vision_data.get("illegal_objects", [])
            if session._should_fire(f"illegal_obj:{obj}", True)
        ],
    }

    filtered_gesture = {
        k: (
            v and session._should_fire(k, bool(v))
        )
        for k, v in gesture_data.items()
    }

    violations_this_frame = session.supervisor.supervise(
        vision_data   = filtered_vision,
        gesture_data  = filtered_gesture,
        frame         = frame,
        assessment_id = assessment_id,
        email_id      = email_id,
    )

    # ── Reset _should_fire buffers for any violation NOT detected this frame ──
    # This ensures the N-consecutive counter resets on clean frames.
    for viol_key in list(session._buffers.keys()):
        # If the buffer's last entry was False, clear it to avoid stale counts
        if session._buffers[viol_key] and not session._buffers[viol_key][-1]:
            session._buffers[viol_key].clear()

    result = {
        "suspicion_score":       session.risk_agent.suspicion_score,
        "trust_score":           session.risk_agent.get_trust_score(),
        "risk_level":            session.risk_agent.get_risk_level(),
        "active_warning":        session.risk_agent.active_warning,
        "violations_this_frame": violations_this_frame,
        "vision":                vision_data,
        "gesture":               gesture_data,
        "total_violation_count": len(session.violation_agent.violations),
        "test_terminated":       session.risk_agent.test_terminated,
    }

    return result



def run_session(
    source,
    assessment_id:  str  = "",
    email_id:       str  = "",
    model_path:     str  = "models/yolov8s.pt",
    show_preview:   bool = False,
) -> dict:
    """
    Run a complete proctoring session from a video source.

    Args:
        source        : webcam device index (int, e.g. 0) OR path to a video file (str)
        assessment_id : exam / assessment identifier
        email_id      : candidate email
        model_path    : path to YOLOv8 weights file
        show_preview  : if True, show annotated frame in an OpenCV window (press 'q' to stop)

    Returns:
        Final analytics dict (same as analytics.json content), plus:
          "report_path"    : str  path to outputs/report.pdf
          "analytics_path" : str  path to outputs/analytics.json

    Side-effects:
        • Saves evidence screenshots to  outputs/evidence/{type}_{timestamp}.jpg
        • Saves analytics to             outputs/analytics.json
        • Saves PDF report to            outputs/report.pdf
    """
    session = ProctoringSession(model_path=model_path)
    cap     = cv2.VideoCapture(source)

    if not cap.isOpened():
        raise RuntimeError(f"[MobileProctor] Cannot open video source: {source}")

    print(f"[MobileProctor] Session started — source={source}  id={assessment_id}  email={email_id}")

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("[MobileProctor] End of video source.")
                break

            result = analyze_frame(
                frame         = frame,
                assessment_id = assessment_id,
                email_id      = email_id,
                session       = session,
            )

            # Overlay suspicion score on the frame
            score = result["suspicion_score"]
            level = result["risk_level"]
            # Thresholds rescaled for 30-point max (70% = 21, 30% = 9)
            color = (0, 0, 255) if score >= 21 else (0, 165, 255) if score >= 9 else (0, 200, 0)
            cv2.putText(
                frame,
                f"Suspicion: {score}  [{level}]",
                (10, frame.shape[0] - 20),
                cv2.FONT_HERSHEY_SIMPLEX, 0.65, color, 2,
            )

            if show_preview:
                cv2.imshow("Mobile Proctor", frame)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    print("[MobileProctor] User pressed 'q' — stopping.")
                    break

            if result["test_terminated"]:
                print("[MobileProctor] Test terminated due to critical violation.")
                break

            time.sleep(0.01)   # ~30 fps cap

    finally:
        cap.release()
        if show_preview:
            cv2.destroyAllWindows()

    # ── Generate report ───────────────────────────────────────────
    duration = time.time() - session.session_start
    print(f"[MobileProctor] Session ended — {duration:.1f}s — {session.frame_count} frames processed")

    analytics = session.report_agent.generate_reports(duration)
    print("[MobileProctor] Reports saved to outputs/")

    analytics["report_path"]    = "outputs/report.pdf"
    analytics["analytics_path"] = "outputs/analytics.json"
    return analytics


