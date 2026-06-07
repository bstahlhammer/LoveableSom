import { createFileRoute } from '@tanstack/react-router'
import Anthropic from '@anthropic-ai/sdk'

const PROMPT = `You are a wine identification expert analyzing a photo of a wine shelf, rack, display, or wine list.
Your task: identify every distinct wine you can see, using both visual recognition and text reading.

IDENTIFICATION METHODS — use all of these, in order of reliability:
1. Read the label text directly if the label is legible (producer name, wine name, vintage, region).
2. Recognize the label design visually — distinctive labels like Caymus (copper label), 19 Crimes (mugshot portraits), Silver Oak (woodcut art), The Prisoner (Goya figure), Whispering Angel (blush bottle), Josh Cellars (script logo), Meiomi (coastal art), and hundreds of others can be identified by their visual design even when individual letters are small. If you recognize a label design with confidence, report it.
3. Read shelf edge tags below bottles — these name the wine and price even when bottle labels are too small to read. Report shelf-tag wines at lower confidence (30–60) to signal they were not confirmed from the bottle label itself.

WHAT TO REPORT:
- Report wines you can identify from label text OR from visual recognition of a known label design.
- When you visually recognize a label design (e.g. Caymus copper label, 19 Crimes mugshot portraits, Whispering Angel blush bottle, The Prisoner Goya figure), report the wine's ACTUAL NAME — the producer and wine name you know it to be — at confidence 50–70. Visual recognition counts.
- You do not need to read every letter. If you recognize it, name it.
- A wine on a shelf tag with no visible bottle label: report at confidence 20–40.
- A wine whose label text you can clearly read: report at confidence 75–100.
- CRITICAL: If you cannot identify the wine by name from reading OR visual recognition, skip it entirely. The name field must contain the wine's actual brand/producer name. Never use the name field to describe what you see. These are FORBIDDEN name formats — skip these entirely instead: "Wine with decorative label", "Red wine with illustrated label", "Malbec (illustrated label)", "Bottle with vintage truck imagery", "Red wine with animal imagery", or any phrase describing the label appearance. If you cannot name it, omit it.
- Do NOT invent wines not present in the image.

For each wine return:
- id: sequential integer starting at 1
- name: wine name as best you can determine — from label text, visual recognition, or shelf tag (string)
- vintage: year if visible on bottle or shelf tag, or null (string | null)
- region: region if readable on label or shelf tag, or null (string | null)
- grape: varietal if readable on label or shelf tag, or null (string | null)
- price: shelf edge price if visible below or beside this bottle, with $ symbol; null if not visible. For wine lists/menus, read the price next to the wine name. (string | null)
- priceNum: numeric price only (no $ or currency), or null (number | null)
- confidence: 0–100 — how certain you are this identification is correct (integer)
- truncated: true if the bottle or label appears cut off at the image boundary, else false (boolean)

Return ONLY raw JSON (no markdown, no code fences):
{
  "wines": [ ...wine objects... ],
  "readability": "good",
  "retakeReasons": [],
  "message": "",
  "scanType": "shelf"
}

readability: "good" = identified most wines | "partial" = some unclear or cut off | "unreadable" = could not identify any wines
retakeReasons — zero or more of: "too_blurry","too_dark","too_far","glare","angle_skewed","label_cut_off","not_a_wine_image","list_too_dense"
message: short user-facing note if readability is not "good", else empty string.
scanType: "shelf" if physical wine bottles or a wine rack/display is visible. "list" if wines appear as text on a menu, wine list, chalkboard, or printed page with no bottles present.`

export const Route = createFileRoute('/api/scan')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { image: string; mimeType?: string; enhanced?: boolean }

        try {
          body = await request.json()
        } catch {
          return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
        }

        const { image, mimeType = 'image/jpeg', enhanced = false } = body

        if (!image) {
          return Response.json({ error: 'Missing image field (base64)' }, { status: 400 })
        }

        const apiKey = process.env.ANTHROPIC_API_KEY
        if (!apiKey) {
          return Response.json({ error: 'Server misconfiguration' }, { status: 500 })
        }

        const client = new Anthropic({ apiKey })
        const encoder = new TextEncoder()

        const model = enhanced ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001'
        const maxTokens = enhanced ? 4096 : 2048

        // Each request is one tile from a tiled scan — Haiku handles 5–10 wines per
        // tile reliably and all tiles run in parallel on the client.
        // When enhanced=true (Sonnet fallback), receives the full resized image.
        const readable = new ReadableStream({
          async start(controller) {
            try {
              const stream = await client.messages.create({
                model,
                max_tokens: maxTokens,
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
