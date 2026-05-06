import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sendMail, otpEmailHtml } from '@/lib/mailer'
import crypto from 'crypto'

function generateOTP() {
  return crypto.randomInt(100000, 999999).toString()
}

// GET: Get 2FA status for current user
export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const user = await (prisma.user.findUnique as any)({
    where: { id: session.user.id },
    select: { twoFAEnabled: true, email: true },
  })

  return NextResponse.json({ success: true, data: { enabled: (user as any)?.twoFAEnabled ?? false, email: user?.email } })
}

// POST: Send OTP or toggle 2FA
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const action = body.action as 'send_otp' | 'verify_otp'

  const user: any = await (prisma.user.findUnique as any)({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, twoFAEnabled: true, twoFAOtp: true, twoFAOtpExpiry: true },
  })
  if (!user) return NextResponse.json({ success: false, error: 'Utilisateur introuvable' }, { status: 404 })

  if (action === 'send_otp') {
    const otp = generateOTP()
    const expiry = new Date(Date.now() + 10 * 60 * 1000)

    await (prisma.user.update as any)({
      where: { id: user.id },
      data: { twoFAOtp: otp, twoFAOtpExpiry: expiry },
    })

    try {
      await sendMail({
        to: user.email,
        subject: 'Code de vérification — Oseelc-connekt',
        html: otpEmailHtml(otp, user.name),
      })
    } catch {
      return NextResponse.json({ success: false, error: 'Impossible d\'envoyer l\'email. Vérifiez la configuration SMTP.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: `Code envoyé à ${user.email}` })
  }

  if (action === 'verify_otp') {
    const { otp } = body
    if (!otp) return NextResponse.json({ success: false, error: 'Code manquant' }, { status: 400 })

    if (!user.twoFAOtp || !user.twoFAOtpExpiry) {
      return NextResponse.json({ success: false, error: 'Aucun code en attente' }, { status: 400 })
    }
    if (new Date() > new Date(user.twoFAOtpExpiry)) {
      return NextResponse.json({ success: false, error: 'Code expiré' }, { status: 400 })
    }
    if (user.twoFAOtp !== String(otp)) {
      return NextResponse.json({ success: false, error: 'Code incorrect' }, { status: 400 })
    }

    const newState = !user.twoFAEnabled
    await (prisma.user.update as any)({
      where: { id: user.id },
      data: { twoFAEnabled: newState, twoFAOtp: null, twoFAOtpExpiry: null },
    })

    return NextResponse.json({ success: true, data: { enabled: newState } })
  }

  return NextResponse.json({ success: false, error: 'Action invalide' }, { status: 400 })
}
