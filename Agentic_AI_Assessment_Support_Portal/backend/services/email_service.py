import os
import base64
import httpx
from dotenv import load_dotenv

load_dotenv()

# Configuration from environment variables
BREVO_API_KEY = os.getenv("BREVO_API_KEY")
SENDER_EMAIL = os.getenv("SENDER_EMAIL")
FROM_NAME = os.getenv("FROM_NAME", "TEAM_TITANS")
BREVO_URL = "https://api.brevo.com/v3/smtp/email"

async def send_report_email(recipient_email: str, assessment_id: str, pdf_path: str):
    """
    Sends the assessment query report via Brevo API with PDF attachment.
    """
    if not BREVO_API_KEY or not SENDER_EMAIL:
        print("DEBUG: Brevo API Key or Sender Email missing in environment variables.")
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

    # 2. Prepare Brevo API Request
    headers = {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json"
    }

    payload = {
        "sender": {"name": FROM_NAME, "email": SENDER_EMAIL},
        "to": [{"email": recipient_email}],
        "subject": f"Assessment Query Report - {assessment_id}",
        "textContent": f"Hello,\n\nPlease find the attached report regarding your query for Assessment {assessment_id}.\n\nBest regards,\n{FROM_NAME}",
        "attachment": [
            {
                "content": pdf_content,
                "name": file_name
            }
        ]
    }

    # 3. Send the request asynchronously
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(BREVO_URL, headers=headers, json=payload)
            
            if response.status_code in [200, 201, 202]:
                print(f"DEBUG: Email sent successfully to {recipient_email}")
                return True
            else:
                print(f"DEBUG: Brevo API error: {response.status_code} - {response.text}")
                return False
    except Exception as e:
        print(f"DEBUG: Failed to send email via Brevo: {e}")
        return False
