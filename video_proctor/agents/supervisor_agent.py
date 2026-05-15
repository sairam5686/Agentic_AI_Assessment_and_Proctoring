from collections import defaultdict


# ── Safe fallbacks (used when an agent has never returned a valid result) ──
_DEFAULT_VISION = {
    "face_visible":    False,
    "multiple_people": False,
    "illegal_objects": [],
}

_DEFAULT_ATTENTION = {
    "attention":  100,
    "drowsy":     False,
    "head_turn":  False,
    "mouth_open": False,
}

_DEFAULT_AUDIO = {
    "talking":    False,
    "loud_noise": False,
}

_DEFAULT_SPOOF = {
    "is_spoof": False,
}


class SupervisorAgent:

    def __init__(self, risk_agent, violation_agent):
        self.risk_agent      = risk_agent
        self.violation_agent = violation_agent

        # ── Frame-consolidation buffers ────────────────────────────
        # Each buffer stores the last N boolean detections for a
        # violation.  A violation is only fired when every one of
        # the last N frames was True (all-true consensus).
        self._buffers = defaultdict(list)

        self._thresholds = {
            "face_not_visible":  5,
            "multiple_people":   3,
            "illegal_objects":   3,
            "head_turned":       5,
            "mouth_open":        8,
            "drowsy":           10,
            "low_attention":    10,
            "talking":           5,
            "loud_noise":        3,
            "spoofing_attempt":  2,
        }

        # ── Last-valid-result cache ────────────────────────────────
        # Stores the most recent non-None, non-empty dict from each
        # agent.  Used as a fallback when an agent call fails.
        self._last_valid = {
            "vision":   None,
            "attention": None,
            "audio":    None,
            "spoofing": None,
        }


    # ─────────────────────────────────────────────────────────────
    # Frame-consolidation helper
    # ─────────────────────────────────────────────────────────────

    def _should_fire(self, violation: str, detected: bool) -> bool:
        """
        Append `detected` to the rolling buffer for `violation`,
        trim it to the last N frames (N = threshold for that
        violation), and return True only when every buffered frame
        was True.
        """
        n = self._thresholds.get(violation, 1)
        buf = self._buffers[violation]
        buf.append(detected)
        # Keep only the last N observations
        if len(buf) > n:
            del buf[:-n]
        return len(buf) == n and all(buf)


    # ─────────────────────────────────────────────────────────────
    # Mini-method: Vision checks
    # ─────────────────────────────────────────────────────────────

    def supervise_vision(self, vision_data: dict, frame) -> None:
        """Evaluate vision-agent output and fire any triggered violations."""
        # ── Cache: update on valid data, fall back to last-valid or default ──
        if vision_data:
            self._last_valid["vision"] = vision_data
        else:
            vision_data = self._last_valid["vision"] or _DEFAULT_VISION


        if self._should_fire("face_not_visible", not vision_data["face_visible"]):
            self.violation_agent.log_violation("face_not_visible", frame)
            self.risk_agent.update_risk("face_not_visible")

        if self._should_fire("multiple_people", bool(vision_data["multiple_people"])):
            self.violation_agent.log_violation("multiple_people", frame)
            self.risk_agent.update_risk("multiple_people")

        illegal = vision_data.get("illegal_objects", [])
        if isinstance(illegal, list):
            detected_illegal = len(illegal) > 0
            if self._should_fire("illegal_objects", detected_illegal):
                for obj in illegal:
                    self.violation_agent.log_violation("illegal_object", frame, obj)
                    self.risk_agent.update_risk("illegal_object")
        else:
            # Advance the buffer with False so it doesn't stall
            self._should_fire("illegal_objects", False)

    # ─────────────────────────────────────────────────────────────
    # Mini-method: Attention checks
    # ─────────────────────────────────────────────────────────────

    def supervise_attention(self, attention_data: dict, frame) -> None:
        """Evaluate attention-agent output and fire any triggered violations."""
        # ── Cache: update on valid data, fall back to last-valid or default ──
        if attention_data:
            self._last_valid["attention"] = attention_data
        else:
            attention_data = self._last_valid["attention"] or _DEFAULT_ATTENTION


        if self._should_fire("low_attention", attention_data["attention"] < 15):
            self.violation_agent.log_violation("low_attention", frame)
            self.risk_agent.update_risk("low_attention")

        drowsy_condition = (
            attention_data["drowsy"] and attention_data["attention"] < 35
        )
        if self._should_fire("drowsy", drowsy_condition):
            self.violation_agent.log_violation("drowsy", frame)
            self.risk_agent.update_risk("drowsy")

        if self._should_fire("head_turned", attention_data.get("head_turn", False)):
            self.violation_agent.log_violation("head_turned", frame)
            self.risk_agent.update_risk("head_turned")

        if self._should_fire("mouth_open", attention_data.get("mouth_open", False)):
            self.violation_agent.log_violation("mouth_open", frame)
            self.risk_agent.update_risk("mouth_open")

    # ─────────────────────────────────────────────────────────────
    # Mini-method: Audio checks
    # ─────────────────────────────────────────────────────────────

    def supervise_audio(self, audio_data: dict, frame) -> None:
        """Evaluate audio-agent output and fire any triggered violations."""
        # ── Cache: update on valid data, fall back to last-valid or default ──
        if audio_data:
            self._last_valid["audio"] = audio_data
        else:
            audio_data = self._last_valid["audio"] or _DEFAULT_AUDIO


        if self._should_fire("talking", audio_data.get("talking", False)):
            self.violation_agent.log_violation("talking", frame)
            self.risk_agent.update_risk("talking")

        if self._should_fire("loud_noise", audio_data.get("loud_noise", False)):
            self.violation_agent.log_violation("loud_noise", frame)
            self.risk_agent.update_risk("loud_noise")

    # ─────────────────────────────────────────────────────────────
    # Mini-method: Spoofing check
    # ─────────────────────────────────────────────────────────────

    def supervise_spoofing(self, spoof_data: dict, frame) -> None:
        """Evaluate spoofing-agent output and fire any triggered violations."""
        # ── Cache: update on valid data, fall back to last-valid or default ──
        if spoof_data:
            self._last_valid["spoofing"] = spoof_data
        else:
            spoof_data = self._last_valid["spoofing"] or _DEFAULT_SPOOF


        spoof_detected = bool(spoof_data and spoof_data.get("is_spoof", False))
        if self._should_fire("spoofing_attempt", spoof_detected):
            self.violation_agent.log_violation("spoofing_attempt", frame)
            self.risk_agent.update_risk("spoofing_attempt")

    # ─────────────────────────────────────────────────────────────
    # Main entry — calls all 4 mini-methods in order.
    # Kept for backward compatibility.
    # ─────────────────────────────────────────────────────────────

    def supervise(
        self,
        vision_data:    dict,
        attention_data: dict,
        audio_data:     dict,
        spoof_data:     dict,
        frame,
    ) -> None:
        """
        Evaluate all agent outputs and route violations to
        RiskAgent (score) and ViolationAgent (evidence screenshot).

        Args:
            vision_data:    output of VisionAgent.analyze_vision()
            attention_data: output of AttentionAgent.analyze_attention()
            audio_data:     output of AudioAgent.analyze_audio()
            spoof_data:     output of SpoofingAgent.analyze_spoofing()
            frame:          current BGR frame (for evidence screenshots)
        """
        self.supervise_vision(vision_data, frame)
        self.supervise_attention(attention_data, frame)
        self.supervise_audio(audio_data, frame)
        self.supervise_spoofing(spoof_data, frame)
