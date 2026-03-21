import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
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
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
