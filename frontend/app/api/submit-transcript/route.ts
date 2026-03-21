import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(req: Request) {
  try {
    const { playerId, transcript, roomId } = await req.json()

    if (!playerId || !roomId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServerClient()

    // Save transcript and mark as spoken
    const { error: playerError } = await supabase
      .from('players')
      .update({
        transcript: (transcript || "I'm not sure, whatever the group wants.").trim(),
        has_spoken: true,
      })
      .eq('id', playerId)

    if (playerError) throw playerError

    // Find next player who hasn't spoken yet (exclude current — DB may not have updated yet)
    const { data: remaining } = await supabase
      .from('players')
      .select('role')
      .eq('room_id', roomId)
      .eq('has_spoken', false)
      .neq('id', playerId)
      .order('joined_at', { ascending: true })
      .limit(1)

    if (!remaining || remaining.length === 0) {
      // Everyone has spoken — move to reasoning
      await supabase
        .from('rooms')
        .update({ status: 'reasoning', current_speaker_role: null })
        .eq('id', roomId)

      return NextResponse.json({ success: true, allSpoken: true })
    }

    // Advance to the next speaker
    const nextRole = remaining[0].role
    await supabase
      .from('rooms')
      .update({ current_speaker_role: nextRole })
      .eq('id', roomId)

    return NextResponse.json({ success: true, allSpoken: false, nextRole })
  } catch (err) {
    console.error('Submit transcript error:', err)
    return NextResponse.json({ error: 'Failed to submit transcript' }, { status: 500 })
  }
}
