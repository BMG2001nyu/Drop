import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <h1 className="text-5xl font-black gradient-text mb-2">Drop</h1>
        <p className="text-white/40">Create an account to save your decisions</p>
      </div>
      <SignUp
        appearance={{
          elements: {
            rootBox: 'w-full max-w-md',
          },
        }}
      />
    </main>
  )
}
