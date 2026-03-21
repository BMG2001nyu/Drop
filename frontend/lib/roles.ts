export type Role = {
  id: string
  label: string
  emoji: string
  prompt: string
  description: string
  color: string
}

export const ROLES: Role[] = [
  {
    id: 'dealbreaker',
    label: 'The Dealbreaker',
    emoji: '🚫',
    prompt: 'State ONE hard non-negotiable. Something you absolutely cannot do or accept.',
    description: 'One hard non-negotiable',
    color: '#FF4444',
  },
  {
    id: 'realist',
    label: 'The Realist',
    emoji: '💸',
    prompt: 'Give us the practical constraints: budget, distance, time. Be specific with numbers.',
    description: 'Practical constraints: budget, distance, time',
    color: '#4CAF50',
  },
  {
    id: 'wildcard',
    label: 'The Wildcard',
    emoji: '🔥',
    prompt: 'Suggest something unexpected. What is the option nobody considered? Be bold.',
    description: 'An unexpected suggestion nobody considered',
    color: '#FF9800',
  },
  {
    id: 'advocate',
    label: 'The Advocate',
    emoji: '❤️',
    prompt: 'What does this group actually deserve right now? Argue for it passionately.',
    description: "What the group actually deserves right now",
    color: '#E91E63',
  },
  {
    id: 'mediator',
    label: 'The Mediator',
    emoji: '⚖️',
    prompt: 'Find the middle ground. What works for everyone? Bridge the gaps.',
    description: 'Finds middle ground between conflicts',
    color: '#9C27B0',
  },
  {
    id: 'closer',
    label: 'The Closer',
    emoji: '🎯',
    prompt: 'Check the energy. Is the group ready to commit? What is the final vibe?',
    description: 'Final energy and commitment check',
    color: '#FF5C00',
  },
]

export function assignRoles(playerCount: number): Role[] {
  // Start with all 6 roles, remove from end if fewer players
  const orderedRoles = [...ROLES]
  return orderedRoles.slice(0, Math.min(playerCount, ROLES.length))
}

export function getRoleById(id: string): Role | undefined {
  return ROLES.find(r => r.id === id)
}
