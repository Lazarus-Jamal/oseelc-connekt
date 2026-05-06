import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@care-connekt/db'
import bcrypt from 'bcryptjs'
import { recordAudit } from '@/lib/audit'

const SESSION_SHORT = 8 * 60 * 60        // 8 heures
const SESSION_LONG  = 30 * 24 * 60 * 60  // 30 jours

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: SESSION_LONG },
  pages: { signIn: '/login', error: '/login' },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:      { label: 'Email',            type: 'email'    },
        password:   { label: 'Mot de passe',     type: 'password' },
        rememberMe: { label: 'Se souvenir',      type: 'text'     },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            role: true,
            isActive: true,
            organizationId: true,
            regionId: true,
            facilityId: true,
            avatarUrl: true,
          },
        })

        if (!user || !user.isActive) return null

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!isValid) return null

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })

        recordAudit({ userId: user.id, action: 'LOGIN', entityType: 'session' }).catch(() => {})

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
          regionId: user.regionId,
          facilityId: user.facilityId,
          avatarUrl: user.avatarUrl,
          rememberMe: credentials.rememberMe === 'true',
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id             = user.id
        token.role           = (user as any).role
        token.organizationId = (user as any).organizationId
        token.regionId       = (user as any).regionId
        token.facilityId     = (user as any).facilityId
        token.avatarUrl      = (user as any).avatarUrl
        // Durée de session selon "se souvenir de moi"
        const maxAge = (user as any).rememberMe ? SESSION_LONG : SESSION_SHORT
        token.exp = Math.floor(Date.now() / 1000) + maxAge
      }
      return token
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        id:             token.id as string,
        role:           token.role as string,
        organizationId: token.organizationId as string | null,
        regionId:       token.regionId as string | null,
        facilityId:     token.facilityId as string | null,
        avatarUrl:      token.avatarUrl as string | null,
      }
      return session
    },
  },
}
