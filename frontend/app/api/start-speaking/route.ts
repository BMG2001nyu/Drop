import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(req: Request) {
  try {
    const { roomId } = await req.json()
    const supabase = createServerClient()

    // Get players and determine speaking order
    const { data: players } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true })

    if (!players || players.length < 2) {
      return NextResponse.json({ error: 'Need at least 2 players' }, { status: 400 })
    }

    // Start speaking phase with first role
    const firstPlayer = players[0]

    await supabase
      .from('rooms')
      .update({
        status: 'speaking',
        current_speaker_role: firstPlayer.role,
      })
      .eq('id', roomId)

    return NextResponse.json({ success: true, firstRole: firstPlayer.role })
  } catch (err) {
    console.error('Start speaking error:', err)
    return NextResponse.json({ error: 'Failed to start speaking round' }, { status: 500 })
  }
}
