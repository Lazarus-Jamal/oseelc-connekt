import { prisma } from '@/lib/db'

type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT'

export async function recordAudit({
  userId,
  action,
  entityType,
  entityId,
  oldValues,
  newValues,
  ipAddress,
  userAgent,
}: {
  userId: string
  action: AuditAction
  entityType: string
  entityId?: string
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        oldValues: (oldValues ?? undefined) as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        newValues: (newValues ?? undefined) as any,
        ipAddress,
        userAgent,
      },
    })
  } catch {
    // Audit failures must never break the main operation
  }
}

export function getClientInfo(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for')
  const ipAddress = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
  const userAgent = req.headers.get('user-agent') ?? undefined
  return { ipAddress, userAgent }
}
