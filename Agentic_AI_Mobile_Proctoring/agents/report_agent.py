import json
import os
import time
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas


class ReportAgent:

    def __init__(self, risk_agent, violation_agent):
        self.risk_agent      = risk_agent
        self.violation_agent = violation_agent

    def generate_reports(self, duration: float, include_pdf: bool = True, label: str = "") -> dict:
        """
        Write analytics.json (and optional report.pdf) to outputs/.
        Also archives a per-session copy to outputs/sessions/.

        Args:
            duration    : exam session duration in seconds
            include_pdf : if True, also generate report.pdf
            label       : optional session identifier (e.g. assessment_id_email)
                          used to name the per-session archive file.

        Returns:
            The analytics dict that was written to disk.
        """
        os.makedirs("outputs", exist_ok=True)
        os.makedirs("outputs/sessions", exist_ok=True)

        # Build a unique tag for this session's archive files
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        tag = f"{label}_{timestamp}" if label else timestamp

        suspicion_score = self.risk_agent.suspicion_score
        trust_score     = self.risk_agent.get_trust_score()
        risk_level      = self.risk_agent.get_risk_level()
        violations      = self.violation_agent.violations

        analytics = {
            "camera":           "mobile",
            "duration_seconds": round(duration, 2),
            "suspicion_score":  suspicion_score,
            "mobile_cam_risk_score": suspicion_score,
            "trust_score":      trust_score,
            "risk_level":       risk_level,
            "violation_count":  len(violations),
            "violations":       violations,
            "timeline":         self.risk_agent.timeline,
            "warning_history":  self.risk_agent.warning_history,
            "pattern_summary":  self.risk_agent.get_pattern_summary(),
        }

        # Always overwrite the "latest" copy
        with open("outputs/analytics.json", "w") as f:
            json.dump(analytics, f, indent=2, default=str)
        print("[Report] analytics.json saved → outputs/analytics.json")

        # Per-session archive (only for final reports - when include_pdf is True)
        if include_pdf:
            session_json = f"outputs/sessions/analytics_{tag}.json"
            with open(session_json, "w") as f:
                json.dump(analytics, f, indent=2, default=str)
            print(f"[Report] Session archive saved → {session_json}")

            self._write_pdf(analytics)
            print("[Report] report.pdf saved → outputs/report.pdf")

            session_pdf = f"outputs/sessions/report_{tag}.pdf"
            self._write_pdf(analytics, path=session_pdf)
            print(f"[Report] Session PDF saved → {session_pdf}")

        return analytics

    def _write_pdf(self, data: dict, path: str = "outputs/report.pdf") -> None:
        pdf  = canvas.Canvas(path, pagesize=A4)
        w, h = A4

        # Header
        pdf.setFont("Helvetica-Bold", 18)
        pdf.drawString(2 * cm, h - 2 * cm, "AI Proctor — Mobile Camera Report")

        pdf.setFont("Helvetica", 10)
        pdf.setFillColorRGB(0.4, 0.4, 0.4)
        pdf.drawString(2 * cm, h - 2.6 * cm, "Side-camera session — Video Proctor")

        pdf.setStrokeColorRGB(0.8, 0.8, 0.8)
        pdf.line(2 * cm, h - 3 * cm, w - 2 * cm, h - 3 * cm)

        # Summary block
        pdf.setFillColorRGB(0, 0, 0)
        pdf.setFont("Helvetica-Bold", 12)
        pdf.drawString(2 * cm, h - 3.8 * cm, "Session Summary")

        rows = [
            ("Duration",         f"{data['duration_seconds']:.0f} seconds"),
            ("Suspicion score",  f"{data['suspicion_score']} / 30"),
            ("Trust score",      f"{data['trust_score']} / 30"),
            ("Risk level",       data["risk_level"]),
            ("Total violations", str(data["violation_count"])),
        ]

        y = h - 4.5 * cm
        for label, value in rows:
            pdf.setFont("Helvetica-Bold", 11)
            pdf.drawString(2 * cm, y, f"{label}:")
            pdf.setFont("Helvetica", 11)
            pdf.drawString(7 * cm, y, value)
            y -= 0.7 * cm

        # Violation log table
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
                if y < 2 * cm:
                    pdf.showPage()
                    y = h - 2 * cm
                    pdf.setFont("Helvetica", 10)

                time_str   = str(v.get("time",   "")).replace("_", ":")
                type_str   = str(v.get("type",   ""))
                detail_str = str(v.get("detail", ""))[:40]

                pdf.drawString(2 * cm,  y, time_str)
                pdf.drawString(5 * cm,  y, type_str)
                pdf.drawString(10 * cm, y, detail_str)
                y -= 0.5 * cm

        pdf.save()