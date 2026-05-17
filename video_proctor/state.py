"""
state.py
Session-isolated proctoring state. Each candidate gets a ProctoringSession instance.
Module-level globals are kept only for backward compatibility with /analytics fallback.
"""
import os
import json

class ProctoringSession:
    def __init__(self, assessment_id: str, email_id: str):
        self.assessment_id = assessment_id
        self.email_id      = email_id

        # Frame state
        self.latest_frame      = None
        self.latest_frame_time = 0.0
        self.proctoring_active = False
        self.frame_count       = 0

        # Agent references (set by main.py)
        self.risk_agent      = None
        self.violation_agent = None

        # Video scores (capped at 50)
        self.risk_score      = 25
        self.trust_score     = 25
        self.violation_score = 6

        # Code scores (capped at 20)
        self.code_risk_score      = 0
        self.code_trust_score     = 20
        self.code_violation_score = 0

    def save_state(self):
        data = {
            "video": {
                "risk_score":      self.risk_score,
                "trust_score":     self.trust_score,
                "violation_score": self.violation_score,
            },
            "code": {
                "risk_score":      self.code_risk_score,
                "trust_score":     self.code_trust_score,
                "violation_score": self.code_violation_score,
            },
            "assessment_id": self.assessment_id,
            "email_id":      self.email_id,
        }
        os.makedirs("outputs/states", exist_ok=True)
        path = f"outputs/states/state_{self.assessment_id}_{self.email_id}.json"
        try:
            with open(path, "w") as f:
                json.dump(data, f, indent=4)
        except Exception as e:
            print(f"[State] Error saving state for {self.email_id}: {e}")


# ---------------------------------------------------------------------------
# Session registry — keyed by f"{assessment_id}_{email_id}"
# ---------------------------------------------------------------------------
sessions: dict[str, ProctoringSession] = {}


def get_or_create_session(assessment_id: str, email_id: str) -> ProctoringSession:
    key = f"{assessment_id}_{email_id}"
    if key not in sessions:
        sessions[key] = ProctoringSession(assessment_id, email_id)
        print(f"[State] New session created: {key}")
    return sessions[key]


def get_latest_session() -> ProctoringSession | None:
    """Fallback: return the most recently active session, for debug endpoints."""
    if not sessions:
        return None
    return list(sessions.values())[-1]


# ---------------------------------------------------------------------------
# Backward-compat shims — so any old code that does `import state; state.X`
# still works by proxying to the latest session. These are NOT used in the
# refactored hot paths.
# ---------------------------------------------------------------------------
def __getattr__(name):
    session = get_latest_session()
    if session and hasattr(session, name):
        return getattr(session, name)
    raise AttributeError(f"module 'state' has no attribute '{name}'")