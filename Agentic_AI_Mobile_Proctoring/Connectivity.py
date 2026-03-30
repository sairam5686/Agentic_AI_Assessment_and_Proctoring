"""
main.py — Pure function-call proctoring entry point.

Public API
──────────
  analyze_frame(frame, assessment_id, email_id, agents) → dict
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
        print("[MobileProctor] All agents initialised.")

    def close(self):
        """
        Explicitly close all resource-heavy agents.
        """
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
    session: ProctoringSession | None = None,
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

    vision_data  = session.vision_agent.analyze_vision(frame)
    gesture_data = session.gesture_agent.analyze_gestures(frame)

    violations_this_frame = session.supervisor.supervise(
        vision_data   = vision_data,
        gesture_data  = gesture_data,
        frame         = frame,
        assessment_id = assessment_id,
        email_id      = email_id,
    )

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


