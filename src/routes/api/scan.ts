import { createFileRoute } from '@tanstack/react-router'
import Anthropic from '@anthropic-ai/sdk'

const PROMPT = `You are reading text from a photo of a wine list, menu, or physical wine bottles on a shelf.
Extract every wine visible. Report ONLY what you can directly read — do not infer, estimate, or fill in from memory.

CRITICAL RULE FOR SHELF PHOTOS: Only report wines whose name you can read directly on a physical bottle's own label (the paper or printed label attached to the bottle body or neck). Do NOT report a wine based solely on a shelf edge tag, price card, or shelf talker — those describe what a store intends to stock, but the slot may be empty or sold out. A wine only counts if you can see and read its label on an actual bottle in the image. If a shelf edge tag names a wine but no bottle with a matching label is visible above it, skip that wine entirely.

For each wine return:
- id: sequential integer starting at 1
- name: wine name as printed on the bottle label (string)
- vintage: year as printed on the bottle label, or null if not legible (string | null)
- region: region as printed on the bottle label, or null if not legible (string | null)
- grape: varietal as printed on the bottle label, or null if not legible (string | null)
- price: the shelf edge price tag price visible below or beside this bottle. Read the shelf tag — NOT any price text on the wine label itself. Include $ symbol. null if no price tag is visible. For wine lists/menus, read the price next to the wine name. (string | null)
- priceNum: numeric value of price only (no $ or currency), or null (number | null)
- confidence: 0-100, how clearly you could read this bottle's label (integer)
- truncated: true if the bottle label appears cut off at the image boundary, else false (boolean)

IMPORTANT: Every wine entry MUST include a producer or winery name readable on the bottle. If you can only read a grape variety (e.g. "Pinot Noir") or variety + vintage without a producer name on the bottle label, skip that entry.

Return ONLY raw JSON (no markdown, no code fences):
{
  "wines": [ ...wine objects... ],
  "readability": "good",
  "retakeReasons": [],
  "message": "",
  "scanType": "list"
}

readability: "good" = read most clearly | "partial" = some unclear or cut off | "unreadable" = no wine text found
retakeReasons — zero or more of: "too_blurry","too_dark","too_far","glare","angle_skewed","label_cut_off","not_a_wine_image","list_too_dense"
message: short user-facing note if readability is not "good", else empty string.
scanType: "shelf" if physical wine bottles are visible and you are reading their labels directly (bottles on a rack, shelf, table, or held in hand). "list" if wines appear as text on a menu, wine list, chalkboard, screen, or printed page — no physical bottles present.`

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

        // Each request is one tile from a tiled scan — Haiku handles 5–10 wines per
        // tile reliably and all tiles run in parallel on the client.
        const readable = new ReadableStream({
          async start(controller) {
            try {
              const stream = await client.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 1024,
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
