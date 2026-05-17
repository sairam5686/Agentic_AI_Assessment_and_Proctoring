import time
import cv2
import state
from Connections.EvidanceImage import cloudinary
from Connections.ViolationLogsDB import violation_logs_collection


class ViolationAgent:

    def __init__(self, cooldown: int = 5, session=None):
        self.violations:      list[dict] = []
        self.last_violation:  dict[str, float] = {}
        self.cooldown = cooldown
        self.session  = session

    # ─────────────────────────────────────────────────────────────
    # Public API
    # ─────────────────────────────────────────────────────────────

    def log_violation(self, vtype: str, frame, extra: str = None) -> None:
        """
        Record a violation event with an evidence screenshot.

        Args:
            vtype:  violation type key  e.g. "talking", "illegal_object"
            frame:  current BGR OpenCV frame
            extra:  optional detail string (e.g. detected object name)
        """
        now = time.time()

        # ── Cooldown check ────────────────────────────────────────
        if vtype in self.last_violation:
            if now - self.last_violation[vtype] < self.cooldown:
                return

        if frame is None:
            print(f"[Violation] Skipping {vtype} — frame is None")
            return

        self.last_violation[vtype] = now

        # ── Timestamp ─────────────────────────────────────────────
        ts = time.strftime("%H_%M_%S") + f"_{int(time.time() * 1000) % 1000:03d}"

        # ── Cloudinary upload ─────────────────────────────────────
        email_id      = self.session.email_id      if self.session else state.Email_id
        assessment_id = self.session.assessment_id if self.session else state.Assessment_id
        safe_email    = email_id.replace("@", "%40")
        cloud_path    = f"{assessment_id}/{safe_email}/{vtype}_{ts}"
        cloud_url  = None

        try:
            _, buffer = cv2.imencode(".jpg", frame)
            upload    = cloudinary.uploader.upload(
                buffer.tobytes(),
                public_id=cloud_path,
                resource_type="image",
            )
            cloud_url = upload.get("secure_url")
            print(f"[Violation] Uploaded: {cloud_url}")
        except Exception as e:
            print(f"[Violation] Cloudinary error: {e}")

        # ── Build record ──────────────────────────────────────────
        record = {
            "assessment_id": assessment_id,
            "email":         email_id,
            "time":          ts,
            "type":          vtype,
            "detail":        extra or "",
            "cloud_url":     cloud_url,
            "timestamp":     now,
        }

        # ── In-memory store ───────────────────────────────────────
        self.violations.append(record)

        # ── MongoDB persist ───────────────────────────────────────
        try:
            print(f"[Violation] Logging to MongoDB: {record}")
            violation_logs_collection.insert_one(record)
        except Exception as e:
            print(f"[Violation] MongoDB error: {e}")