import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const inter = Inter({ subsets: ['latin'], weight: ['400', '600', '700', '900'] })

export const metadata: Metadata = {
  title: 'Drop — Stop Debating. Start Deciding.',
  description: 'Turn 6 voices of chaos into one decision in 60 seconds.',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'Drop — Stop Debating. Start Deciding.',
    description: 'Turn 6 voices of chaos into one decision in 60 seconds.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#FF5C00',
          colorBackground: '#111111',
          colorInputBackground: '#1a1a1a',
          colorText: '#ffffff',
          colorTextSecondary: '#666666',
          borderRadius: '12px',
          fontFamily: 'Inter, sans-serif',
        },
        elements: {
          card: 'bg-[#111111] border border-white/10',
          headerTitle: 'text-white font-black',
          headerSubtitle: 'text-white/60',
          formButtonPrimary: 'bg-[#FF5C00] hover:bg-[#FF8C00] text-white',
          footerActionLink: 'text-[#FF5C00] hover:text-[#FF8C00]',
          footerActionText: 'text-white/50',
          socialButtonsBlockButton: 'border border-white/20 bg-white/5 text-white hover:bg-white/10',
          socialButtonsBlockButtonText: 'text-white font-medium',
          dividerLine: 'bg-white/10',
          dividerText: 'text-white/40',
          formFieldLabel: 'text-white/70',
          formFieldInput: 'text-white bg-[#1a1a1a] border-white/20 focus:border-[#FF5C00]',
          formFieldInputShowPasswordButton: 'text-white/50',
          otpCodeFieldInput: 'text-white bg-[#1a1a1a] border-white/20',
          identityPreviewText: 'text-white/70',
          identityPreviewEditButton: 'text-[#FF5C00]',
          formResendCodeLink: 'text-[#FF5C00]',
          alertText: 'text-white/70',
          formFieldErrorText: 'text-red-400',
        },
      }}
    >
      <html lang="en">
        <body className={inter.className}>{children}</body>
      </html>
    </ClerkProvider>
  )
}
