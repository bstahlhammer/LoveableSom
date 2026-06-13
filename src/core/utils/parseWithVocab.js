// Returns an array of segments: strings or { text, entry } objects.
// The caller is responsible for rendering segments (strings as-is, objects as VocabTerm).
//
// Rules:
// - whole-word matches only (word boundaries)
// - longest alias wins when multiple aliases overlap
// - each canonical term is wrapped at most once per string (first occurrence)
// - aliases are matched case-insensitively

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function parseWithVocab(text, glossary) {
  if (!text || !glossary?.length) return [text]

  // Build: [{ alias, entry }], sorted by alias length descending so longer aliases
  // always win over shorter ones that are substrings.
  const candidates = []
  for (const entry of glossary) {
    for (const alias of [entry.term, ...entry.aliases]) {
      candidates.push({ alias: alias.toLowerCase(), entry })
    }
  }
  candidates.sort((a, b) => b.alias.length - a.alias.length)

  // Find the first non-overlapping match for each canonical term
  const usedTerms = new Set()
  const matches = []

  const lower = text.toLowerCase()

  for (const { alias, entry } of candidates) {
    if (usedTerms.has(entry.term)) continue
    const re = new RegExp(`(?<![a-z])${escapeRegex(alias)}(?![a-z])`, 'i')
    const m = lower.match(re)
    if (m && m.index !== undefined) {
      matches.push({ start: m.index, end: m.index + alias.length, entry, text: text.slice(m.index, m.index + alias.length) })
      usedTerms.add(entry.term)
    }
  }

  if (!matches.length) return [text]

  // Sort by start position, discard overlaps (keep earlier)
  matches.sort((a, b) => a.start - b.start)
  const filtered = []
  let cursor = 0
  for (const m of matches) {
    if (m.start >= cursor) {
      filtered.push(m)
      cursor = m.end
    }
  }

  // Build segments array
  const segments = []
  let pos = 0
  for (const m of filtered) {
    if (m.start > pos) segments.push(text.slice(pos, m.start))
    segments.push({ text: m.text, entry: m.entry })
    pos = m.end
  }
  if (pos < text.length) segments.push(text.slice(pos))
  return segments
}
