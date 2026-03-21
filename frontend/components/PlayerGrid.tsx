'use client'

import { ROLES } from '@/lib/roles'
import type { Player } from '@/lib/supabase'
import RoleCard from '@/components/RoleCard'

interface Props {
  players: Player[]
  showSpeaking?: boolean
  currentRole?: string | null
}

export default function PlayerGrid({ players, showSpeaking, currentRole }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {ROLES.map((role) => {
        const player = players.find(p => p.role === role.id)
        const isCurrent = showSpeaking && currentRole === role.id

        return (
          <RoleCard
            key={role.id}
            role={role}
            playerName={player?.name}
            revealed={!!player}
            isCurrent={!!isCurrent}
            hasSpoken={player?.has_spoken}
            transcript={player?.transcript}
          />
        )
      })}
    </div>
  )
}
