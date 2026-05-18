class SupervisorAgent:

    def __init__(self, risk_agent, violation_agent):
        self.risk_agent      = risk_agent
        self.violation_agent = violation_agent
        # face_not_visible must persist for this many consecutive frames
        # before a violation is logged (prevents single-frame false positives
        # and burning the risk cooldown on frame 1)
        self._face_absent_frames     = 0
        self._face_absent_threshold  = 10

    def supervise(
        self,
        vision_data:   dict,
        gesture_data:  dict,
        frame,
        assessment_id: str = "",
        email_id:      str = "",
    ) -> list[str]:
        """
        Called once per frame from main.py.

        Args:
            vision_data   : output of VisionAgent.analyze_vision()
            gesture_data  : output of GestureAgent.analyze_gestures()
            frame         : current BGR frame for evidence screenshots
            assessment_id : exam identifier (passed through to ViolationAgent)
            email_id      : candidate email (passed through to ViolationAgent)

        Returns:
            List of violation type strings that fired this frame.
        """
        fired: list[str] = []

        # ── Vision checks ─────────────────────────────────────────
        # Note: Face visibility check disabled for side-camera mobile proctoring
        """
        if not vision_data["face_visible"]:
            self._face_absent_frames += 1
            if self._face_absent_frames >= self._face_absent_threshold:
                self.violation_agent.log_violation(
                    "face_not_visible", frame, assessment_id, email_id
                )
                self.risk_agent.update_risk("face_not_visible")
                fired.append("face_not_visible")
                print(f"[SUPERVISOR] ⚠  VIOLATION FIRED: face_not_visible "
                      f"(absent for {self._face_absent_frames} frames)")
        else:
            self._face_absent_frames = 0
        """
        self._face_absent_frames = 0 # Reset frames to avoid accumulation


        if vision_data["multiple_people"]:
            self.violation_agent.log_violation(
                "multiple_people", frame, assessment_id, email_id
            )
            self.risk_agent.update_risk("multiple_people")
            fired.append("multiple_people")
            print(f"[SUPERVISOR] ⚠  VIOLATION FIRED: multiple_people")

        if vision_data.get("person_not_found", False):
            self.violation_agent.log_violation(
                "person_not_found", frame, assessment_id, email_id
            )
            self.risk_agent.update_risk("person_not_found")
            fired.append("person_not_found")
            print(f"[SUPERVISOR] ⚠  VIOLATION FIRED: person_not_found")

        for obj in vision_data["illegal_objects"]:
            self.violation_agent.log_violation(
                "illegal_object", frame, assessment_id, email_id, extra=obj
            )
            self.risk_agent.update_risk("illegal_object")
            fired.append(f"illegal_object:{obj}")
            print(f"[SUPERVISOR] ⚠  VIOLATION FIRED: illegal_object — {obj}")

        # ── Gesture checks ────────────────────────────────────────
        gesture_events = [
            "phone_in_hand",
            "reaching_down",
            "earbud_on_ear",
            "hand_to_face",
        ]
        for event in gesture_events:
            if gesture_data.get(event, False):
                self.violation_agent.log_violation(
                    event, frame, assessment_id, email_id
                )
                self.risk_agent.update_risk(event)
                fired.append(event)
                print(f"[SUPERVISOR] ⚠  VIOLATION FIRED: {event}")

        """
        if fired:
            print(f"[SUPERVISOR] Frame summary — violations this frame: {fired} "
                  f"| suspicion: {self.risk_agent.suspicion_score} "
                  f"| trust: {self.risk_agent.get_trust_score()} "
                  f"| risk: {self.risk_agent.get_risk_level()}")
        """

        return fired