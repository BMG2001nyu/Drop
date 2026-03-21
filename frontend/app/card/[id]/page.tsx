import { createServerClient } from '@/lib/supabase-server'
import DecisionCard from '@/components/DecisionCard'
import type { Metadata } from 'next'

interface Props {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createServerClient()
  const { data: room } = await supabase
    .from('rooms')
    .select('final_decision, decision')
    .eq('id', params.id)
    .single()

  return {
    title: room?.final_decision ? `Drop decided: ${room.final_decision}` : 'Drop Decision Card',
    description: room?.decision || 'A group decision made with Drop',
    openGraph: {
      title: room?.final_decision ? `Drop decided: ${room.final_decision}` : 'Drop',
      description: room?.decision || 'A group decision made with Drop',
    },
  }
}

export default async function CardPage({ params }: Props) {
  const supabase = createServerClient()

  const [{ data: room }, { data: players }] = await Promise.all([
    supabase.from('rooms').select('*').eq('id', params.id).single(),
    supabase.from('players').select('*').eq('room_id', params.id).order('joined_at', { ascending: true }),
  ])

  if (!room) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <p className="text-white/40 text-2xl">Decision card not found</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4 py-16">
      <DecisionCard room={room as any} players={(players || []) as any} />
    </main>
  )
}
