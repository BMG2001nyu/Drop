import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Room = {
  id: string
  decision: string
  location: string | null
  status: 'waiting' | 'speaking' | 'reasoning' | 'done'
  current_speaker_role: string | null
  reasoning_stream: string | null
  final_decision: string | null
  final_reason: string | null
  host_id: string | null
  created_at: string
}

export type Player = {
  id: string
  room_id: string
  name: string
  role: string
  role_emoji: string
  role_label: string
  transcript: string | null
  has_spoken: boolean
  joined_at: string
}
