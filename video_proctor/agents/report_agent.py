import json
import os
import time

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas
import state
from Connections.ViolationLogsDB import Risk_Score_DB


class ReportAgent:

    def __init__(self, risk_agent, violation_agent, session=None):
        """
        Args:
            risk_agent:       RiskAgent instance — provides scores and timeline.
            violation_agent:  ViolationAgent instance — provides violation list.
            session:          ProctoringSession instance.
        """
        self.risk_agent       = risk_agent
        self.violation_agent  = violation_agent
        self.session          = session

    # ─────────────────────────────────────────────────────────────
    # Public API
    # ─────────────────────────────────────────────────────────────

    def generate_reports(self, duration: float, avg_attention: float) -> None:
        """
        Write analytics.json and report.pdf to the outputs/ directory.

        Args:
            duration:      exam duration in seconds
            avg_attention: mean attention score (0–100) across the session
        """
        os.makedirs("outputs", exist_ok=True)

        risk_level      = self.risk_agent.get_risk_level()
        suspicion_score = self.risk_agent.suspicion_score
        trust_score     = self.risk_agent.get_trust_score()
        violations      = self.violation_agent.violations

        assessment_id = self.session.assessment_id if self.session else state.Assessment_id
        email_id      = self.session.email_id      if self.session else state.Email_id

        # ── JSON ──────────────────────────────────────────────────
        def json_serial(obj):
            """JSON serializer for objects not serializable by default json code"""
            try:
                from bson import ObjectId
                if isinstance(obj, ObjectId):
                    return str(obj)
            except ImportError:
                pass
            raise TypeError(f"Type {type(obj)} not serializable")

        analytics = {
            "assessment_id": assessment_id,
            "email":         email_id,
            "duration":        round(duration, 2),
            "avg_attention":   round(avg_attention, 2),
            "violations":      violations,
            "violation_count": len(violations),
            "suspicion_score":        suspicion_score,
            "desktop_cam_risk_score": suspicion_score,
            "max_score":       self.risk_agent.MAX_SCORE,
            "trust_score":     trust_score,
            "risk":            risk_level,
            "flagged":         self.risk_agent.is_flagged(),
            "timeline":        self.risk_agent.timeline,
            "warning_history": self.risk_agent.warning_history,
            "pattern_summary": self.risk_agent.get_pattern_summary(),
        }

        # Isolated paths to prevent multi-candidate file overrides
        if assessment_id and email_id:
            safe_email = email_id.replace("@", "_").replace(".", "_")
            json_path = f"outputs/analytics_{assessment_id}_{safe_email}.json"
            pdf_path  = f"outputs/report_{assessment_id}_{safe_email}.pdf"
        else:
            json_path = "outputs/analytics.json"
            pdf_path  = "outputs/report.pdf"

        # Also write to global outputs/analytics.json for backward compatibility
        try:
            with open("outputs/analytics.json", "w") as f:
                json.dump(analytics, f, indent=2, default=json_serial)
        except Exception:
            pass

        with open(json_path, "w") as f:
            json.dump(analytics, f, indent=2, default=json_serial)

        print(f"[Report] analytics saved to {json_path}")

        # ── PDF ───────────────────────────────────────────────────
        self._write_pdf(analytics, pdf_path)
        print(f"[Report] report PDF saved to {pdf_path}")

    # ─────────────────────────────────────────────────────────────
    # PDF builder
    # ─────────────────────────────────────────────────────────────

    def _write_pdf(self, data: dict, path: str) -> None:
        pdf  = canvas.Canvas(path, pagesize=A4)
        w, h = A4

        # ── Header ────────────────────────────────────────────────
        pdf.setFont("Helvetica-Bold", 18)
        pdf.drawString(2 * cm, h - 2 * cm, "AI Proctor — Exam Session Report")

        pdf.setFont("Helvetica", 10)
        pdf.setFillColorRGB(0.4, 0.4, 0.4)
        pdf.drawString(2 * cm, h - 2.6 * cm, "Generated automatically by Video Proctor")

        # ── Divider ───────────────────────────────────────────────
        pdf.setStrokeColorRGB(0.8, 0.8, 0.8)
        pdf.line(2 * cm, h - 3 * cm, w - 2 * cm, h - 3 * cm)

        # ── Summary block ─────────────────────────────────────────
        pdf.setFillColorRGB(0, 0, 0)
        pdf.setFont("Helvetica-Bold", 12)
        pdf.drawString(2 * cm, h - 3.8 * cm, "Session Summary")

        max_score = data.get("max_score", 30)
        flagged   = data.get("flagged", False)
        rows = [
            ("Exam Duration",    f"{data['duration']:.0f} seconds"),
            ("Average Attention",f"{data['avg_attention']:.1f} / 100"),
            ("Suspicion Score", f"{data['suspicion_score']} / {max_score}"),
            ("Trust Score",     f"{data['trust_score']} / {max_score}"),
            ("Risk Level",      data["risk"]),
            ("Flagged",         "YES ⚠️" if flagged else "No"),
            ("Total Violations", str(data["violation_count"])),
        ]

        pdf.setFont("Helvetica", 11)
        y = h - 4.5 * cm
        for label, value in rows:
            pdf.setFont("Helvetica-Bold", 11)
            pdf.drawString(2 * cm, y, f"{label}:")
            pdf.setFont("Helvetica", 11)
            pdf.drawString(7 * cm, y, value)
            y -= 0.7 * cm

        # ── Violations table ──────────────────────────────────────
        y -= 0.5 * cm
        pdf.setFont("Helvetica-Bold", 12)
        pdf.drawString(2 * cm, y, "Violation Log")
        y -= 0.6 * cm

        if not data["violations"]:
            pdf.setFont("Helvetica", 11)
            pdf.drawString(2 * cm, y, "No violations recorded.")
        else:
            pdf.setFont("Helvetica-Bold", 10)
            pdf.drawString(2 * cm,  y, "Time")
            pdf.drawString(5 * cm,  y, "Type")
            pdf.drawString(10 * cm, y, "Detail")
            y -= 0.5 * cm

            pdf.setFont("Helvetica", 10)
            for v in data["violations"]:
                if y < 2 * cm:          # new page if needed
                    pdf.showPage()
                    y = h - 2 * cm
                    pdf.setFont("Helvetica", 10)

                time_str   = str(v.get("time",   "")).replace("_", ":")
                vtype_str  = str(v.get("type",   ""))
                detail_str = str(v.get("detail", ""))[:40]

                pdf.drawString(2 * cm,  y, time_str)
                pdf.drawString(5 * cm,  y, vtype_str)
                pdf.drawString(10 * cm, y, detail_str)
                y -= 0.5 * cm

        pdf.save()