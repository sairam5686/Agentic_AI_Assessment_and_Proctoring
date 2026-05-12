import os
from dotenv import load_dotenv
import resend

load_dotenv()

# Configuration
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
resend.api_key = RESEND_API_KEY

# If you haven't verified a domain in Resend, you MUST use "onboarding@resend.dev"
# Once you verify a domain (e.g., titans.com), you can use "info@titans.com"
FROM_EMAIL = os.getenv("FROM_EMAIL", "onboarding@resend.dev")
FROM_NAME = os.getenv("FROM_NAME", "TEAM_TITANS")

# Support portal link
CANDIDATE_SUPPORT_URL = os.getenv("VITE_CANDIDATE_PORTAL_URL", "http://localhost:5173")

def send_assessment_mail(to_email, candidate_name, assessment_title, assessment_id, assessment_link, valid_from, valid_to):
    try:
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
        
        params = {
            "from": f"{FROM_NAME} <{FROM_EMAIL}>",
            "to": to_email,
            "subject": subject,
            "text": body,
        }

        resend.Emails.send(params)
        return True
    except Exception as e:
        print(f"Failed to send email to {to_email} via Resend: {e}")
        return False

def send_university_assessment_mail(to_email, candidate_name, registration_number, assessment_title, assessment_id, assessment_link, valid_from, valid_to):
    try:
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

        params = {
            "from": f"{FROM_NAME} <{FROM_EMAIL}>",
            "to": to_email,
            "subject": subject,
            "text": body,
        }

        resend.Emails.send(params)
        return True
    except Exception as e:
        print(f"Failed to send university exam email to {to_email} via Resend: {e}")
        return False

def send_proctor_mail(to_email, proctor_name, assessment_title, assessment_id, passkey):
    try:
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

        params = {
            "from": f"{FROM_NAME} <{FROM_EMAIL}>",
            "to": to_email,
            "subject": subject,
            "text": body,
        }

        resend.Emails.send(params)
        return True
    except Exception as e:
        print(f"Failed to send proctor email to {to_email} via Resend: {e}")
        return False
