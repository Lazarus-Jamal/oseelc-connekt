import { NextRequest, NextResponse } from 'next/server'
import { sendPushToUsers } from '@/lib/push'

// HTTP endpoint pour déclencher un push depuis l'extérieur si nécessaire
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.INTERNAL_API_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { userIds, payload } = await req.json()
  const result = await sendPushToUsers(userIds, payload)
  return NextResponse.json(result)
}
