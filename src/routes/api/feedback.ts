import { createFileRoute } from '@tanstack/react-router'
import { createClient }    from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const SUPABASE_URL      = 'https://bromlnbihmfknqcdbieq.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyb21sbmJpaG1ma25xY2RiaWVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMTQyMzMsImV4cCI6MjA5MzU5MDIzM30.jwvh8WQkX5ssSKhY512CH03GG5QRijtLGhNs29iYUjI'

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
  const issueBody: Record<string, unknown> = {
    title: `[${type}] ${description.slice(0, 72)}${description.length > 72 ? '…' : ''}`,
    body:  buildIssueBody(type, screen, description),
    assignees: ['bstahlhammer'],
  }
  if (label) issueBody.labels = [label]

  const res = await fetch(`${GITHUB_API}/repos/${GITHUB_REPO}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'uncork-app',
    },
    body: JSON.stringify(issueBody),
  })

  if (!res.ok) {
    console.error('GitHub issue creation failed:', res.status, await res.text())
    return null
  }

  return res.json() as Promise<{ number: number; html_url: string }>
}

async function sendEmail(resendKey: string, subject: string, html: string): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Uncork Feedback <onboarding@resend.dev>',
      to: 'bstahlhammer@gmail.com',
      subject,
      html,
    }),
  })
  if (!res.ok) console.error('Resend email failed:', res.status, await res.text())
}

async function postGitHubComment(token: string, issueNumber: number, body: string): Promise<void> {
  const res = await fetch(`${GITHUB_API}/repos/${GITHUB_REPO}/issues/${issueNumber}/comments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'uncork-app',
    },
    body: JSON.stringify({ body }),
  })
  if (!res.ok) console.error('GitHub comment failed:', res.status, await res.text())
}

export const Route = createFileRoute('/api/feedback')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader  = request.headers.get('Authorization') ?? ''
        const accessToken = authHeader.replace(/^Bearer\s+/i, '').trim()

        let reqBody: { type?: string; description?: string; screen?: string }
        try {
          reqBody = await request.json()
        } catch {
          return Response.json({ error: 'Invalid JSON' }, { status: 400 })
        }

        const { type = 'Feedback', description = '', screen = 'unknown' } = reqBody
        if (!description.trim()) {
          return Response.json({ error: 'Missing description' }, { status: 400 })
        }

        // Save to Supabase using the user's auth token (same pattern as label-request.ts)
        if (accessToken) {
          const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: { persistSession: false },
            global: { headers: { Authorization: `Bearer ${accessToken}` } },
          })
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { error } = await supabase.from('feedback').insert({
              user_id:     user.id,
              type,
              description: description.trim(),
              screen,
            })
            if (error) console.error('Supabase feedback insert error:', error)
          }
        }

        // Create GitHub issue (non-blocking on Supabase result)
        const githubToken = process.env.GITHUB_TOKEN
        if (!githubToken) {
          console.error('GITHUB_TOKEN not configured')
          return Response.json({ ok: true })
        }

        const issue = await createGitHubIssue(githubToken, type, description.trim(), screen)
        if (!issue) return Response.json({ ok: true })

        // Claude triage as GitHub comment
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

            const resendKey = process.env.RESEND_API_KEY
            if (resendKey) {
              await sendEmail(
                resendKey,
                `[${type}] New feedback on ${screen}`,
                `<h2>New Uncork Feedback</h2>
<p><strong>Type:</strong> ${type}<br>
<strong>Screen:</strong> ${screen}</p>
<p><strong>Description:</strong><br>${description.trim().replace(/\n/g, '<br>')}</p>
<hr>
<h3>AI Triage</h3>
<pre style="white-space:pre-wrap">${triage}</pre>
<hr>
<p><a href="${issue.html_url}">View GitHub Issue #${issue.number}</a></p>`,
              )
            }
          }
        } catch (err) {
          console.error('Claude triage error:', err)
        }

        return Response.json({ ok: true, issueUrl: issue.html_url })
      },
    },
  },
})
