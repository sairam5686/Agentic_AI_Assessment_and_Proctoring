import os
from dotenv import load_dotenv
import httpx

load_dotenv()

# Configuration
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
SENDER_EMAIL = os.getenv("SENDER_EMAIL") # Your verified email address in SendGrid
FROM_NAME = os.getenv("FROM_NAME", "TEAM_TITANS")

# Support portal and Mobile App links
CANDIDATE_SUPPORT_URL = os.getenv("SUPPORT_PORTAL_URL")
MOBILE_APP_URL = os.getenv("MOBILE_APP_URL")

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
        "from": {"email": SENDER_EMAIL, "name": FROM_NAME},
        "subject": subject,
        "content": [{"type": "text/plain", "value": body}]
    }

    if attachment_content and attachment_name:
        payload["attachments"] = [
            {
                "content": attachment_content,
                "filename": attachment_name,
                "type": "image/png",
                "disposition": "attachment"
            }
        ]

    try:
        with httpx.Client() as client:
            response = client.post(SENDGRID_URL, headers=headers, json=payload)
            if response.status_code in [200, 202]:
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

    Please login to the Proctor Dashboard using these credentials to begin monitoring candidates.

    Best regards,
    {FROM_NAME} Team
    """
    return send_mail_via_sendgrid(to_email, subject, body)

def send_certification_mail(to_email, candidate_name, track_name, certificate_id, score, attachment_content=None, issuer="TEAM_TITANS"):
    subject = f"Congratulations! Your Professional Certification for {track_name}"
    body = f"""
    Hi {candidate_name},

    Congratulations! We are pleased to inform you that you have successfully cleared the assessment benchmarks for the professional track of:
    {track_name}

    Your Performance Summary:
    - Overall Score: {score}%
    - Status: SUCCESSFUL
    - Grade: DISTINCTION

    Your unique Verification Credential ID is: {certificate_id}

    Attached to this email, you will find your professional certificate as an image. This recognizes your industry-standard proficiency and technical excellence.

    Well done on this significant achievement!

    Best regards,
    {issuer}
    """
    return send_mail_via_sendgrid(to_email, subject, body, attachment_content, "Certificate.png")
