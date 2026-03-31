import os
from dotenv import load_dotenv
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

load_dotenv()

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER", "YOUR_EMAIL@gmail.com")
SMTP_PASS = os.getenv("SMTP_PASS", "YOUR_SMTP_PASSWORD")
FROM_NAME = os.getenv("FROM_NAME", "TEAM_TITANS")



def send_assessment_mail(to_email, candidate_name, assessment_title, assessment_id, assessment_link, valid_from, valid_to):
    try:
        msg = MIMEMultipart()
        msg['From'] = f"{FROM_NAME} <{SMTP_USER}>"
        msg['To'] = to_email
        msg['Subject'] = f"Invitation to Assessment: {assessment_title}"

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

        Candidate Support:
        If you have any queries regarding the assessment or if you are not satisfied with your results, you can reach out to us through our Candidate Support Portal:
        http://localhost:5174

        Best regards,
        {FROM_NAME} Team
        """
        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"Failed to send email to {to_email}: {e}")
        return False

def send_proctor_mail(to_email, proctor_name, assessment_title, assessment_id, passkey):
    try:
        msg = MIMEMultipart()
        msg['From'] = f"{FROM_NAME} <{SMTP_USER}>"
        msg['To'] = to_email
        msg['Subject'] = f"Invigilator Access: {assessment_title}"

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
        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"Failed to send proctor email to {to_email}: {e}")
        return False
