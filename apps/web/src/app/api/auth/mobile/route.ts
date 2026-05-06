import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'care-connekt-secret-change-me')

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ success: false, error: 'Email et mot de passe requis' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true, email: true, name: true, passwordHash: true, role: true,
      isActive: true, organizationId: true, regionId: true, facilityId: true, avatarUrl: true,
    },
  })

  if (!user || !user.isActive) {
    return NextResponse.json({ success: false, error: 'Identifiants incorrects' }, { status: 401 })
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    return NextResponse.json({ success: false, error: 'Identifiants incorrects' }, { status: 401 })
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })

  const token = await new SignJWT({
    id: user.id,
    email: user.email,
    role: user.role,
    facilityId: user.facilityId,
    regionId: user.regionId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret)

  const { passwordHash, ...safeUser } = user

  return NextResponse.json({ success: true, token, user: safeUser })
}
