import time
import cv2
import cloudinary.uploader
import state
from Connection.ViolationLogs import violation_logs_Mobile_collection
from Connection.EvidenceImgLogs import cloudinary


from typing import Optional


class ViolationAgent:

    def __init__(self, cooldown: int = 5):
        self.violations: list[dict] = []
        self.last_violation: dict[str, float] = {}
        self.cooldown = cooldown

    def log_violation(
        self,
        vtype: str,
        frame,
        assessment_id: str = "",
        email_id: str = "",
        extra: str = None,
    ) -> Optional[dict]:

        now = time.time()

        # Cooldown check
        if vtype in self.last_violation:
            if now - self.last_violation[vtype] < self.cooldown:
                return None

        if frame is None:
            print(f"[Violation] Skipping {vtype} — frame is None")
            return None

        self.last_violation[vtype] = now
        ts = time.strftime("%H_%M_%S") + f"_{int(now * 1000) % 1000:03d}"

        cloudinary_url = None

        try:
            # Convert OpenCV frame → JPEG bytes
            success, buffer = cv2.imencode(".jpg", frame)

            if not success:
                raise Exception("Frame encoding failed")

            # Upload directly to Cloudinary
            upload_result = cloudinary.uploader.upload(
                buffer.tobytes(),
                folder="proctoring_evidences",
                public_id=f"{vtype}_{ts}"
            )

            cloudinary_url = upload_result.get("secure_url")

            print(f"[Violation] Uploaded to Cloudinary: {cloudinary_url}")

        except Exception as e:
            print(f"[Violation] Cloudinary upload error: {e}")

        record = {
            "assessment_id": assessment_id,
            "email": email_id,
            "camera": "mobile",
            "time": ts,
            "type": vtype,
            "detail": extra or "",
            "link_path": cloudinary_url,
            "timestamp": now,
        }
        self.violations.append(record)

        if violation_logs_Mobile_collection is not None:
            violation_logs_Mobile_collection.insert_one(record)
            print(f"[Violation] Logged to DB: {vtype} at {ts}")
        else:
            print(f"[Violation] MongoDB unavailable — skipping DB log for {vtype} at {ts}")

        return record