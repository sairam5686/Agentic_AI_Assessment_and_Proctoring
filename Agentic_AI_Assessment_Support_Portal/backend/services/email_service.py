import os
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from dotenv import load_dotenv

load_dotenv()

# use SMTP_ prefix as requested
conf = ConnectionConfig(
    MAIL_USERNAME = os.getenv("SMTP_USER"),
    MAIL_PASSWORD = os.getenv("SMTP_PASS"),
    MAIL_FROM = os.getenv("SMTP_USER"), # Defaulting to SMTP_USER if MAIL_FROM not provided
    MAIL_PORT = int(os.getenv("SMTP_PORT", 587)),
    MAIL_SERVER = os.getenv("SMTP_HOST", "smtp.gmail.com"),
    MAIL_STARTTLS = os.getenv("MAIL_STARTTLS", "True") == "True",
    MAIL_SSL_TLS = os.getenv("MAIL_SSL_TLS", "False") == "True",
    USE_CREDENTIALS = True
)

async def send_report_email(recipient_email: str, assessment_id: str, pdf_path: str):
    from_name = os.getenv("FROM_NAME", "Proctoring Team")
    
    message = MessageSchema(
        subject=f"Assessment Query Report - {assessment_id}",
        recipients=[recipient_email],
        body=f"Hello,\n\nPlease find the attached report regarding your query for Assessment {assessment_id}.\n\nBest regards,\n{from_name}",
        attachments=[pdf_path],
        subtype="plain"
    )

    fm = FastMail(conf)
    await fm.send_message(message)
