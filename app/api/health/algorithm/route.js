import { NextResponse } from 'next/server'
import { getLatestTimestamp } from '@/app/lib/queryAllChains'

export async function GET() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
    return NextResponse.json({ error: 'Supabase env vars not set' }, { status: 503 })
  }

  const lastTs = await getLatestTimestamp()
  const now = Date.now()
  const active = lastTs > 0 && (now - lastTs) <= 120 * 60 * 1000 // Active if transaction within last 2 hours

  return NextResponse.json({ active, lastTs: lastTs || null })
}
