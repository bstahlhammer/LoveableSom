import { createFileRoute } from '@tanstack/react-router'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

const InputSchema = z.object({
  description: z.string().trim().min(3).max(2000),
})

const SYSTEM = `You are a sommelier translating a user's casual wine description into a structured taste profile. Extract BOTH structural axes (body, tannin, sweetness, acidity) AND character axes (earthiness, funk, mineral, oak, floral).

STRUCTURAL AXES: always output all four. Infer from wine style, variety, and adjectives. "Dry" → sweetness 5–15. "Smooth" → low tannin. "Crisp" → high acidity.

CHARACTER AXES: only output non-null when clearly implied. These capture aroma and flavor character, not structure. Use null as the default — absence of mention means absence of preference, not a mid-range preference.

KEY MAPPINGS:
- "earthy", "terroir-driven", "forest floor", "mushroom", "leather", "tobacco" → earthiness
- "funky", "barnyard", "brett", "wild", "natural wine character", "volatile" → funk
- "natural wines" alone → moderate funk + earthiness (45–60), not maximum
- "mineral", "stony", "flinty", "volcanic", "oyster shell", "chalky", "saline" → mineral
- "oaky", "buttery", "vanilla", "toasty", "coconut" → high oak; "unoaked", "clean", "no oak", "I hate oak" → low oak
- "floral", "violet", "rose", "jasmine", "aromatic", "perfumed" → floral

SCALE: 0=absent, 30=subtle hint, 50=noticeable, 70=prominent, 85+=defining character.
"A lot of funk" → 78–88. "A little earthy" → 30–45. "Very mineral" → 78–92. "Oaky/buttery" → 65–80. "I hate oak" → 0–10.

FOLLOW-UP QUESTIONS: include 0–2 when a signal is ambiguous or mid-confidence (30–65 range). Never ask about axes the user clearly specified. Emit the followUpQuestions array only when needed.`

const USER_PROMPT = (description: string) => `The user says: "${description}"

Please extract their palate profile using the extract_palate tool.`

export const Route = createFileRoute('/api/describe-palate')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { description: string }
        try {
          body = InputSchema.parse(await request.json())
        } catch {
          return Response.json({ error: 'Invalid input' }, { status: 400 })
        }

        const apiKey = process.env.ANTHROPIC_API_KEY
        if (!apiKey) {
          return Response.json({
            palate: { body: 50, tannin: 40, sweetness: 30, acidity: 55 },
            confidence: 0,
            coachingNote: 'AI is not configured.',
            vocabulary: [],
            error: 'missing_api_key',
          })
        }

        const client = new Anthropic({ apiKey })

        try {
          const response = await client.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 512,
            system: SYSTEM,
            messages: [{ role: 'user', content: USER_PROMPT(body.description) }],
            tools: [
              {
                name: 'extract_palate',
                description: 'Return structured palate inference from the user description.',
                input_schema: {
                  type: 'object' as const,
                  properties: {
                    body: { type: 'number', description: '0..100, light to full-bodied' },
                    tannin: { type: 'number', description: '0..100, silky to grippy' },
                    sweetness: { type: 'number', description: '0..100, bone dry to very sweet' },
                    acidity: { type: 'number', description: '0..100, soft to bright/crisp' },
                    earthiness: { description: 'integer 0–100 or null — only set if user mentions earthy/terroir/mushroom/soil/forest floor/leather/tobacco' },
                    funk: { description: 'integer 0–100 or null — only set if user mentions funk/barnyard/brett/wild/natural wine character/volatile' },
                    mineral: { description: 'integer 0–100 or null — only set if user mentions mineral/chalky/flinty/stony/saline/wet stone/volcanic' },
                    oak: { description: 'integer 0–100 or null — set if user mentions oaky/vanilla/toasty/buttery OR explicitly anti-oak (inverted low value)' },
                    floral: { description: 'integer 0–100 or null — only set if user mentions floral/violet/rose/jasmine/perfumed/aromatic' },
                    confidence: { type: 'number', description: '0..1, how specific the description was' },
                    coachingNote: { type: 'string', description: 'One warm sentence echoing their words in wine vocabulary.' },
                    vocabulary: {
                      type: 'array',
                      items: { type: 'string' },
                      description: '2-4 short wine terms the user just learned.',
                    },
                    followUpQuestions: {
                      type: 'array',
                      description: '0–2 follow-up questions when a character signal is ambiguous or mid-confidence. Omit if not needed.',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          question: { type: 'string' },
                          options: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                label: { type: 'string' },
                                delta: { type: 'object', description: 'Map of axis → value to apply if chosen' },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                  required: ['body', 'tannin', 'sweetness', 'acidity', 'confidence', 'coachingNote', 'vocabulary'],
                },
              },
            ],
            tool_choice: { type: 'tool', name: 'extract_palate' },
          })

          const toolUse = response.content.find(b => b.type === 'tool_use')
          if (!toolUse || toolUse.type !== 'tool_use') throw new Error('no tool call in response')
          const parsed = toolUse.input as any

          const clamp = (n: unknown) => {
            const v = Number(n)
            return Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : 50
          }
          const clampOrNull = (n: unknown) => {
            if (n == null) return null
            const v = Number(n)
            return Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : null
          }

          const CHARACTER_AXES = ['earthiness', 'funk', 'mineral', 'oak', 'floral'] as const
          const character: Record<string, number | null> = {}
          let hasAnyCharacter = false
          for (const axis of CHARACTER_AXES) {
            const val = clampOrNull((parsed as any)[axis])
            character[axis] = val
            if (val != null) hasAnyCharacter = true
          }

          const followUpQuestions = Array.isArray(parsed.followUpQuestions)
            ? parsed.followUpQuestions.slice(0, 2).map((q: any) => ({
                id: String(q.id || ''),
                question: String(q.question || '').slice(0, 200),
                options: Array.isArray(q.options)
                  ? q.options.slice(0, 4).map((o: any) => ({
                      label: String(o.label || '').slice(0, 60),
                      delta: (o.delta && typeof o.delta === 'object') ? o.delta : {},
                    }))
                  : [],
              }))
            : []

          return Response.json({
            palate: {
              body: clamp(parsed.body),
              tannin: clamp(parsed.tannin),
              sweetness: clamp(parsed.sweetness),
              acidity: clamp(parsed.acidity),
            },
            character: hasAnyCharacter ? character : null,
            confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0)),
            coachingNote: String(parsed.coachingNote || '').slice(0, 280),
            vocabulary: Array.isArray(parsed.vocabulary)
              ? parsed.vocabulary.slice(0, 6).map((v: unknown) => String(v).slice(0, 40))
              : [],
            followUpQuestions: followUpQuestions.length > 0 ? followUpQuestions : undefined,
          })
        } catch (err) {
          console.error('describePalate failed', err)
          return Response.json({
            palate: { body: 50, tannin: 40, sweetness: 30, acidity: 55 },
            confidence: 0,
            coachingNote: 'Something went wrong. Try a shorter description.',
            vocabulary: [],
            error: 'unknown',
          })
        }
      },
    },
  },
})
