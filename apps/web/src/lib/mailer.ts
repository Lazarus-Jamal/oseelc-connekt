import nodemailer from 'nodemailer'

let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT ?? '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  }
  return transporter
}

export async function sendMail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  const from = process.env.SMTP_FROM ?? 'Oseelc-connekt <noreply@oseelc.org>'
  await getTransporter().sendMail({ from, to, subject, html })
}

export function otpEmailHtml(otp: string, userName: string) {
  return `
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:24px;">
  <div style="max-width:480px;margin:0 auto;background:white;border-radius:16px;border:1px solid #e2e8f0;padding:32px;">
    <div style="background:#0f766e;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
      <h1 style="color:white;margin:0;font-size:18px;">Oseelc-connekt</h1>
    </div>
    <h2 style="color:#1e293b;font-size:20px;margin:0 0 8px;">Code de vérification</h2>
    <p style="color:#64748b;font-size:14px;margin:0 0 24px;">Bonjour ${userName},<br/>Voici votre code de connexion à usage unique. Il expire dans <strong>10 minutes</strong>.</p>
    <div style="background:#f0fdf4;border:2px solid #14b8a6;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
      <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#0f766e;">${otp}</span>
    </div>
    <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0;">Si vous n'avez pas demandé ce code, ignorez cet email.</p>
  </div>
</body>
</html>`
}
