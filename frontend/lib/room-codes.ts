const ADJECTIVES = [
  'TIGER', 'SOLAR', 'AMBER', 'NEON', 'SWIFT', 'BOLD', 'CRISP', 'WILD',
  'LASER', 'STORM', 'BLAZE', 'FROST', 'NOVA', 'APEX', 'FLUX', 'GLOW'
]

export function generateRoomCode(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const num = Math.floor(Math.random() * 9) + 1
  return `${adj}-${num}`
}
