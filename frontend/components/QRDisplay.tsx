'use client'

import { QRCodeSVG } from 'qrcode.react'

interface Props {
  roomId: string
}

export default function QRDisplay({ roomId }: Props) {
  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/join/${roomId}`
    : `/join/${roomId}`

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="bg-white p-4 rounded-2xl">
        <QRCodeSVG
          value={joinUrl}
          size={240}
          bgColor="#ffffff"
          fgColor="#0a0a0a"
          level="H"
        />
      </div>

      <div className="text-center">
        <p className="text-white/40 text-sm uppercase tracking-widest mb-2">Room Code</p>
        <div className="text-[#FF5C00] font-black text-6xl tracking-widest">{roomId}</div>
        <p className="text-white/40 mt-3 text-lg">
          drop.app/join/<span className="text-white">{roomId}</span>
        </p>
      </div>

      <p className="text-white/30 text-center text-sm max-w-xs">
        Scan QR or go to the URL above on your phone
      </p>
    </div>
  )
}
