import { createFileRoute } from '@tanstack/react-router'
import Anthropic from '@anthropic-ai/sdk'

const PROMPT = `You are a wine expert analyzing an image of a wine list or wine shelf.

Extract every wine name visible and return a JSON array. For each wine include:
- id: sequential integer starting at 1
- name: wine name as shown (string)
- vintage: year visible or your best estimate (string, e.g. "2022")
- region: wine region (string)
- grape: primary grape or blend description (string)
- price: price as shown including $ symbol, or null if not visible (string | null)
- priceNum: numeric price only, or null (number | null)
- rating: estimated Wine Spectator / Wine Advocate score 85-100 (integer)
- ratingLabel: one of "Popular pick" (85-87), "Widely praised" (88-89), "Excellent" (90-91), "Highly rated" (92-93), "Outstanding" (94-95), "Extraordinary" (96+)
- body: 0-100 scale, 0=very light, 100=very full (integer)
- sweetness: 0-100 scale, 0=bone dry, 100=very sweet (integer)
- tannin: 0-100 scale (integer)
- acidity: 0-100 scale (integer)
- tasting: one sentence tasting note (string)
- pairings: array of 3-4 food pairing strings
- retailers: array containing any of: "costco","trader_joes","whole_foods","grocery","restaurant","wine_shop"
- isValue: true if exceptional quality for the price (boolean)
- isCrowd: true if broadly approachable and crowd-pleasing (boolean)

Return ONLY the raw JSON array with no markdown, no code fences, no explanation.`

export const Route = createFileRoute('/api/scan')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { image: string; mimeType?: string }

        try {
          body = await request.json()
        } catch {
          return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
        }

        const { image, mimeType = 'image/jpeg' } = body

        if (!image) {
          return Response.json({ error: 'Missing image field (base64)' }, { status: 400 })
        }

        const apiKey = process.env.ANTHROPIC_API_KEY
        if (!apiKey) {
          return Response.json({ error: 'Server misconfiguration' }, { status: 500 })
        }

        const client = new Anthropic({ apiKey })

        let raw: string
        try {
          const response = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 4096,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'image',
                    source: {
                      type: 'base64',
                      media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
                      data: image,
                    },
                  },
                  { type: 'text', text: PROMPT },
                ],
              },
            ],
          })

          raw = response.content[0].type === 'text' ? response.content[0].text : ''
        } catch (err) {
          console.error('Anthropic error:', err)
          return Response.json({ error: 'Vision analysis failed' }, { status: 502 })
        }

        let wines: unknown[]
        try {
          const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
          wines = JSON.parse(cleaned)
          if (!Array.isArray(wines)) throw new Error('Not an array')
        } catch {
          console.error('Parse error. Raw response:', raw)
          return Response.json({ error: 'Failed to parse wine data', raw }, { status: 500 })
        }

        return Response.json({ wines }, { status: 200 })
      },
    },
  },
})
