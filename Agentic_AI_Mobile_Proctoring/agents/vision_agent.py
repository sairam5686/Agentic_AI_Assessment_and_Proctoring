import os
import time
import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_tasks
from mediapipe.tasks.python import vision
from ultralytics import YOLO
from agents.gesture_agent import GestureAgent


class VisionAgent:

    def __init__(self, model_path: str = "models/yolov8s.pt"):

        # YOLO labels that are always illegal
        self.always_illegal = ["cell phone"]

        # YOLO labels for small electronic devices (removed keyboard/mouse for side camera)
        self.electronic_labels = ["remote"]

        self.model = YOLO(model_path)

        # Profile-tolerant face detection (Tasks API)
        # blaze_face_short_range corresponds to model_selection=0
        face_model = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "models", "blaze_face_short_range.tflite",
        )
        options = vision.FaceDetectorOptions(
            base_options=mp_tasks.BaseOptions(model_asset_path=face_model),
            running_mode=vision.RunningMode.IMAGE,
            min_detection_confidence=0.30,
        )
        self.face_detector = vision.FaceDetector.create_from_options(options)

        # Multi-person sustained timer
        self.multi_person_start     = None
        self.multi_person_threshold = 1   # seconds (lowered from 2 for side camera)

    # ─────────────────────────────────────────────────────────────

    def analyze_vision(self, frame) -> dict:
        results = self.model(frame, verbose=False)

        people  = 0
        illegal = []
        allowed = []

        for r in results:
            for box in r.boxes:
                cls   = int(box.cls)
                label = self.model.names[cls]
                conf  = float(box.conf)

                x1, y1, x2, y2 = map(int, box.xyxy[0])
                area = (x2 - x1) * (y2 - y1)

                if area < 1000:
                    continue

                if label == "person" and conf > 0.35:
                    people += 1
                    continue

                if label in self.always_illegal and conf > 0.30:
                    illegal.append(label)
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
                    cv2.putText(frame, f"ILLEGAL: {label}",
                                (x1, y1 - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 0, 255), 2)
                    continue

                if label in self.electronic_labels and conf > 0.30:
                    illegal.append(f"electronic device ({label})")
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
                    continue

                if label == "book" and conf > 0.30:
                    classification = GestureAgent.classify_rectangular_object(
                        x1, y1, x2, y2, frame
                    )
                    allowed.append(f"{classification}")
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 200, 0), 1)
                    cv2.putText(frame, f"{classification} (ok)",
                                (x1, y1 - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 200, 0), 1)
                    continue

        # ── Multi-person sustained timer ──────────────────────────
        multi_flag = False
        if people > 1:
            if self.multi_person_start is None:
                self.multi_person_start = time.time()
            elif time.time() - self.multi_person_start > self.multi_person_threshold:
                multi_flag = True
                self.multi_person_start = None
        else:
            self.multi_person_start = None

        # ── Profile-tolerant face detection (Tasks API) ───────────
        rgb          = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image     = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        face_results = self.face_detector.detect(mp_image)
        face_visible = False

        if face_results.detections:
            # result.detections[i].categories[0].score gives confidence
            best = max(d.categories[0].score for d in face_results.detections)
            face_visible = best >= 0.30

        return {
            "illegal_objects": illegal,
            "allowed_objects": allowed,
            "multiple_people": multi_flag,
            "people_count":    people,
            "face_visible":    face_visible,
        }

    def close(self):
        if hasattr(self, "face_detector"):
            self.face_detector.close()
            print("[VisionAgent] Face detector closed.")