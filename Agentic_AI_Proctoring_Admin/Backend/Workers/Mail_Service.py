import os
from dotenv import load_dotenv
import httpx

load_dotenv()

# Configuration
BREVO_API_KEY = os.getenv("BREVO_API_KEY")
SENDER_EMAIL = os.getenv("SENDER_EMAIL") # Your verified Gmail address in Brevo
FROM_NAME = os.getenv("FROM_NAME", "TEAM_TITANS")

# Support portal link
CANDIDATE_SUPPORT_URL = os.getenv("VITE_CANDIDATE_PORTAL_URL", "http://localhost:5173")

BREVO_URL = "https://api.brevo.com/v3/smtp/email"

def send_mail_via_brevo(to_email, subject, body):
    if not BREVO_API_KEY or not SENDER_EMAIL:
        print("Brevo API Key or Sender Email missing in environment variables.")
        return False

    headers = {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json"
    }

    payload = {
        "sender": {"name": FROM_NAME, "email": SENDER_EMAIL},
        "to": [{"email": to_email}],
        "subject": subject,
        "textContent": body
    }

    try:
        with httpx.Client() as client:
            response = client.post(BREVO_URL, headers=headers, json=payload)
            if response.status_code in [201, 200, 202]:
                return True
            else:
                print(f"Brevo API error: {response.status_code} - {response.text}")
                return False
    except Exception as e:
        print(f"Failed to send email to {to_email} via Brevo: {e}")
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
    
    Candidate Support:
    If you have any queries regarding the assessment or if you are not satisfied with your results, you can reach out to us through our Candidate Support Portal:
    {CANDIDATE_SUPPORT_URL}

    Best regards,
    {FROM_NAME} Team
    """
    return send_mail_via_brevo(to_email, subject, body)

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
    
    Candidate Support:
    If you have any queries regarding the assessment or if you are not satisfied with your results, you can reach out to us through our Candidate Support Portal:
    {CANDIDATE_SUPPORT_URL}

    Best regards,
    {FROM_NAME} Team
    """
    return send_mail_via_brevo(to_email, subject, body)

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
    return send_mail_via_brevo(to_email, subject, body)
