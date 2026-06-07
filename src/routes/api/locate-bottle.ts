import { createFileRoute } from '@tanstack/react-router'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

const InputSchema = z.object({
  photoUrl: z.string().url().optional(),
  photoBase64: z.string().optional(),
  wineName: z.string().min(1).max(300),
  vintage: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  grape: z.string().nullable().optional(),
})

function buildPrompt(wineName: string, vintage?: string | null, region?: string | null, grape?: string | null) {
  const details = [vintage, region, grape].filter(Boolean).join(', ')
  const wineDesc = details ? `"${wineName}" (${details})` : `"${wineName}"`

  return `You are a wine bottle localization expert. Your ONLY job is to find the physical bottle of ${wineDesc} in this shelf photo and return its precise bounding box.

Follow these steps exactly:
1. Scan every bottle label visible in the image. Read the text printed on each bottle's own label (body and neck).
2. Find the bottle whose label text most closely matches "${wineName}"${vintage ? ` vintage ${vintage}` : ''}.
3. CRITICAL: You must be reading a bottle label — not a shelf edge tag, price card, or shelf talker. A shelf tag names what a store intends to stock; only an actual bottle with a label on it confirms the wine is physically present. If you can only find a shelf tag for this wine but no actual bottle with a matching label visible above it, set found=false.
4. If the label is unreadable, obscured, or absent, set found=false.
5. When found: return a bounding box around the entire physical bottle — from the very base to the very top of the capsule/neck. Center the box horizontally on the bottle's vertical axis. Do not clip the sides or top.

Fractional coordinates: x and y are the top-left corner; w and h are the width and height. All values are fractions of the full image dimensions, where (0,0) = top-left corner and (1,1) = bottom-right corner.`
}

export const Route = createFileRoute('/api/locate-bottle')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: z.infer<typeof InputSchema>
        try {
          body = InputSchema.parse(await request.json())
        } catch {
          return Response.json({ found: false, error: 'invalid_input' }, { status: 400 })
        }

        if (!body.photoUrl && !body.photoBase64) {
          return Response.json({ found: false, error: 'invalid_input' }, { status: 400 })
        }

        const apiKey = process.env.ANTHROPIC_API_KEY
        if (!apiKey) {
          return Response.json({ found: false, error: 'not_configured' }, { status: 500 })
        }

        const client = new Anthropic({ apiKey })

        // Prefer base64 sent directly from client; fall back to fetching the URL.
        let imageSource: { type: 'base64'; media_type: string; data: string }
        if (body.photoBase64) {
          imageSource = { type: 'base64', media_type: 'image/jpeg', data: body.photoBase64 }
        } else {
          const imgRes = await fetch(body.photoUrl!)
          if (!imgRes.ok) return Response.json({ found: false, error: 'photo_fetch_failed' }, { status: 502 })
          const buf = await imgRes.arrayBuffer()
          const contentType = imgRes.headers.get('content-type') || 'image/jpeg'
          const mimeType = contentType.split(';')[0].trim()
          const bytes = new Uint8Array(buf)
          let binary = ''
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
          imageSource = { type: 'base64', media_type: mimeType, data: btoa(binary) }
        }

        try {
          const response = await client.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 512,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'image',
                    source: imageSource,
                  },
                  {
                    type: 'text',
                    text: buildPrompt(body.wineName, body.vintage, body.region, body.grape),
                  },
                ],
              },
            ],
            tools: [
              {
                name: 'locate_bottle',
                description: 'Return the bounding box of the specified wine bottle. Only set found=true if you can read text on the label that matches the wine name.',
                input_schema: {
                  type: 'object' as const,
                  properties: {
                    found: { type: 'boolean', description: 'true only if you are highly confident this is the correct bottle based on readable label text' },
                    confidence: { type: 'integer', description: 'your confidence 0–100 that this is the correct bottle', minimum: 0, maximum: 100 },
                    x: { type: 'number', description: 'left edge as fraction of image width (0–1)' },
                    y: { type: 'number', description: 'top edge as fraction of image height (0–1)' },
                    w: { type: 'number', description: 'width as fraction of image width (0–1)' },
                    h: { type: 'number', description: 'height as fraction of image height (0–1)' },
                    matchedText: { type: 'string', description: 'the label text you actually read that led to this match' },
                  },
                  required: ['found', 'confidence'],
                },
              },
            ],
            tool_choice: { type: 'tool', name: 'locate_bottle' },
          })

          const toolUse = response.content.find(b => b.type === 'tool_use')
          if (!toolUse || toolUse.type !== 'tool_use') {
            return Response.json({ found: false, bbox: null })
          }

          const result = toolUse.input as any

          if (!result.found || (typeof result.confidence === 'number' && result.confidence < 40)) {
            return Response.json({ found: false, bbox: null })
          }

          const clamp = (n: unknown) => Math.max(0, Math.min(1, Number(n) || 0))
          const w = clamp(result.w)
          const h = clamp(result.h)
          if (w === 0 || h === 0) {
            return Response.json({ found: false, bbox: null })
          }

          return Response.json({
            found: true,
            bbox: {
              x: clamp(result.x),
              y: clamp(result.y),
              w,
              h,
            },
          })
        } catch (err) {
          console.error('locate-bottle failed', err)
          return Response.json({ found: false, error: 'ai_error' })
        }
      },
    },
  },
})
