import { Show, UserButton, SignInButton } from '@clerk/nextjs'
import Link from 'next/link'
import HomeForm from '@/components/HomeForm'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-radial from-orange-500/5 via-transparent to-transparent pointer-events-none" />

      {/* Top-right auth nav */}
      <div className="fixed top-5 right-6 z-20 flex items-center gap-3">
        <Show when="signed-out">
          <SignInButton mode="modal">
            <button className="text-white/40 hover:text-white text-sm font-medium transition-colors px-4 py-2 rounded-xl hover:bg-white/5">
              Sign in
            </button>
          </SignInButton>
        </Show>
        <Show when="signed-in">
          <Link
            href="/dashboard"
            className="text-white/40 hover:text-[#FF5C00] text-sm font-medium transition-colors px-4 py-2 rounded-xl hover:bg-white/5"
          >
            My Drops
          </Link>
          <UserButton
            appearance={{
              elements: { avatarBox: 'w-8 h-8' },
            }}
          />
        </Show>
      </div>

      <div className="w-full max-w-lg relative z-10">
        {/* Logo */}
        <div className="text-center mb-12">
          <h1 className="text-8xl font-black gradient-text tracking-tighter mb-4">
            Drop
          </h1>
          <p className="text-2xl text-white/60 font-medium">
            Stop debating. Start deciding.
          </p>
        </div>

        {/* Form */}
        <HomeForm />

        {/* Footer */}
        <div className="mt-12 text-center text-white/30 text-sm">
          <p>Built for Zero to Agent: Vercel × Deepmind NYC</p>
          <p className="mt-1">Powered by Gemini · Supabase · ElevenLabs · Vercel</p>
        </div>
      </div>
    </main>
  )
}
