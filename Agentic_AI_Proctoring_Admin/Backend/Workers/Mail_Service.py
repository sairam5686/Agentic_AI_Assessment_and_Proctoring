import os
from dotenv import load_dotenv
import httpx

load_dotenv()

# Configuration
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
SENDER_EMAIL = os.getenv("SENDER_EMAIL") # Your verified Sender address in SendGrid
FROM_NAME = os.getenv("FROM_NAME", "TEAM_TITANS")

# Support portal and Mobile App links
CANDIDATE_SUPPORT_URL = os.getenv("SUPPORT_PORTAL_URL")
MOBILE_APP_URL = os.getenv("MOBILE_APP_URL")
PROCTOR_DASHBOARD_URL = os.getenv("PROCTOR_DASHBOARD_URL", "https://proctor-interface.vercel.app")

SENDGRID_URL = "https://api.sendgrid.com/v3/mail/send"

def send_mail_via_sendgrid(to_email, subject, body, attachment_content=None, attachment_name=None):
    if not SENDGRID_API_KEY or not SENDER_EMAIL:
        print("SendGrid API Key or Sender Email missing in environment variables.")
        return False

    headers = {
        "Authorization": f"Bearer {SENDGRID_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "personalizations": [{"to": [{"email": to_email}]}],
        "from": {"name": FROM_NAME, "email": SENDER_EMAIL},
        "subject": subject,
        "content": [{"type": "text/plain", "value": body}]
    }

    if attachment_content and attachment_name:
        payload["attachments"] = [
            {
                "content": attachment_content,
                "filename": attachment_name
            }
        ]

    try:
        with httpx.Client() as client:
            response = client.post(SENDGRID_URL, headers=headers, json=payload)
            if response.status_code in [201, 200, 202]:
                return True
            else:
                print(f"SendGrid API error: {response.status_code} - {response.text}")
                return False
    except Exception as e:
        print(f"Failed to send email to {to_email} via SendGrid: {e}")
        return False

def send_assessment_mail(to_email, candidate_name, assessment_title, assessment_id, assessment_link, valid_from, valid_to):
    subject = f"Invitation to Assessment: {assessment_title}"
    body = f"""
    Hi {candidate_name},

    You have been invited to participate in the assessment: {assessment_title}.

    Your Login Credentials:
        - Registered Email: {to_email}
        - Assessment ID / Password: {assessment_id}


    Please click the link below to access the assessment portal and use both your registered email and the assessment ID provided above to login:
    {assessment_link}


    Eligibility Window:
    The assessment will be accessible from {valid_from} and must be completed by {valid_to}. 
    Please ensure you start your test within this professional window.

    Important: Please use the same device and browser for the entire assessment. In case of a system crash or restart, you can only resume your progress on the same device.
    
    --------------------------------------------------
    📲 MOBILE PROCTORING SETUP (MANDATORY)
    --------------------------------------------------
    This assessment requires secondary monitoring via your mobile device. Please complete these steps BEFORE starting:
    
    1. Download & Install: Download the Proctoring App here:
       {MOBILE_APP_URL}
    
    2. Permissions: Open the app and allow "Camera" permissions.
    
    3. Connectivity: Ensure both your Laptop and Mobile are connected to the SAME WiFi/Network.
    
    4. Placement: Position your mobile device in LANDSCAPE view (horizontal) to your side. It must have a clear view of you and your workspace.
    
    5. Pairing: Once you login to the assessment on your laptop, use the mobile app to scan the QR code or enter the session ID to begin monitoring.
    --------------------------------------------------

    Candidate Support:
    If you have any queries regarding the assessment or if you are not satisfied with your results, you can reach out to us through our Candidate Support Portal:
    {CANDIDATE_SUPPORT_URL}

    Best regards,
    {FROM_NAME} Team
    """
    return send_mail_via_sendgrid(to_email, subject, body)

def send_university_assessment_mail(to_email, candidate_name, registration_number, assessment_title, assessment_id, assessment_link, valid_from, valid_to):
    subject = f"Invitation to University Exam: {assessment_title}"
    body = f"""
    Hi {candidate_name},

    You have been invited to participate in the University Exam: {assessment_title}.

    Your Login Credentials:
        - Registered Email: {to_email}
        - Assessment ID / Password: {assessment_id}


    Please click the link below to access the assessment portal and use both your registered email and the assessment ID provided above to login:
    {assessment_link}


    Eligibility Window:
    The assessment will be accessible from {valid_from} and must be completed by {valid_to}. 
    Please ensure you start your test within this professional window.

    Important: Please use the same device and browser for the entire assessment. In case of a system crash or restart, you can only resume your progress on the same device.
    
    --------------------------------------------------
    📲 MOBILE PROCTORING SETUP (MANDATORY)
    --------------------------------------------------
    This exam requires secondary monitoring via your mobile device. Please complete these steps BEFORE starting:
    
    1. Download & Install: Download the Proctoring App here:
       {MOBILE_APP_URL}
    
    2. Permissions: Open the app and allow "Camera" and "Microphone" permissions.
    
    3. Connectivity: Ensure both your Laptop and Mobile are connected to the SAME WiFi/Network.
    
    4. Placement: Position your mobile device in LANDSCAPE view (horizontal) to your side. It must have a clear view of you and your workspace.
    
    5. Pairing: Once you login to the exam on your laptop, use the mobile app to scan the QR code or enter the session ID to begin monitoring.
    --------------------------------------------------

    Candidate Support:
    If you have any queries regarding the assessment or if you are not satisfied with your results, you can reach out to us through our Candidate Support Portal:
    {CANDIDATE_SUPPORT_URL}

    Best regards,
    {FROM_NAME} Team
    """
    return send_mail_via_sendgrid(to_email, subject, body)

def send_proctor_mail(to_email, proctor_name, assessment_title, assessment_id, passkey):
    subject = f"Invigilator Access: {assessment_title}"
    body = f"""
    Hi {proctor_name},

    You have been assigned as a human proctor for the assessment: {assessment_title}.

    Your Login Credentials for Proctor Interface:
        - Assessment ID: {assessment_id}
        - Passkey: {passkey}

    Please login to the Proctor Dashboard using these credentials to begin monitoring candidates:
    {PROCTOR_DASHBOARD_URL}

    Best regards,
    {FROM_NAME} Team
    """
    return send_mail_via_sendgrid(to_email, subject, body)

def send_certification_mail(to_email, candidate_name, track_name, certificate_id, score, attachment_content=None, issuer="TEAM_TITANS"):
    subject = f"Congratulations - Your {track_name} Certification"
    html_body = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Certificate of Achievement</title>
  <style>
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    body {{ font-family: Helvetica Neue, Arial, sans-serif; background: #f4f6f9; color: #1e293b; }}
    .wrapper {{ max-width: 640px; margin: 0 auto; background: #ffffff; }}
    .header {{ background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%); padding: 40px 48px; text-align: center; }}
    .header-label {{ font-size: 11px; font-weight: 700; letter-spacing: 0.3em; text-transform: uppercase; color: #94a3b8; margin-bottom: 10px; }}
    .header-title {{ font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: 0.05em; text-transform: uppercase; }}
    .header-line {{ width: 48px; height: 3px; background: #3b82f6; margin: 14px auto 0; border-radius: 2px; }}
    .body {{ padding: 48px; }}
    .salutation {{ font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 20px; }}
    .intro {{ font-size: 14px; line-height: 1.75; color: #475569; margin-bottom: 28px; }}
    .cert-card {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 28px 32px; margin-bottom: 28px; }}
    .cert-card-label {{ font-size: 10px; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase; color: #94a3b8; margin-bottom: 16px; }}
    .cert-row {{ display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }}
    .cert-row:last-child {{ margin-bottom: 0; }}
    .cert-key {{ font-size: 12px; font-weight: 600; color: #64748b; }}
    .cert-value {{ font-size: 13px; font-weight: 800; color: #0f172a; }}
    .cert-id-badge {{ display: inline-block; background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; font-size: 12px; font-weight: 800; letter-spacing: 0.08em; padding: 6px 14px; border-radius: 6px; font-family: Courier New, monospace; }}
    .score-badge {{ display: inline-block; background: #f0fdf4; border: 1px solid #bbf7d0; color: #15803d; font-size: 14px; font-weight: 900; padding: 4px 12px; border-radius: 6px; }}
    .divider {{ border: none; border-top: 1px solid #e2e8f0; margin: 28px 0; }}
    .attachment-note {{ font-size: 13px; color: #475569; line-height: 1.7; margin-bottom: 28px; }}
    .closing {{ font-size: 14px; color: #475569; line-height: 1.7; }}
    .closing-name {{ font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 16px; }}
    .closing-title {{ font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; }}
    .footer {{ background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 48px; text-align: center; }}
    .footer-text {{ font-size: 11px; color: #94a3b8; line-height: 1.6; }}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="header-label">Official Communication</div>
      <div class="header-title">Certificate of Achievement</div>
      <div class="header-line"></div>
    </div>
    <div class="body">
      <p class="salutation">Dear {candidate_name},</p>
      <p class="intro">
        We are pleased to inform you that you have successfully completed all assessment requirements
        and have been awarded a professional certification in <strong>{track_name}</strong>.
        This certification reflects your demonstrated competency, discipline, and technical excellence.
      </p>
      <div class="cert-card">
        <div class="cert-card-label">Certification Details</div>
        <div class="cert-row">
          <span class="cert-key">Certification Track</span>
          <span class="cert-value">{track_name}</span>
        </div>
        <div class="cert-row">
          <span class="cert-key">Candidate Name</span>
          <span class="cert-value">{candidate_name}</span>
        </div>
        <div class="cert-row">
          <span class="cert-key">Overall Score</span>
          <span class="cert-value"><span class="score-badge">{score}%</span></span>
        </div>
        <div class="cert-row">
          <span class="cert-key">Status</span>
          <span class="cert-value" style="color: #15803d;">SUCCESSFUL</span>
        </div>
        <div class="cert-row">
          <span class="cert-key">Issuing Authority</span>
          <span class="cert-value">{issuer}</span>
        </div>
        <div class="cert-row">
          <span class="cert-key">Certificate ID</span>
          <span class="cert-id-badge">{certificate_id}</span>
        </div>
      </div>
      <hr class="divider" />
      <p class="attachment-note">
        Your official certificate has been attached to this email. Please save it for your records.
        This credential may be presented to prospective employers or academic institutions.
      </p>
      <p class="closing">We congratulate you on this achievement and wish you continued success.</p>
      <p class="closing-name">{issuer}</p>
      <p class="closing-title">Certification Authority</p>
    </div>
    <div class="footer">
      <p class="footer-text">
        This is an official communication from the assessment platform.<br />
        Certificate ID: {certificate_id} &nbsp;|&nbsp; Do not reply to this email.
      </p>
    </div>
  </div>
</body>
</html>"""

    if not SENDGRID_API_KEY or not SENDER_EMAIL:
        print("SendGrid API Key or Sender Email missing.")
        return False

    headers = {
        "Authorization": f"Bearer {SENDGRID_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "personalizations": [{"to": [{"email": to_email}]}],
        "from": {"name": FROM_NAME, "email": SENDER_EMAIL},
        "subject": subject,
        "content": [{"type": "text/html", "value": html_body}]
    }

    if attachment_content:
        safe_name = f"Certificate_{track_name.replace(' ', '_')}_{candidate_name.replace(' ', '_')}.png"
        payload["attachments"] = [{
            "content": attachment_content,
            "filename": safe_name,
            "type": "image/png",
            "disposition": "attachment"
        }]

    try:
        with httpx.Client() as client:
            response = client.post(SENDGRID_URL, headers=headers, json=payload)
            if response.status_code in [200, 201, 202]:
                return True
            else:
                print(f"SendGrid error: {response.status_code} - {response.text}")
                return False
    except Exception as e:
        print(f"Failed to send certificate email to {to_email}: {e}")
        return False
