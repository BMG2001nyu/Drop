export type VerificationStatus = 'verified' | 'warning' | 'unverified'

export interface VerificationResult {
  status: VerificationStatus
  message: string
  rating?: number
}

const PRICE_MAP: Record<string, number> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
}

export async function verifyPlace(
  placeName: string,
  location: string | null
): Promise<VerificationResult> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return { status: 'warning', message: "Couldn't confirm — call ahead" }

  try {
    const query = location ? `${placeName} ${location}` : placeName
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask':
          'places.displayName,places.currentOpeningHours,places.priceLevel,places.rating',
      },
      body: JSON.stringify({ textQuery: query, maxResultCount: 1 }),
    })

    if (!res.ok) return { status: 'warning', message: "Couldn't confirm — call ahead" }
    const data = await res.json()

    if (!data.places?.length) {
      return { status: 'unverified', message: "Couldn't find this place — double-check it exists" }
    }

    const place = data.places[0]
    const isOpen: boolean | undefined = place.currentOpeningHours?.openNow

    if (isOpen === false) {
      return {
        status: 'warning',
        message: 'Currently closed — check hours before heading out',
        rating: place.rating,
      }
    }

    if (isOpen === true) {
      return {
        status: 'verified',
        message: 'Verified open right now',
        rating: place.rating,
      }
    }

    // openNow not available (hours not listed)
    return {
      status: 'warning',
      message: "Couldn't confirm hours — call ahead",
      rating: place.rating,
    }
  } catch {
    return { status: 'warning', message: "Couldn't confirm — call ahead" }
  }
}
