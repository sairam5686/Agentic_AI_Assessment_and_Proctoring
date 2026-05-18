import time
from collections import defaultdict

TRUST_CUTOFF = 15

WARNING_MESSAGES = {
    "illegal_object":   ("Illegal Object Detected",   "Please remove all prohibited items from view."),
    "multiple_people":  ("Multiple People Detected",  "Only the candidate should be visible."),
    "face_not_visible": ("Face Not Visible",          "Please ensure your face is clearly visible."),
    "head_turned":      ("Head Turn Detected",        "Please keep your eyes on the screen."),
    "looking_down":     ("Looking Down Detected",     "Please keep your eyes on the screen."),
    "drowsy":           ("Drowsiness Detected",       "Please stay alert and focused."),
    "mouth_open":       ("Mouth Movement Detected",   "Please maintain silence during the exam."),
    "low_attention":    ("Low Attention",             "Please focus on the exam."),
    "spoofing_attempt": ("Spoofing Attempt Detected", "Identity verification failed."),
    "phone_in_hand":    ("Phone in Hand Detected",    "Please put away your phone immediately."),
    "reaching_down":    ("Reaching Down Detected",    "Please keep your hands on the desk."),
    "earbud_on_ear":    ("Earpiece Detected",         "Using audio devices during exam is not allowed."),
    "hand_to_face":     ("Hand to Face Detected",     "Covering mouth or ear is not permitted."),
    "person_not_found": ("Person Not Found",          "Please ensure the candidate is in front of the camera."),
}


class RiskAgent:

    def __init__(self):
        self.suspicion_score = 0
        self.timeline        = []

        # ── All weights standardized to a flat 2 ─────────
        self.weights = {
            # ── Vision ───────────────────────────────────────────
            "illegal_object":    2,
            "multiple_people":   2,
            "face_not_visible":  2,
            "person_not_found":  2,
            "low_attention":     2,
            "drowsy":            2,
            "head_turned":       2,
            "looking_down":      2,
            "mouth_open":        2,
            "spoofing_attempt":  2,
            # ── Gestures ─────────────────────────────────────────
            "phone_in_hand":     2,
            "reaching_down":     2,
            "earbud_on_ear":     2,
            "hand_to_face":      2,
        }

        self.escalation_multipliers = [1.0, 1.0, 1.0, 1.0]
        self.violation_counts       = defaultdict(int)
        self.last_risk_time         = {}
        self.risk_cooldown          = 5

        self.active_warning  = None
        self.warning_history = []

        self.burst_window        = 60
        self.burst_threshold     = 4
        self.recent_events       = []
        self.burst_bonus_applied = False

        self.alert_active        = False
        self.alert_triggered_at  = None
        self.alert_messages      = []
        self.cutoff_breach_count = 0
        self.test_terminated     = False

    def update_risk(self, event: str) -> None:
        now = time.time()

        if event in self.last_risk_time:
            if now - self.last_risk_time[event] < self.risk_cooldown:
                return
        self.last_risk_time[event] = now

        if event not in self.weights:
            return

        self.violation_counts[event] += 1
        repeat     = self.violation_counts[event]
        penalty    = 2

        old = self.suspicion_score
        self.suspicion_score = min(30, self.suspicion_score + penalty)

        self.timeline.append({
            "event":      event,
            "score":      self.suspicion_score,
            "time":       time.strftime("%H:%M:%S"),
            "repeat":     repeat,
            "penalty":    penalty,
            "multiplier": 1.0,
        })
        # print(f"[RISK] {event} ×{repeat} → +{penalty} → suspicion: {old} → {self.suspicion_score}")

        self._set_warning(event, repeat, penalty)
        self._check_burst(now, event)
        self._check_trust_cutoff()

    def _set_warning(self, event, repeat, penalty):
        if event not in WARNING_MESSAGES:
            return
        title, base_msg = WARNING_MESSAGES[event]
        if repeat == 1:
            msg = base_msg
        elif repeat == 2:
            msg = f"{base_msg} (2nd occurrence)"
        elif repeat == 3:
            msg = f"{base_msg} (3rd occurrence — HIGH suspicion)"
        else:
            msg = f"{base_msg} (×{repeat} — CRITICAL)"
        warning = {"title": title, "message": msg, "event": event,
                   "repeat": repeat, "penalty": penalty, "time": time.strftime("%H:%M:%S")}
        self.active_warning = warning
        self.warning_history.append(warning)

    def _check_burst(self, now, event):
        pass

    def _check_trust_cutoff(self):
        trust = self.get_trust_score()
        if trust < TRUST_CUTOFF and not self.alert_active:
            self.alert_active        = True
            self.alert_triggered_at  = time.strftime("%H:%M:%S")
            self.cutoff_breach_count += 1
            self.alert_messages.append({
                "time": self.alert_triggered_at, "trust": trust,
                "suspicion": self.suspicion_score,
                "message": f"TRUST CRITICAL: {trust}%",
            })
        elif trust >= TRUST_CUTOFF:
            self.alert_active = False

    def get_trust_score(self) -> int:
        return max(0, 30 - self.suspicion_score)

    def get_risk_level(self) -> str:
        if self.suspicion_score > 24: return "HIGH RISK"
        if self.suspicion_score > 15: return "MEDIUM RISK"
        if self.suspicion_score > 7:  return "LOW RISK"
        return "NO RISK"

    def get_pattern_summary(self) -> dict:
        return {
            e: {"count": c, "multiplier": 1.0}
            for e, c in self.violation_counts.items()
        }

    def get_full_scorecard(self) -> dict:
        """Return the current risk scorecard — suspicion and trust on 0–30 scale."""
        return {
            "suspicion_score": self.suspicion_score,
            "trust_score":     self.get_trust_score(),
        }