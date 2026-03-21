import { auth, currentUser } from '@clerk/nextjs/server'
import { createServerClient } from '@/lib/supabase-server'
import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'

export const metadata = {
  title: 'Your Drops — Dashboard',
}

export default async function DashboardPage() {
  const { userId } = await auth()
  const user = await currentUser()
  const supabase = createServerClient()

  // Fetch all rooms this user created
  const { data: rooms } = await supabase
    .from('rooms')
    .select('*, players(id, name, role_label, role_emoji, transcript)')
    .eq('host_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)

  const firstName = user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'Host'

  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="border-b border-white/5 px-8 py-5 flex items-center justify-between max-w-5xl mx-auto">
        <Link href="/" className="text-3xl font-black gradient-text">Drop</Link>
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-white/40 hover:text-white text-sm transition-colors"
          >
            + New Drop
          </Link>
          <UserButton
            appearance={{
              elements: {
                avatarBox: 'w-9 h-9',
              },
            }}
          />
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-8 py-12">
        {/* Title */}
        <div className="mb-10">
          <h1 className="text-4xl font-black text-white mb-2">
            Hey {firstName} 👋
          </h1>
          <p className="text-white/40 text-lg">
            {rooms && rooms.length > 0
              ? `You've run ${rooms.length} Drop${rooms.length === 1 ? '' : 's'}`
              : "You haven't run any Drops yet"}
          </p>
        </div>

        {/* Empty state */}
        {(!rooms || rooms.length === 0) && (
          <div className="text-center py-24 border border-white/5 rounded-3xl">
            <div className="text-6xl mb-4">🎯</div>
            <h2 className="text-2xl font-bold text-white mb-3">No Drops yet</h2>
            <p className="text-white/40 mb-8 max-w-sm mx-auto">
              Start your first Drop and your group&apos;s decisions will appear here.
            </p>
            <Link
              href="/"
              className="inline-block bg-[#FF5C00] hover:bg-[#FF8C00] text-white font-bold px-8 py-4 rounded-2xl transition-all duration-200"
            >
              Start a Drop →
            </Link>
          </div>
        )}

        {/* Rooms grid */}
        {rooms && rooms.length > 0 && (
          <div className="space-y-4">
            {rooms.map((room) => {
              const decidedAt = new Date(room.created_at)
              const timeAgo = formatTimeAgo(decidedAt)

              return (
                <div
                  key={room.id}
                  className="bg-[#111111] border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Status + time */}
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`text-xs font-bold uppercase tracking-widest px-2 py-1 rounded-full ${
                          room.status === 'done'
                            ? 'bg-green-500/10 text-green-400'
                            : room.status === 'reasoning'
                              ? 'bg-[#FF5C00]/10 text-[#FF5C00]'
                              : 'bg-white/5 text-white/40'
                        }`}>
                          {room.status === 'done' ? '✓ Decided' : room.status === 'reasoning' ? '⟳ Deciding' : room.status}
                        </span>
                        <span className="text-white/30 text-sm">{timeAgo}</span>
                        <span className="text-white/20 text-sm">#{room.id}</span>
                      </div>

                      {/* The question */}
                      <h3 className="text-white font-bold text-lg mb-1 truncate">{room.decision}</h3>
                      {room.location && (
                        <p className="text-white/40 text-sm mb-3">📍 {room.location}</p>
                      )}

                      {/* Decision */}
                      {room.final_decision && (
                        <div className="mb-4">
                          <p className="text-[#FF5C00] font-black text-xl">{room.final_decision}</p>
                          {room.final_reason && (
                            <p className="text-white/50 text-sm italic mt-1 line-clamp-2">&ldquo;{room.final_reason}&rdquo;</p>
                          )}
                        </div>
                      )}

                      {/* Players */}
                      {room.players && room.players.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {room.players.map((p: { id: string; name: string; role_emoji: string; role_label: string }) => (
                            <span
                              key={p.id}
                              className="text-xs bg-white/5 border border-white/10 rounded-full px-3 py-1 text-white/60"
                            >
                              {p.role_emoji} {p.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 shrink-0">
                      {room.status === 'done' && (
                        <Link
                          href={`/card/${room.id}`}
                          className="text-sm bg-[#FF5C00]/10 hover:bg-[#FF5C00]/20 text-[#FF5C00] font-semibold px-4 py-2 rounded-xl transition-all duration-200 text-center"
                        >
                          View Card →
                        </Link>
                      )}
                      {room.status === 'waiting' && (
                        <Link
                          href={`/room/${room.id}`}
                          className="text-sm bg-white/5 hover:bg-white/10 text-white font-semibold px-4 py-2 rounded-xl transition-all duration-200 text-center"
                        >
                          Open Room →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Footer CTA */}
        {rooms && rooms.length > 0 && (
          <div className="mt-10 text-center">
            <Link
              href="/"
              className="inline-block bg-[#FF5C00] hover:bg-[#FF8C00] text-white font-bold px-8 py-4 rounded-2xl transition-all duration-200 orange-glow hover:scale-[1.02]"
            >
              Start a New Drop →
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'yesterday'
  return `${days}d ago`
}
