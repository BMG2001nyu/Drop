import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { generateRoomCode } from '@/lib/room-codes'

export async function POST(req: Request) {
  try {
    const { decision, location } = await req.json()

    if (!decision?.trim()) {
      return NextResponse.json({ error: 'Decision is required' }, { status: 400 })
    }

    const supabase = createServerClient()
    const roomId = generateRoomCode()

    const { error } = await supabase
      .from('rooms')
      .insert({
        id: roomId,
        decision: decision.trim(),
        location: location?.trim() || null,
        status: 'waiting',
      })

    if (error) throw error

    return NextResponse.json({ roomId })
  } catch (err) {
    console.error('Create room error:', err)
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 })
  }
}
