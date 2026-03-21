import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(req: Request) {
  try {
    const { playerId, transcript, roomId } = await req.json()

    if (!playerId || !transcript || !roomId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServerClient()

    // Save transcript and mark as spoken
    const { error: playerError } = await supabase
      .from('players')
      .update({ transcript: transcript.trim(), has_spoken: true })
      .eq('id', playerId)

    if (playerError) throw playerError

    // Check if all players have spoken
    const { data: players } = await supabase
      .from('players')
      .select('has_spoken')
      .eq('room_id', roomId)

    const allSpoken = players?.every(p => p.has_spoken)

    if (allSpoken && players && players.length > 0) {
      // Trigger reasoning phase
      await supabase
        .from('rooms')
        .update({ status: 'reasoning' })
        .eq('id', roomId)
    }

    return NextResponse.json({ success: true, allSpoken })
  } catch (err) {
    console.error('Submit transcript error:', err)
    return NextResponse.json({ error: 'Failed to submit transcript' }, { status: 500 })
  }
}
