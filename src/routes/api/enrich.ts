import { createFileRoute } from '@tanstack/react-router'
import Anthropic from '@anthropic-ai/sdk'

// Haiku is fast and cheap for factual text-only lookups.
const MODEL = 'claude-haiku-4-5-20251001'

const buildPrompt = (wines: Array<{ id: number; name: string; vintage?: string | null }>) => `
You are a wine reference database. For each wine in the list below, return the correct primary grape varietal and producing region/appellation.

Rules:
- Only return information you are highly confident is accurate from your knowledge.
- If you are not certain about the grape or region for a specific wine, set that field to null.
- A null answer is correct. A confidently wrong answer causes the app to mislead users.
- For the grape field: use the standard varietal name (e.g. "Cabernet Sauvignon", "Pinot Noir", "Chardonnay"). For blends, list the dominant grape first (e.g. "Cabernet Sauvignon blend").
- For the region field: use the standard appellation (e.g. "Napa Valley", "Bordeaux", "Burgundy", "Rioja").
- Do not invent wines. If you don't recognize a name, return nulls.

Wines to look up:
${JSON.stringify(wines, null, 2)}

Return ONLY a JSON array with this exact shape: [{"id": number, "grape": string | null, "region": string | null}]
No markdown, no code fences, no explanation.
`.trim()

export const Route = createFileRoute('/api/enrich')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { wines?: unknown }

        try {
          body = await request.json()
        } catch {
          return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
        }

        if (!Array.isArray(body.wines) || body.wines.length === 0) {
          return Response.json({ error: 'wines must be a non-empty array' }, { status: 400 })
        }

        // Sanitize input — only pass what the prompt needs
        const wines = (body.wines as Array<Record<string, unknown>>)
          .filter((w) => w && typeof w.name === 'string' && w.name.trim())
          .slice(0, 30) // cap to avoid abuse
          .map((w, i) => ({
            id: typeof w.id === 'number' ? w.id : i + 1,
            name: String(w.name).trim(),
            vintage: typeof w.vintage === 'string' ? w.vintage : null,
          }))

        if (wines.length === 0) {
          return Response.json({ error: 'No valid wines provided' }, { status: 400 })
        }

        const apiKey = process.env.ANTHROPIC_API_KEY
        if (!apiKey) {
          return Response.json({ error: 'Server misconfiguration' }, { status: 500 })
        }

        const client = new Anthropic({ apiKey })

        try {
          const message = await client.messages.create({
            model: MODEL,
            max_tokens: 1024,
            messages: [{ role: 'user', content: buildPrompt(wines) }],
          })

          const raw = message.content
            .filter((b) => b.type === 'text')
            .map((b) => (b as { type: 'text'; text: string }).text)
            .join('')
            .trim()
            .replace(/^```(?:json)?\n?/, '')
            .replace(/\n?```$/, '')
            .trim()

          let enrichments: Array<{ id: number; grape: string | null; region: string | null }>
          try {
            const parsed = JSON.parse(raw)
            if (!Array.isArray(parsed)) throw new Error('not array')
            enrichments = parsed.filter(
              (e) => e && typeof e.id === 'number'
            )
          } catch {
            return Response.json({ error: 'Failed to parse enrichment response' }, { status: 500 })
          }

          return Response.json({ enrichments })
        } catch (err) {
          console.error('Enrich API error:', err)
          return Response.json({ error: 'Enrichment failed' }, { status: 500 })
        }
      },
    },
  },
})
