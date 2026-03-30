import time
from collections import defaultdict

TRUST_CUTOFF = 25

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
}


class RiskAgent:

    def __init__(self):
        self.suspicion_score = 0
        self.timeline        = []

        # ── Rescaled weights (min-max linear, range 5–10) ────────
        self.weights = {
            # ── Vision ───────────────────────────────────────────
            "illegal_object":    7,
            "multiple_people":   8,
            "face_not_visible":  6,
            "low_attention":     6,
            "drowsy":            5,
            "head_turned":       6,
            "looking_down":      6,
            "mouth_open":        6,
            "spoofing_attempt": 10,
            # ── Gestures ─────────────────────────────────────────
            "phone_in_hand":     8,
            "reaching_down":     6,
            "earbud_on_ear":     8,
            "hand_to_face":      6,
        }

        self.escalation_multipliers = [1.0, 1.5, 2.0, 2.5]
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
        mult_idx   = min(repeat - 1, len(self.escalation_multipliers) - 1)
        multiplier = self.escalation_multipliers[mult_idx]
        penalty    = int(self.weights[event] * multiplier)

        old = self.suspicion_score
        self.suspicion_score = min(30, self.suspicion_score + penalty)

        self.timeline.append({
            "event":      event,
            "score":      self.suspicion_score,
            "time":       time.strftime("%H:%M:%S"),
            "repeat":     repeat,
            "penalty":    penalty,
            "multiplier": multiplier,
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
        self.recent_events.append((now, event))
        self.recent_events = [(t, e) for t, e in self.recent_events if now - t <= self.burst_window]
        distinct = len(set(e for _, e in self.recent_events))
        # Reset the flag when the burst window clears so future bursts can trigger
        if not self.recent_events:
            self.burst_bonus_applied = False
        if distinct >= self.burst_threshold and not self.burst_bonus_applied:
            self.burst_bonus_applied = True
            self.suspicion_score = min(50, self.suspicion_score + 10)
            print(f"[RISK] Burst bonus applied — {distinct} distinct violations in {self.burst_window}s window → +10")

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
            e: {"count": c, "multiplier": self.escalation_multipliers[min(c - 1, 3)]}
            for e, c in self.violation_counts.items()
        }

    def get_full_scorecard(self) -> dict:
        """Return the current risk scorecard — suspicion and trust on 0–30 scale."""
        return {
            "suspicion_score": self.suspicion_score,
            "trust_score":     self.get_trust_score(),
        }