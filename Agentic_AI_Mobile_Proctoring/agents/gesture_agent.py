import os
import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mp_tasks
from mediapipe.tasks.python import vision


# ── MediaPipe hand landmark indices ──────────────────────────────────────────
WRIST        = 0
THUMB_TIP    = 4
THUMB_MCP    = 2
INDEX_TIP    = 8
INDEX_MCP    = 5
MIDDLE_TIP   = 12
MIDDLE_MCP   = 9
RING_TIP     = 16
RING_MCP     = 13
PINKY_TIP    = 20
PINKY_MCP    = 17

# Landmark connections for manual drawing
HAND_CONNECTIONS = [
    (0, 1), (1, 2), (2, 3), (3, 4),
    (0, 5), (5, 6), (6, 7), (7, 8),
    (5, 9), (9, 10), (10, 11), (11, 12),
    (9, 13), (13, 14), (14, 15), (15, 16),
    (13, 17), (17, 18), (18, 19), (19, 20),
    (0, 17)
]


class GestureAgent:

    def __init__(self):
        # MediaPipe Tasks API — hand landmarker
        model_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "models", "hand_landmarker.task",
        )
        options = vision.HandLandmarkerOptions(
            base_options=mp_tasks.BaseOptions(model_asset_path=model_path),
            running_mode=vision.RunningMode.IMAGE,
            num_hands=2,
            min_hand_detection_confidence=0.60,
            min_hand_presence_confidence=0.60,
            min_tracking_confidence=0.60,
        )
        self.hands_detector = vision.HandLandmarker.create_from_options(options)

        # Each flag must hold for N frames before being reported
        self.persistence_required = 5   # more frames needed before raising a flag

        self._counters = {
            "phone_in_hand": 0,
            "reaching_down": 0,
            "earbud_on_ear": 0,
            "hand_to_face":  0,
        }
        self._active = {k: False for k in self._counters}

    # ─────────────────────────────────────────────────────────────
    # Geometry helpers
    # ─────────────────────────────────────────────────────────────

    @staticmethod
    def _dist(a, b) -> float:
        return float(np.linalg.norm(np.array([a.x - b.x, a.y - b.y])))

    @staticmethod
    def _hand_span(lm) -> float:
        return GestureAgent._dist(lm[WRIST], lm[MIDDLE_MCP])

    @staticmethod
    def _finger_extended(lm, tip_idx, mcp_idx) -> bool:
        return lm[tip_idx].y < lm[mcp_idx].y

    @staticmethod
    def _curl_ratio(lm) -> float:
        """0.0 = fully open  |  1.0 = tight fist"""
        span  = max(GestureAgent._hand_span(lm), 0.01)
        tips  = [INDEX_TIP, MIDDLE_TIP, RING_TIP, PINKY_TIP]
        avg_d = np.mean([GestureAgent._dist(lm[t], lm[WRIST]) for t in tips])
        return 1.0 - min(avg_d / (span * 2.8), 1.0)

    # ─────────────────────────────────────────────────────────────
    # Gesture detectors
    # ─────────────────────────────────────────────────────────────

    def _detect_phone_in_hand(self, lm) -> bool:
        # Hand must be raised (not resting on a desk) — wrist in upper 65% of frame
        if lm[WRIST].y > 0.65:
            return False
        curl            = self._curl_ratio(lm)
        thumb_index_gap = self._dist(lm[THUMB_TIP], lm[INDEX_TIP])
        span            = self._hand_span(lm)
        # Tighter curl range + larger pinch gap avoids resting/relaxed hand
        return (0.35 < curl < 0.62 and thumb_index_gap > 0.12 and span > 0.10)

    def _detect_reaching_down(self, lm) -> bool:
        # Only flag when wrist is near the very bottom of the frame (truly reaching down)
        if lm[WRIST].y < 0.92:
            return False
        tips_below = sum(
            1 for tip in [INDEX_TIP, MIDDLE_TIP, RING_TIP, PINKY_TIP]
            if lm[tip].y > lm[WRIST].y
        )
        # Require 3 of 4 fingertips to be below wrist (not just 2)
        return tips_below >= 3

    def _detect_earbud_on_ear(self, lm) -> bool:
        # Disabled — too many false positives with natural hand gestures near face
        return False

    def _detect_hand_to_face(self, lm) -> bool:
        if lm[WRIST].y > 0.55:
            return False
        curl = self._curl_ratio(lm)
        if curl > 0.65 or curl < 0.10:
            return False
        tip_ys  = [lm[t].y for t in [INDEX_TIP, MIDDLE_TIP, RING_TIP, PINKY_TIP]]
        y_range = max(tip_ys) - min(tip_ys)
        return y_range < 0.08

    # ─────────────────────────────────────────────────────────────
    # Book vs paper/answer-sheet classification
    # ─────────────────────────────────────────────────────────────

    @staticmethod
    def classify_rectangular_object(x1: int, y1: int, x2: int, y2: int, frame: np.ndarray) -> str:
        fh, fw  = frame.shape[:2]
        obj_w   = max(x2 - x1, 1)
        obj_h   = max(y2 - y1, 1)
        rel_area = (obj_w * obj_h) / (fw * fh)
        aspect   = obj_w / obj_h
        roi = frame[max(0, y1): min(fh, y2), max(0, x1): min(fw, x2)]
        if roi.size == 0: return "unknown"
        hsv      = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
        mean_sat = float(np.mean(hsv[:, :, 1]))
        mean_val = float(np.mean(hsv[:, :, 2]))
        if rel_area < 0.06 and (aspect > 1.6 or (mean_val > 170 and mean_sat < 40)): return "paper"
        if rel_area > 0.05 and (0.45 < aspect < 2.0) and (mean_sat > 35 or mean_val < 200): return "book"
        return "paper"

    def _update_flag(self, name: str, raw: bool) -> bool:
        if raw:
            self._counters[name] = min(self._counters[name] + 1, self.persistence_required)
        else:
            self._counters[name] = max(self._counters[name] - 1, 0)
        self._active[name] = self._counters[name] >= self.persistence_required
        return self._active[name]

    # ─────────────────────────────────────────────────────────────
    # Public API
    # ─────────────────────────────────────────────────────────────

    def analyze_gestures(self, frame) -> dict:
        h, w   = frame.shape[:2]
        rgb    = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        result = self.hands_detector.detect(mp_image)

        raw: dict[str, bool] = {k: False for k in self._counters}
        all_lm = []

        if result.hand_landmarks:
            for hl in result.hand_landmarks:
                lm = hl
                all_lm.append(lm)

                if self._detect_phone_in_hand(lm):    raw["phone_in_hand"] = True
                if self._detect_reaching_down(lm):    raw["reaching_down"] = True
                if self._detect_earbud_on_ear(lm):    raw["earbud_on_ear"] = True

                # Manual Drawing
                for connection in HAND_CONNECTIONS:
                    p1 = hl[connection[0]]
                    p2 = hl[connection[1]]
                    cv2.line(frame, (int(p1.x * w), int(p1.y * h)), (int(p2.x * w), int(p2.y * h)), (0, 200, 80), 1)
                for pt in hl:
                    cv2.circle(frame, (int(pt.x * w), int(pt.y * h)), 2, (0, 255, 120), -1)

        active = {name: self._update_flag(name, val) for name, val in raw.items()}
        flags  = [k for k, v in active.items() if v]

        y = 30
        for flag in flags:
            cv2.putText(frame, f"GESTURE: {flag.replace('_', ' ').upper()}",
                        (10, y), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
            y += 25

        return {
            "hands_detected":   len(all_lm),
            "phone_in_hand":    active["phone_in_hand"],
            "reaching_down":    active["reaching_down"],
            "earbud_on_ear":    active["earbud_on_ear"],
            "hand_to_face":     active["hand_to_face"],
            "any_violation":    bool(flags),
            "flags":            flags,
        }

    def close(self):
        """
        Explicitly close the MediaPipe hand landmarker to release resources.
        """
        if hasattr(self, "hands_detector"):
            self.hands_detector.close()
            print("[GestureAgent] Hand landmarker closed.")