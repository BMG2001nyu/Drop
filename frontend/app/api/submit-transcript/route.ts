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

    // Get all players in join order to determine next speaker
    const { data: players } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true })

    const allSpoken = players?.every(p => p.has_spoken)

    if (allSpoken && players && players.length > 0) {
      // All done — trigger reasoning phase
      await supabase
        .from('rooms')
        .update({ status: 'reasoning' })
        .eq('id', roomId)
    } else {
      // Advance to next player who hasn't spoken
      const nextPlayer = players?.find(p => !p.has_spoken)
      if (nextPlayer) {
        await supabase
          .from('rooms')
          .update({ current_speaker_role: nextPlayer.role })
          .eq('id', roomId)
      }
    }

    return NextResponse.json({ success: true, allSpoken })
  } catch (err) {
    console.error('Submit transcript error:', err)
    return NextResponse.json({ error: 'Failed to submit transcript' }, { status: 500 })
  }
}
