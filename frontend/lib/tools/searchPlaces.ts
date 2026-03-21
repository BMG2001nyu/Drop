export interface Place {
  name: string
  address: string
  rating?: number
  priceLevel?: number   // 0–4 (free → very expensive)
  isOpen?: boolean
  googleMapsUri?: string
}

const PRICE_MAP: Record<string, number> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
}

export async function searchPlaces(query: string, location: string): Promise<Place[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return []

  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask':
          'places.displayName,places.formattedAddress,places.rating,places.priceLevel,places.currentOpeningHours,places.googleMapsUri',
      },
      body: JSON.stringify({
        textQuery: `${query} near ${location}`,
        maxResultCount: 5,
      }),
    })

    if (!res.ok) return []
    const data = await res.json()

    return (data.places ?? []).map((p: any) => ({
      name: p.displayName?.text ?? 'Unknown',
      address: p.formattedAddress ?? '',
      rating: p.rating,
      priceLevel: p.priceLevel ? (PRICE_MAP[p.priceLevel] ?? 2) : undefined,
      isOpen: p.currentOpeningHours?.openNow,
      googleMapsUri: p.googleMapsUri,
    }))
  } catch {
    return []
  }
}

// Tool definition for Gemini function calling
export const SEARCH_PLACES_TOOL = {
  name: 'searchPlaces',
  description:
    'Search for real, currently open places — restaurants, bars, venues — near a location. Use this whenever the group needs a specific place recommendation.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description:
          'What to search for, informed by player constraints (e.g. "affordable ramen restaurants", "rooftop bars under $30")',
      },
      location: {
        type: 'string',
        description: 'The neighbourhood or city to search near',
      },
    },
    required: ['query', 'location'],
  },
}
