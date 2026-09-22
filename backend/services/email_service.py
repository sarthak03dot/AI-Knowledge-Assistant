"""
Email Service for NexusRAG Authentication & Notifications
Primary: Gmail SMTP
Fallback: Brevo (Sendinblue) API & SMTP
Dev Fallback: Local Console Logger with Visual Code Box
"""

import os
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any, Optional
try:
    import httpx
except ImportError:
    httpx = None

# Load environment variables
GMAIL_USER = os.getenv("GMAIL_USER") or os.getenv("SMTP_USER")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD") or os.getenv("SMTP_PASSWORD")
SMTP_HOST = os.getenv("SMTP_HOST") or "smtp.gmail.com"
SMTP_PORT = int(os.getenv("SMTP_PORT") or "587")

BREVO_API_KEY = os.getenv("BREVO_API_KEY") or os.getenv("SENDINBLUE_API_KEY")
BREVO_SENDER_EMAIL = os.getenv("BREVO_SENDER_EMAIL") or GMAIL_USER or "noreply@nexusrag.ai"
BREVO_SENDER_NAME = os.getenv("BREVO_SENDER_NAME") or "NexusRAG Security"
BREVO_SMTP_KEY = os.getenv("BREVO_SMTP_KEY") or BREVO_API_KEY


def generate_otp_html(recipient_name: str, otp_code: str) -> str:
    """Generate a high-conversion, responsive HTML email template for OTP verification."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your NexusRAG Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0b0f19; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; background-color: #111827; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #2563eb 100%); padding: 32px 30px; text-align: center;">
              <div style="font-size: 28px; line-height: 1.2; margin-bottom: 6px;">⚡ <strong>NexusRAG</strong></div>
              <div style="font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; color: #e0e7ff; opacity: 0.95;">Enterprise Knowledge & RAG Intelligence</div>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding: 36px 32px;">
              <h1 style="font-size: 20px; font-weight: 700; color: #ffffff; margin-top: 0; margin-bottom: 12px;">
                Verify Your Account
              </h1>
              <p style="font-size: 14px; line-height: 1.6; color: #94a3b8; margin-top: 0; margin-bottom: 24px;">
                Hello <strong style="color: #f1f5f9;">{recipient_name}</strong>,<br>
                Thank you for registering with NexusRAG. To complete your registration and secure your workspace, please use the 6-digit verification code below:
              </p>

              <!-- OTP Code Display Card -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td align="center" style="background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.35); border-radius: 12px; padding: 24px 20px;">
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #818cf8; font-weight: 700; margin-bottom: 8px;">
                      One-Time Verification Code
                    </div>
                    <div style="font-size: 36px; font-weight: 800; letter-spacing: 0.28em; color: #38bdf8; font-family: 'Courier New', Courier, monospace; text-shadow: 0 0 20px rgba(56, 189, 248, 0.4);">
                      {otp_code}
                    </div>
                    <div style="font-size: 12px; color: #64748b; margin-top: 10px;">
                      ⏳ Valid for <strong>10 minutes</strong>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Security Information -->
              <div style="background-color: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 8px; padding: 14px 16px; margin-bottom: 24px;">
                <p style="font-size: 12px; line-height: 1.5; color: #94a3b8; margin: 0;">
                  🔒 <strong>Security Warning:</strong> Never share this code with anyone. NexusRAG staff will never ask for your verification code or password.
                </p>
              </div>

              <p style="font-size: 13px; line-height: 1.5; color: #64748b; margin-bottom: 0;">
                If you did not initiate this request, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0d121f; border-top: 1px solid rgba(255, 255, 255, 0.06); padding: 20px 32px; text-align: center;">
              <p style="font-size: 11px; color: #475569; margin: 0;">
                © {recipient_name} • NexusRAG Grounded Intelligence Engine. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


class EmailService:
    def _get_config(self) -> Dict[str, Any]:
        """Reload configuration from .env dynamically so runtime updates take effect immediately."""
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        env_file = os.path.join(base_dir, ".env")
        if os.path.exists(env_file):
            with open(env_file, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        os.environ[k.strip()] = v.strip().strip("'\"")

        gmail_user = (os.getenv("GMAIL_USER") or os.getenv("SMTP_USER") or "").strip()
        gmail_pwd = (os.getenv("GMAIL_APP_PASSWORD") or os.getenv("SMTP_PASSWORD") or "").replace(" ", "").strip()
        smtp_host = os.getenv("SMTP_HOST") or "smtp.gmail.com"
        smtp_port = int(os.getenv("SMTP_PORT") or "587")

        brevo_key = (os.getenv("BREVO_API_KEY") or os.getenv("SENDINBLUE_API_KEY") or "").strip()
        brevo_sender = os.getenv("BREVO_SENDER_EMAIL") or gmail_user or "noreply@nexusrag.ai"
        brevo_name = os.getenv("BREVO_SENDER_NAME") or "NexusRAG Security"

        return {
            "gmail_user": gmail_user,
            "gmail_pwd": gmail_pwd,
            "smtp_host": smtp_host,
            "smtp_port": smtp_port,
            "brevo_key": brevo_key,
            "brevo_sender": brevo_sender,
            "brevo_name": brevo_name,
        }

    def send_via_gmail(self, recipient_email: str, recipient_name: str, otp_code: str, config: Dict[str, Any]) -> bool:
        """
        Send verification email via Gmail SMTP:
        1. Attempt direct SSL on Port 465 (ultra-fast, immune to STARTTLS timeouts)
        2. Fallback to Port 587 with STARTTLS
        """
        user = config["gmail_user"]
        pwd = config["gmail_pwd"]
        host = config["smtp_host"]

        if not user or not pwd:
            return False

        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"{otp_code} is your NexusRAG verification code"
        msg["From"] = f"{config['brevo_name']} <{user}>"
        msg["To"] = recipient_email

        text_content = f"Hello {recipient_name},\n\nYour NexusRAG verification code is: {otp_code}\n\nThis code will expire in 10 minutes.\nIf you did not request this, please disregard."
        html_content = generate_otp_html(recipient_name, otp_code)

        msg.attach(MIMEText(text_content, "plain"))
        msg.attach(MIMEText(html_content, "html"))

        # Strategy A: Port 465 SSL Direct (Most reliable for Gmail)
        try:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(host, 465, context=context, timeout=12) as server:
                server.login(user, pwd)
                server.sendmail(user, recipient_email, msg.as_string())
            print(f"[EmailService] ✅ Sent OTP email to {recipient_email} via Gmail SSL (Port 465).")
            return True
        except Exception as e_ssl:
            print(f"[EmailService] ℹ️ Gmail Port 465 notice ({e_ssl}). Attempting Port 587 STARTTLS...")

        # Strategy B: Port 587 STARTTLS
        try:
            context = ssl.create_default_context()
            with smtplib.SMTP(host, 587, timeout=12) as server:
                server.ehlo()
                server.starttls(context=context)
                server.ehlo()
                server.login(user, pwd)
                server.sendmail(user, recipient_email, msg.as_string())
            print(f"[EmailService] ✅ Sent OTP email to {recipient_email} via Gmail STARTTLS (Port 587).")
            return True
        except Exception as e_tls:
            print(f"[EmailService] ⚠️ Gmail SMTP delivery failed: {e_tls}")
            return False

    def send_via_brevo(self, recipient_email: str, recipient_name: str, otp_code: str, config: Dict[str, Any]) -> bool:
        """Send verification email via Brevo (Sendinblue) Transactional REST API."""
        brevo_key = config["brevo_key"]
        if not brevo_key or "your_brevo" in brevo_key.lower() or "your_" in brevo_key.lower():
            return False

        try:
            url = "https://api.brevo.com/v3/smtp/email"
            headers = {
                "accept": "application/json",
                "api-key": brevo_key,
                "content-type": "application/json",
            }
            payload = {
                "sender": {
                    "name": config["brevo_name"],
                    "email": config["brevo_sender"],
                },
                "to": [
                    {
                        "email": recipient_email,
                        "name": recipient_name,
                    }
                ],
                "subject": f"{otp_code} is your NexusRAG verification code",
                "htmlContent": generate_otp_html(recipient_name, otp_code),
            }

            with httpx.Client(timeout=12.0) as client:
                resp = client.post(url, json=payload, headers=headers)
                if resp.status_code in (200, 201, 202):
                    print(f"[EmailService] ✅ Sent OTP email to {recipient_email} via Brevo API.")
                    return True
                else:
                    print(f"[EmailService] ⚠️ Brevo API error ({resp.status_code}): {resp.text}")
                    return False
        except Exception as e:
            print(f"[EmailService] ⚠️ Brevo delivery failed: {e}")
            return False

    def send_otp_email(self, recipient_email: str, recipient_name: str, otp_code: str) -> Dict[str, Any]:
        """
        Orchestrate multi-tier OTP email dispatch:
        1. Attempt Gmail SMTP (Port 465 SSL / Port 587 STARTTLS)
        2. Attempt Brevo API (Fallback)
        3. Local Console Logger (Dev Fallback)
        """
        config = self._get_config()
        clean_email = recipient_email.strip().lower()
        clean_name = recipient_name.strip() or "User"

        # Tier 1: Gmail SMTP
        if config["gmail_user"] and config["gmail_pwd"]:
            if self.send_via_gmail(clean_email, clean_name, otp_code, config):
                return {
                    "success": True,
                    "provider": "Gmail SMTP",
                    "recipient": clean_email,
                }

        # Tier 2: Brevo API
        if config["brevo_key"] and "your_" not in config["brevo_key"].lower():
            if self.send_via_brevo(clean_email, clean_name, otp_code, config):
                return {
                    "success": True,
                    "provider": "Brevo (Sendinblue)",
                    "recipient": clean_email,
                }

        # Tier 3: Dev Simulation Fallback
        print("\n" + "=" * 60)
        print(f"  ⚡ [NEXUSRAG OTP VERIFICATION CODE] ⚡")
        print(f"  Recipient : {clean_name} <{clean_email}>")
        print(f"  OTP Code  : >>> {otp_code} <<<")
        print(f"  Expires In: 10 Minutes")
        print(f"  Notice    : Code logged for development. Configure live credentials in .env")
        print("=" * 60 + "\n")

        return {
            "success": True,
            "provider": "Development Sandbox Fallback",
            "recipient": clean_email,
            "dev_otp": otp_code,
        }


# Singleton instance
email_service = EmailService()
