import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { assignRoles } from '@/lib/roles'

export async function POST(req: Request) {
  try {
    const { roomId, playerName } = await req.json()

    if (!roomId || !playerName?.trim()) {
      return NextResponse.json({ error: 'Room ID and name are required' }, { status: 400 })
    }

    const supabase = createServerClient()

    // Check room exists and is in waiting status
    const { data: room } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId.toUpperCase())
      .single()

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    if (room.status !== 'waiting') {
      return NextResponse.json({ error: 'This Drop has already started' }, { status: 400 })
    }

    // Get current players to determine role
    const { data: existingPlayers } = await supabase
      .from('players')
      .select('role')
      .eq('room_id', room.id)

    const currentCount = existingPlayers?.length || 0

    if (currentCount >= 6) {
      return NextResponse.json({ error: 'Room is full (max 6 players)' }, { status: 400 })
    }

    // Assign role based on position
    const allRoles = assignRoles(6)
    const usedRoles = new Set(existingPlayers?.map(p => p.role) || [])
    const availableRoles = allRoles.filter(r => !usedRoles.has(r.id))
    const assignedRole = availableRoles[0]

    // Create player
    const { data: player, error } = await supabase
      .from('players')
      .insert({
        room_id: room.id,
        name: playerName.trim(),
        role: assignedRole.id,
        role_emoji: assignedRole.emoji,
        role_label: assignedRole.label,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      player,
      room: { id: room.id, decision: room.decision, location: room.location },
      role: assignedRole,
    })
  } catch (err) {
    console.error('Join room error:', err)
    return NextResponse.json({ error: 'Failed to join room' }, { status: 500 })
  }
}
