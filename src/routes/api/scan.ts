import { createFileRoute } from '@tanstack/react-router'
import Anthropic from '@anthropic-ai/sdk'

const PROMPT = `You are a wine expert analyzing an image of a wine list or wine shelf.

Your primary job is to READ text that is visible in the image — not to recall knowledge about wines.

CRITICAL RULES:
- For every field, only report what you can actually read from the image. Do NOT infer, estimate, or fill in from background knowledge about a producer or region.
- If a field's text is not clearly legible (too small, obscured, sideways, blurry), set that field to null.
- This especially applies to "grape" and "vintage" — these are frequently on small sub-labels. If you cannot clearly read the varietal or year, set it to null. A null is far better than a confident wrong answer.
- Set confidence to reflect how clearly you could read this specific wine's label, not how well you know the wine.

Extract every wine visible. For each wine include:
- id: sequential integer starting at 1
- name: wine name as shown (string)
- vintage: year as printed on the label, or null if not clearly legible (string | null)
- region: region as printed, or null if not clearly legible (string | null)
- grape: varietal or blend as printed on the label, or null if not clearly legible (string | null)
- price: price as shown including $ symbol, or null if not visible (string | null)
- priceNum: numeric price only, or null (number | null)
- confidence: 0-100, how clearly you could read this wine's label text in the image (integer)
- rating: estimated Wine Spectator / Wine Advocate score 85-100, based only on producer reputation if known — otherwise omit or estimate conservatively (integer)
- ratingLabel: one of "Popular pick" (85-87), "Widely praised" (88-89), "Excellent" (90-91), "Highly rated" (92-93), "Outstanding" (94-95), "Extraordinary" (96+)
- body: 0-100 scale, 0=very light, 100=very full — infer from grape/region if known, else use 50 (integer)
- sweetness: 0-100 scale, 0=bone dry, 100=very sweet (integer)
- tannin: 0-100 scale (integer)
- acidity: 0-100 scale (integer)
- tasting: one sentence tasting note (string)
- pairings: array of 3-4 food pairing strings
- retailers: array containing any of: "costco","trader_joes","whole_foods","grocery","restaurant","wine_shop"
- isValue: true if exceptional quality for the price (boolean)
- isCrowd: true if broadly approachable and crowd-pleasing (boolean)

Return ONLY a raw JSON object (no markdown, no code fences, no explanation) with this exact shape:
{
  "wines": [ ...wine objects as described above... ],
  "readability": "good",
  "retakeReasons": [],
  "message": ""
}

Set "readability" to:
- "good" — you could read most wines clearly
- "partial" — you could read some wines but the image cut off part of the list, or many labels were hard to read
- "unreadable" — no wine text could be reliably identified

Set "retakeReasons" to an array of zero or more of these strings that apply:
"too_blurry", "too_dark", "too_far", "glare", "angle_skewed", "label_cut_off", "not_a_wine_image", "list_too_dense"

Set "message" to a short user-facing note if readability is not "good", otherwise empty string.`

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
        const encoder = new TextEncoder()

        // Stream the Anthropic response directly back to the client.
        // This keeps the Cloudflare Worker response open for the full
        // duration of the LLM call instead of hitting the 30s wall-clock limit.
        const readable = new ReadableStream({
          async start(controller) {
            try {
              const stream = await client.messages.create({
                model: 'claude-sonnet-4-6',
                max_tokens: 4096,
                stream: true,
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

              for await (const event of stream) {
                if (
                  event.type === 'content_block_delta' &&
                  event.delta.type === 'text_delta'
                ) {
                  controller.enqueue(encoder.encode(event.delta.text))
                }
              }
            } catch (err) {
              console.error('Anthropic streaming error:', err)
              // Signal the client that something went wrong
              controller.enqueue(encoder.encode('\n{"__stream_error__":true}'))
            } finally {
              controller.close()
            }
          },
        })

        return new Response(readable, {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        })
      },
    },
  },
})
