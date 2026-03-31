from fpdf import FPDF
import os
import re


class PDFReport(FPDF):
    def header(self):
        self.set_font('Arial', 'B', 14)
        self.cell(0, 10, 'Assessment Support Report', 0, 1, 'C')
        self.set_font('Arial', 'I', 9)
        self.set_text_color(100, 100, 100)
        self.cell(0, 6, 'From: Virtusa Team Titans', 0, 1, 'C')
        self.set_text_color(0, 0, 0)
        self.line(10, self.get_y() + 2, 200, self.get_y() + 2)
        self.ln(6)

    def footer(self):
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 10, f'Page {self.page_no()} | Virtusa Team Titans', 0, 0, 'C')
        self.set_text_color(0, 0, 0)


def _write_rich_text(pdf, text, font_size=10):
    """
    Renders text with proper bold formatting by parsing **bold** markdown markers.
    Strips the ** stars and toggles bold font for those segments.
    """
    parts = re.split(r'(\*\*.*?\*\*)', text)
    for part in parts:
        if part.startswith('**') and part.endswith('**'):
            bold_text = part[2:-2]
            pdf.set_font("Arial", 'B', font_size)
            pdf.write(5, bold_text)
            pdf.set_font("Arial", '', font_size)
        else:
            pdf.set_font("Arial", '', font_size)
            pdf.write(5, part)


def _draw_violation_table(pdf, logs, violation_type):
    """
    Draws a formatted table of violation logs with columns:
    S.No | Type of Violation | Timestamp | Proof Link
    """
    if not logs:
        return

    pdf.set_font("Arial", 'B', 10)
    pdf.cell(0, 8, f"Type: {violation_type.capitalize()}", ln=True)
    pdf.ln(2)

    # Table column config
    col_widths = [12, 55, 40, 83]
    headers = ["S.No", "Type of Violation", "Timestamp", "Proof Link"]

    # Draw table header
    pdf.set_font("Arial", 'B', 8)
    pdf.set_fill_color(41, 65, 122)
    pdf.set_text_color(255, 255, 255)
    for i, header in enumerate(headers):
        pdf.cell(col_widths[i], 7, header, 1, 0, 'C', fill=True)
    pdf.ln()

    # Table rows
    pdf.set_font("Arial", '', 7)
    pdf.set_text_color(0, 0, 0)

    for idx, log in enumerate(logs, 1):
        detail = log.get('detail') or log.get('violation') or log.get('type') or 'Proctoring violation'
        timestamp = log.get('time') or log.get('timestamp') or log.get('created_at', 'N/A')
        proof_url = log.get('cloud_url') or log.get('url') or log.get('proof_link', '')

        # New page check — re-draw header if needed
        if pdf.get_y() + 8 > pdf.h - 25:
            pdf.add_page()
            pdf.set_font("Arial", 'B', 8)
            pdf.set_fill_color(41, 65, 122)
            pdf.set_text_color(255, 255, 255)
            for i, header in enumerate(headers):
                pdf.cell(col_widths[i], 7, header, 1, 0, 'C', fill=True)
            pdf.ln()
            pdf.set_font("Arial", '', 7)
            pdf.set_text_color(0, 0, 0)

        # Alternate row colors
        if idx % 2 == 0:
            pdf.set_fill_color(240, 240, 250)
        else:
            pdf.set_fill_color(255, 255, 255)

        pdf.cell(col_widths[0], 7, str(idx), 1, 0, 'C', fill=True)
        pdf.cell(col_widths[1], 7, str(detail)[:40], 1, 0, 'L', fill=True)
        pdf.cell(col_widths[2], 7, str(timestamp), 1, 0, 'C', fill=True)

        # Proof link — clickable blue text
        if proof_url:
            pdf.set_text_color(0, 0, 200)
            pdf.cell(col_widths[3], 7, 'View Proof', 1, 0, 'C', fill=True, link=proof_url)
            pdf.set_text_color(0, 0, 0)
        else:
            pdf.cell(col_widths[3], 7, 'No proof available', 1, 0, 'C', fill=True)

        pdf.ln()

    pdf.ln(5)


def generate_pdf_report(candidate_name, email, assessment_name, assessment_id, analysis_text, violation_data):
    pdf = PDFReport()
    pdf.add_page()

    # Analysis & Response
    pdf.set_font("Arial", 'B', 12)
    pdf.cell(0, 10, "Analysis & Response:", ln=True)
    pdf.ln(2)

    # Render analysis text with proper bold handling (strip markdown **)
    for line in analysis_text.split('\n'):
        stripped = line.strip()
        if not stripped:
            pdf.ln(3)
            continue
        _write_rich_text(pdf, stripped, font_size=10)
        pdf.ln(5)

    pdf.ln(8)

    # Evidence / Violation Logs
    pdf.set_font("Arial", 'B', 12)
    pdf.cell(0, 10, "Evidence / Violation Logs:", ln=True)
    pdf.ln(3)

    # Explicitly iterate through all types to ensure transparency
    v_types = [("webcam", "Webcam Proctoring"), ("mobile", "Mobile Camera Proctoring"), ("plagiarism", "Plagiarism Detection")]
    
    found_any = False
    for v_key, v_label in v_types:
        logs = violation_data.get(v_key, [])
        if logs:
            found_any = True
            _draw_violation_table(pdf, logs, v_label)
        else:
            # Show a clear message for types with no violations
            pdf.set_font("Arial", 'B', 10)
            pdf.cell(0, 8, f"Type: {v_label}", ln=True)
            pdf.set_font("Arial", 'I', 9)
            pdf.set_text_color(100, 100, 100)
            pdf.cell(0, 6, "No violations recorded in this category.", ln=True)
            pdf.set_text_color(0, 0, 0)
            pdf.ln(4)

    if not found_any:
        pdf.set_font("Arial", 'I', 10)
        pdf.cell(0, 10, "No major integrity violations recorded for this assessment.", ln=True)

    # Sign-off
    pdf.ln(10)
    pdf.set_font("Arial", '', 10)
    pdf.cell(0, 6, "Sincerely,", ln=True)
    pdf.set_font("Arial", 'B', 10)
    pdf.cell(0, 6, "Team Titans", ln=True)
    pdf.set_font("Arial", 'I', 9)
    pdf.set_text_color(80, 80, 80)
    pdf.cell(0, 6, "Virtusa Team", ln=True)
    pdf.set_text_color(0, 0, 0)

    # Save to file
    filename = f"report_{assessment_id}_{email.replace('@', '_').replace('.', '_')}.pdf"
    output_path = os.path.join("temp_reports", filename)
    os.makedirs("temp_reports", exist_ok=True)
    pdf.output(output_path)
    return output_path

