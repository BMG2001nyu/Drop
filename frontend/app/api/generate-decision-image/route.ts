import { NextResponse } from 'next/server'

const GEMINI_IMAGE_MODEL = 'gemini-2.0-flash-preview-image-generation'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent`

export async function POST(req: Request) {
  try {
    const { decision, finalDecision } = await req.json()

    const prompt = `Cinematic, dramatic, high-contrast photograph for a group decision: "${finalDecision || decision}".
    Epic lighting, dark moody atmosphere, vivid colors, photorealistic, ultra-detailed.
    No text, no words, no letters. Pure visual impact.
    Shot like a movie poster. Deep blacks, intense highlights.`

    const res = await fetch(`${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['IMAGE'] },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Gemini image error:', err)
      return NextResponse.json({ error: 'Image generation failed' }, { status: 502 })
    }

    const data = await res.json()
    const part = data?.candidates?.[0]?.content?.parts?.find(
      (p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData
    )

    if (!part?.inlineData) {
      return NextResponse.json({ error: 'No image returned' }, { status: 502 })
    }

    return NextResponse.json({
      imageBase64: part.inlineData.data,
      mimeType: part.inlineData.mimeType,
    })
  } catch (err) {
    console.error('generate-decision-image error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
