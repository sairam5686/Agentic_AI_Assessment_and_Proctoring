import os
import base64
import httpx
from dotenv import load_dotenv

load_dotenv()

# Configuration from environment variables
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
SENDER_EMAIL = os.getenv("SENDER_EMAIL")
FROM_NAME = os.getenv("FROM_NAME", "TEAM_TITANS")
SENDGRID_URL = "https://api.sendgrid.com/v3/mail/send"

async def send_report_email(recipient_email: str, assessment_id: str, pdf_path: str):
    """
    Sends the assessment query report via SendGrid API with PDF attachment.
    """
    if not SENDGRID_API_KEY or not SENDER_EMAIL:
        print("DEBUG: SendGrid API Key or Sender Email missing in environment variables.")
        return False

    # 1. Read and encode the PDF attachment to Base64
    try:
        if not os.path.exists(pdf_path):
            print(f"DEBUG: PDF file not found at {pdf_path}")
            return False
            
        with open(pdf_path, "rb") as f:
            pdf_content = base64.b64encode(f.read()).decode("utf-8")
        
        file_name = os.path.basename(pdf_path)
    except Exception as e:
        print(f"DEBUG: Failed to process PDF attachment: {e}")
        return False

    # 2. Prepare SendGrid API Request
    headers = {
        "Authorization": f"Bearer {SENDGRID_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "personalizations": [{"to": [{"email": recipient_email}]}],
        "from": {"email": SENDER_EMAIL, "name": FROM_NAME},
        "subject": f"Assessment Query Report - {assessment_id}",
        "content": [{"type": "text/plain", "value": f"Hello,\n\nPlease find the attached report regarding your query for Assessment {assessment_id}.\n\nBest regards,\n{FROM_NAME}"}],
        "attachments": [
            {
                "content": pdf_content,
                "filename": file_name,
                "type": "application/pdf",
                "disposition": "attachment"
            }
        ]
    }

    # 3. Send the request asynchronously
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(SENDGRID_URL, headers=headers, json=payload)
            
            if response.status_code in [200, 201, 202]:
                print(f"DEBUG: Email sent successfully to {recipient_email}")
                return True
            else:
                print(f"DEBUG: SendGrid API error: {response.status_code} - {response.text}")
                return False
    except Exception as e:
        print(f"DEBUG: Failed to send email via SendGrid: {e}")
        return False
