import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getRoleById } from '@/lib/roles'

export async function POST(req: Request) {
  try {
    const { playerId, roomId, newRoleId } = await req.json()

    if (!playerId || !roomId || !newRoleId) {
      return NextResponse.json({ error: 'playerId, roomId, and newRoleId are required' }, { status: 400 })
    }

    const supabase = createServerClient()

    // Verify room is still in 'waiting' status — roles lock once Drop starts
    const { data: room } = await supabase
      .from('rooms')
      .select('id, status')
      .eq('id', roomId.toUpperCase())
      .single()

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    if (room.status !== 'waiting') {
      return NextResponse.json({ error: 'Roles are locked once the Drop has started' }, { status: 400 })
    }

    // Validate the requested role exists
    const newRole = getRoleById(newRoleId)
    if (!newRole) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Verify the new role isn't taken by another player
    const { data: players } = await supabase
      .from('players')
      .select('id, role')
      .eq('room_id', room.id)

    const takenByOther = players?.some(p => p.role === newRoleId && p.id !== playerId)
    if (takenByOther) {
      return NextResponse.json({ error: 'That role is already taken' }, { status: 409 })
    }

    // Update the player's role
    const { data: updatedPlayer, error } = await supabase
      .from('players')
      .update({
        role: newRole.id,
        role_emoji: newRole.emoji,
        role_label: newRole.label,
      })
      .eq('id', playerId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ player: updatedPlayer, role: newRole })
  } catch (err) {
    console.error('Change role error:', err)
    return NextResponse.json({ error: 'Failed to change role' }, { status: 500 })
  }
}
