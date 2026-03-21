import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <h1 className="text-5xl font-black gradient-text mb-2">Drop</h1>
        <p className="text-white/40">Sign in to view your past decisions</p>
      </div>
      <SignIn
        appearance={{
          elements: {
            rootBox: 'w-full max-w-md',
          },
        }}
      />
    </main>
  )
}
