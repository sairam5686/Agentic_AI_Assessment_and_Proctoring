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

def send_mail_via_sendgrid(to_email, subject, body, attachment_content=None, attachment_name=None, is_html=False):
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
        "content": [{"type": "text/html" if is_html else "text/plain", "value": body}]
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
    
    html_body = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Assessment Invitation</title>
  <style>
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f4f6f9; color: #1e293b; -webkit-font-smoothing: antialiased; }}
    a {{ color: #2563eb; text-decoration: none; }}
    a:hover {{ text-decoration: underline; }}
  </style>
</head>
<body style="margin: 0; padding: 20px 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div class="wrapper" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
    
    <!-- Header -->
    <div class="header" style="background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%); padding: 40px 32px; text-align: center;">
      <div class="header-label" style="font-size: 11px; font-weight: 700; letter-spacing: 0.3em; text-transform: uppercase; color: #94a3b8; margin-bottom: 8px;">Official Communication</div>
      <div class="header-title" style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: 0.05em; text-transform: uppercase;">Assessment Invitation</div>
      <div class="header-line" style="width: 48px; height: 3px; background-color: #3b82f6; margin: 12px auto 0; border-radius: 2px;"></div>
    </div>
    
    <!-- Body Content -->
    <div class="body" style="padding: 40px 32px;">
      <p class="salutation" style="font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 16px;">Dear {candidate_name},</p>
      <p class="intro" style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 28px;">
        You have been invited to participate in the professional assessment: <strong style="color: #0f172a;">{assessment_title}</strong>. Please review your credentials, mobile setup guidelines, and secure browser instructions below to prepare for the session.
      </p>
      
      <!-- 1. Credentials Card -->
      <div class="section-card" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 28px;">
        <span class="section-card-label" style="font-size: 10px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: #4f46e5; margin-bottom: 16px; display: block; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">🔑 Your Login Credentials</span>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; line-height: 1.6;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 140px; vertical-align: top;">Registered Email</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 700; word-break: break-all;">{to_email}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600; vertical-align: top;">Assessment ID</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 700; font-family: monospace; font-size: 14px; letter-spacing: 0.05em;">{assessment_id}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600; vertical-align: top;">Access Window</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">
              <span style="display: inline-block; background-color: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; margin-bottom: 4px;">Active Window</span><br/>
              From: {valid_from}<br/>
              To: {valid_to}
            </td>
          </tr>
        </table>
      </div>

      <!-- 2. Mobile Proctoring Setup Card -->
      <div class="section-card" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 28px;">
        <span class="section-card-label" style="font-size: 10px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: #0f766e; margin-bottom: 16px; display: block; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">📲 Mobile Proctoring Setup (Mandatory)</span>
        <p style="font-size: 13px; color: #64748b; margin-bottom: 12px; line-height: 1.5;">This exam requires secondary camera monitoring via your mobile device. Please complete these steps before logging in:</p>
        <ol style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.65; color: #475569;">
          <li style="margin-bottom: 8px;"><strong>Download & Install:</strong> Download the official monitoring application:<br/><a href="{MOBILE_APP_URL}" target="_blank" style="color: #2563eb; font-weight: 700; text-decoration: underline;">Download Proctoring App</a></li>
          <li style="margin-bottom: 8px;"><strong>Permissions:</strong> Open the app and allow <strong>Camera</strong> permissions.</li>
          <li style="margin-bottom: 8px;"><strong>Network:</strong> Connect both your computer and mobile phone to the <strong>same WiFi/Network</strong>.</li>
          <li style="margin-bottom: 8px;"><strong>Placement:</strong> Place your mobile in <strong>Landscape (horizontal)</strong> position to your side, fully capturing you and your keyboard workspace.</li>
          <li style="margin-bottom: 8px;"><strong>Pairing:</strong> Scan the QR code presented on your computer login screen inside the app to initiate secondary monitoring.</li>
        </ol>
      </div>

      <!-- 3. Safe Exam Browser Setup Card -->
      <div class="section-card security" style="background-color: #fffbfa; border: 1px solid #fee2e2; border-radius: 12px; padding: 24px; margin-bottom: 28px;">
        <span class="section-card-label" style="font-size: 10px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: #b91c1c; margin-bottom: 16px; display: block; border-bottom: 1px solid #fee2e2; padding-bottom: 8px;">🔐 Safe Exam Browser (SEB) Setup (Mandatory)</span>
        <p style="font-size: 13px; color: #7f1d1d; margin-bottom: 12px; line-height: 1.5; font-weight: 600;">To ensure test integrity, standard browsers (Chrome, Edge, Safari) cannot open this test. You must use SEB:</p>
        
        <ol style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.65; color: #7f1d1d;">
          <li style="margin-bottom: 8px; color: #7f1d1d;"><strong>Open Portal:</strong> Click this link in your normal browser: <a href="{assessment_link}" target="_blank" style="color: #b91c1c; font-weight: 700; text-decoration: underline;">Open Setup Portal</a></li>
          <li style="margin-bottom: 8px; color: #7f1d1d;"><strong>Download SEB:</strong> Install the SEB client on your testing machine.</li>
          <li style="margin-bottom: 8px; color: #7f1d1d;"><strong>Download Configuration:</strong> Download the custom <code>TITANS_CANDIDATEPORTAL.seb</code> settings.</li>
          <li style="margin-bottom: 8px; color: #7f1d1d;"><strong>Launch Exam:</strong> Double-click the downloaded <code>.seb</code> file (or click "Already Setup? Launch Exam in SEB" on the page) to open the secure exam browser.</li>
        </ol>
        
        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; margin-top: 16px; border-radius: 0 8px 8px 0; font-size: 12px; line-height: 1.5; color: #991b1b;">
          <strong>CRITICAL POLICY REMINDER:</strong> You can download and set up SEB anytime beforehand. However, your login credentials will strictly only be authorized and active during your scheduled window. Early login attempts will be automatically denied.
        </div>
      </div>
      
      <hr class="divider" style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;" />
      
      <!-- Candidate Support -->
      <div style="font-size: 13px; line-height: 1.6; color: #475569; margin-bottom: 28px;">
        <strong style="color: #0f172a; display: block; margin-bottom: 4px;">Candidate Support:</strong>
        If you have technical questions or need assistance during the test setup, access our Candidate Support Portal:<br/>
        <a href="{CANDIDATE_SUPPORT_URL}" target="_blank" style="color: #2563eb; font-weight: 700; text-decoration: underline;">Visit Support Portal</a>
      </div>
      
      <!-- Closing Sign-off -->
      <p class="closing" style="font-size: 14px; color: #475569; line-height: 1.5;">We wish you the best of luck with your assessment!</p>
      <p class="closing-name" style="font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 16px;">Team Titans</p>
      <p class="closing-title" style="font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em;">Virtusa Hackathon Authority</p>
    </div>
    
    <!-- Footer -->
    <div class="footer" style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px; text-align: center;">
      <p class="footer-text" style="font-size: 11px; color: #94a3b8; line-height: 1.6;">
        This is an official automated communication regarding your scheduled assessment.<br/>
        Please do not reply directly to this message.
      </p>
    </div>
  </div>
</body>
</html>"""
    return send_mail_via_sendgrid(to_email, subject, html_body, is_html=True)

def send_university_assessment_mail(to_email, candidate_name, registration_number, assessment_title, assessment_id, assessment_link, valid_from, valid_to):
    subject = f"Invitation to University Exam: {assessment_title}"
    
    html_body = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>University Exam Invitation</title>
  <style>
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f4f6f9; color: #1e293b; -webkit-font-smoothing: antialiased; }}
    a {{ color: #2563eb; text-decoration: none; }}
    a:hover {{ text-decoration: underline; }}
  </style>
</head>
<body style="margin: 0; padding: 20px 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div class="wrapper" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
    
    <!-- Header -->
    <div class="header" style="background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%); padding: 40px 32px; text-align: center;">
      <div class="header-label" style="font-size: 11px; font-weight: 700; letter-spacing: 0.3em; text-transform: uppercase; color: #94a3b8; margin-bottom: 8px;">Official Communication</div>
      <div class="header-title" style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: 0.05em; text-transform: uppercase;">University Exam Invitation</div>
      <div class="header-line" style="width: 48px; height: 3px; background-color: #3b82f6; margin: 12px auto 0; border-radius: 2px;"></div>
    </div>
    
    <!-- Body Content -->
    <div class="body" style="padding: 40px 32px;">
      <p class="salutation" style="font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 16px;">Dear {candidate_name},</p>
      <p class="intro" style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 28px;">
        You have been invited to participate in the university examination: <strong style="color: #0f172a;">{assessment_title}</strong>. Please review your credentials, secondary mobile setup guidelines, and secure browser instructions below to prepare for the session.
      </p>
      
      <!-- 1. Credentials Card -->
      <div class="section-card" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 28px;">
        <span class="section-card-label" style="font-size: 10px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: #4f46e5; margin-bottom: 16px; display: block; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">🔑 Your Exam Login Credentials</span>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; line-height: 1.6;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 140px; vertical-align: top;">Registered Email</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 700; word-break: break-all;">{to_email}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600; vertical-align: top;">Reg. Number</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">{registration_number}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600; vertical-align: top;">Assessment ID</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 700; font-family: monospace; font-size: 14px; letter-spacing: 0.05em;">{assessment_id}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600; vertical-align: top;">Access Window</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">
              <span style="display: inline-block; background-color: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; margin-bottom: 4px;">Active Window</span><br/>
              From: {valid_from}<br/>
              To: {valid_to}
            </td>
          </tr>
        </table>
      </div>

      <!-- 2. Mobile Proctoring Setup Card -->
      <div class="section-card" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 28px;">
        <span class="section-card-label" style="font-size: 10px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: #0f766e; margin-bottom: 16px; display: block; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">📲 Mobile Proctoring Setup (Mandatory)</span>
        <p style="font-size: 13px; color: #64748b; margin-bottom: 12px; line-height: 1.5;">This exam requires secondary camera & microphone monitoring via your mobile device. Please complete these steps before logging in:</p>
        <ol style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.65; color: #475569;">
          <li style="margin-bottom: 8px;"><strong>Download & Install:</strong> Download the official monitoring application:<br/><a href="{MOBILE_APP_URL}" target="_blank" style="color: #2563eb; font-weight: 700; text-decoration: underline;">Download Proctoring App</a></li>
          <li style="margin-bottom: 8px;"><strong>Permissions:</strong> Open the app and allow both <strong>Camera</strong> and <strong>Microphone</strong> permissions.</li>
          <li style="margin-bottom: 8px;"><strong>Network:</strong> Connect both your computer and mobile phone to the <strong>same WiFi/Network</strong>.</li>
          <li style="margin-bottom: 8px;"><strong>Placement:</strong> Place your mobile in <strong>Landscape (horizontal)</strong> position to your side, fully capturing you and your keyboard workspace.</li>
          <li style="margin-bottom: 8px;"><strong>Pairing:</strong> Scan the QR code presented on your computer login screen inside the app to initiate secondary monitoring.</li>
        </ol>
      </div>

      <!-- 3. Safe Exam Browser Setup Card -->
      <div class="section-card security" style="background-color: #fffbfa; border: 1px solid #fee2e2; border-radius: 12px; padding: 24px; margin-bottom: 28px;">
        <span class="section-card-label" style="font-size: 10px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: #b91c1c; margin-bottom: 16px; display: block; border-bottom: 1px solid #fee2e2; padding-bottom: 8px;">🔐 Safe Exam Browser (SEB) Setup (Mandatory)</span>
        <p style="font-size: 13px; color: #7f1d1d; margin-bottom: 12px; line-height: 1.5; font-weight: 600;">To ensure exam integrity, standard browsers (Chrome, Edge, Safari) cannot open this exam. You must use SEB:</p>
        
        <ol style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.65; color: #7f1d1d;">
          <li style="margin-bottom: 8px; color: #7f1d1d;"><strong>Open Portal:</strong> Click this link in your normal browser: <a href="{assessment_link}" target="_blank" style="color: #b91c1c; font-weight: 700; text-decoration: underline;">Open Setup Portal</a></li>
          <li style="margin-bottom: 8px; color: #7f1d1d;"><strong>Download SEB:</strong> Install the SEB client on your testing machine.</li>
          <li style="margin-bottom: 8px; color: #7f1d1d;"><strong>Download Configuration:</strong> Download the custom <code>TITANS_CANDIDATEPORTAL.seb</code> settings.</li>
          <li style="margin-bottom: 8px; color: #7f1d1d;"><strong>Launch Exam:</strong> Double-click the downloaded <code>.seb</code> file (or click "Already Setup? Launch Exam in SEB" on the page) to open the secure exam browser.</li>
        </ol>
        
        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; margin-top: 16px; border-radius: 0 8px 8px 0; font-size: 12px; line-height: 1.5; color: #991b1b;">
          <strong>CRITICAL POLICY REMINDER:</strong> You can download and set up SEB anytime beforehand. However, your login credentials will strictly only be authorized and active during your scheduled window. Early login attempts will be automatically denied.
        </div>
      </div>
      
      <hr class="divider" style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;" />
      
      <!-- Candidate Support -->
      <div style="font-size: 13px; line-height: 1.6; color: #475569; margin-bottom: 28px;">
        <strong style="color: #0f172a; display: block; margin-bottom: 4px;">Candidate Support:</strong>
        If you have technical questions or need assistance during the exam setup, access our Candidate Support Portal:<br/>
        <a href="{CANDIDATE_SUPPORT_URL}" target="_blank" style="color: #2563eb; font-weight: 700; text-decoration: underline;">Visit Support Portal</a>
      </div>
      
      <!-- Closing Sign-off -->
      <p class="closing" style="font-size: 14px; color: #475569; line-height: 1.5;">We wish you the best of luck with your university exam!</p>
      <p class="closing-name" style="font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 16px;">Team Titans</p>
      <p class="closing-title" style="font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em;">Virtusa Hackathon Authority</p>
    </div>
    
    <!-- Footer -->
    <div class="footer" style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px; text-align: center;">
      <p class="footer-text" style="font-size: 11px; color: #94a3b8; line-height: 1.6;">
        This is an official automated communication regarding your scheduled examination.<br/>
        Please do not reply directly to this message.
      </p>
    </div>
  </div>
</body>
</html>"""
    return send_mail_via_sendgrid(to_email, subject, html_body, is_html=True)

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
