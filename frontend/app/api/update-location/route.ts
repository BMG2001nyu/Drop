import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(req: Request) {
  try {
    const { roomId, location } = await req.json()
    if (!roomId || !location) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    const supabase = createServerClient()
    await supabase.from('rooms').update({ location }).eq('id', roomId)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update location' }, { status: 500 })
  }
}
