import { createFileRoute } from '@tanstack/react-router'
import Anthropic from '@anthropic-ai/sdk'

const GITHUB_REPO = 'bstahlhammer/LoveableSom'
const GITHUB_API  = 'https://api.github.com'

const LABEL_MAP: Record<string, string> = {
  'Bug': 'bug',
  'Feature Request': 'enhancement',
}

const TRIAGE_PROMPT = `You are a product triage agent for Uncork, a mobile wine identification and recommendation app.

App screens and their primary files:
- home → src/ui/screens/HomeScreen.jsx
- scanning → src/ui/screens/ScanningScreen.jsx, src/ui/hooks/useScan.js
- anonResults / results → src/ui/screens/AnonResultsScreen.jsx
- wineDetail → src/ui/screens/WineDetailScreen.jsx
- profile → src/ui/screens/ProfileScreen.jsx
- scan API → src/routes/api/scan.ts
- feedback → src/ui/components/FeedbackModal.jsx, src/ui/components/FeedbackFAB.jsx

A user submitted the following feedback:
Type: {type}
Screen: {screen}
Description: {description}

Write a concise triage in exactly this format (no other text):

**Priority:** P0 / P1 / P2 / P3 — one sentence rationale

**Proposed fix:** 2–3 sentences describing what to change and how.

**Likely files:** list 1–3 specific file paths from the app most likely to need editing.

Priority guide:
- P0: App is broken, data loss, or scan never works
- P1: Core feature broken, significant UX problem, or repeated scan failures
- P2: Feature request with clear user value, minor bug
- P3: Nice-to-have, cosmetic, low-impact`

function buildIssueBody(type: string, screen: string, description: string): string {
  return [
    '## User Feedback',
    '',
    `**Type:** ${type}`,
    `**Screen:** ${screen}`,
    `**Submitted:** ${new Date().toISOString()}`,
    '',
    '## Description',
    '',
    description,
    '',
    '---',
    '*Submitted via in-app feedback · AI triage will appear as a comment shortly*',
  ].join('\n')
}

async function createGitHubIssue(
  token: string,
  type: string,
  description: string,
  screen: string,
): Promise<{ number: number; html_url: string } | null> {
  const label = LABEL_MAP[type]
  const body: Record<string, unknown> = {
    title: `[${type}] ${description.slice(0, 72)}${description.length > 72 ? '…' : ''}`,
    body:  buildIssueBody(type, screen, description),
    assignees: ['bstahlhammer'],
  }
  if (label) body.labels = [label]

  const res = await fetch(`${GITHUB_API}/repos/${GITHUB_REPO}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    console.error('GitHub issue creation failed:', res.status, await res.text())
    return null
  }

  return res.json() as Promise<{ number: number; html_url: string }>
}

async function postGitHubComment(token: string, issueNumber: number, body: string): Promise<void> {
  const res = await fetch(`${GITHUB_API}/repos/${GITHUB_REPO}/issues/${issueNumber}/comments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({ body }),
  })
  if (!res.ok) console.error('GitHub comment failed:', res.status, await res.text())
}

export const Route = createFileRoute('/api/feedback')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { type?: string; description?: string; screen?: string }
        try {
          body = await request.json()
        } catch {
          return Response.json({ error: 'Invalid JSON' }, { status: 400 })
        }

        const { type = 'Feedback', description = '', screen = 'unknown' } = body
        if (!description.trim()) {
          return Response.json({ error: 'Missing description' }, { status: 400 })
        }

        const githubToken = process.env.GITHUB_TOKEN
        if (!githubToken) {
          console.error('GITHUB_TOKEN not configured')
          return Response.json({ ok: true })
        }

        // Create GitHub issue
        const issue = await createGitHubIssue(githubToken, type, description.trim(), screen)
        if (!issue) return Response.json({ ok: true })

        // Run Claude triage and post as comment
        const apiKey = process.env.ANTHROPIC_API_KEY
        if (!apiKey) return Response.json({ ok: true, issueUrl: issue.html_url })

        try {
          const client = new Anthropic({ apiKey })
          const triageText = TRIAGE_PROMPT
            .replace('{type}', type)
            .replace('{screen}', screen)
            .replace('{description}', description.trim())

          const msg = await client.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 512,
            messages: [{ role: 'user', content: triageText }],
          })

          const triage = msg.content
            .filter(b => b.type === 'text')
            .map(b => (b as { type: 'text'; text: string }).text)
            .join('')

          if (triage) {
            await postGitHubComment(
              githubToken,
              issue.number,
              `## AI Triage\n\n${triage}\n\n---\n*Generated by Claude Haiku · Review and adjust as needed*`,
            )
          }
        } catch (err) {
          console.error('Claude triage error:', err)
        }

        return Response.json({ ok: true, issueUrl: issue.html_url })
      },
    },
  },
})
