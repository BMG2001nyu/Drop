import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { ROLES } from '@/lib/roles'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const roomId = searchParams.get('roomId')

    if (!roomId) {
      return NextResponse.json({ error: 'roomId is required' }, { status: 400 })
    }

    const supabase = createServerClient()

    // Verify room exists
    const { data: room } = await supabase
      .from('rooms')
      .select('id, status')
      .eq('id', roomId.toUpperCase())
      .single()

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    // Get all roles currently occupied in the room
    const { data: players } = await supabase
      .from('players')
      .select('role')
      .eq('room_id', room.id)

    const usedRoles = new Set(players?.map(p => p.role) || [])
    const availableRoles = ROLES.filter(r => !usedRoles.has(r.id))

    return NextResponse.json({ availableRoles, roomStatus: room.status })
  } catch (err) {
    console.error('Available roles error:', err)
    return NextResponse.json({ error: 'Failed to fetch available roles' }, { status: 500 })
  }
}
