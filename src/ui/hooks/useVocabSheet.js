import { useState, useCallback } from 'react'
import glossary from '@/core/data/wineGlossary.js'

const byTerm = Object.fromEntries(glossary.map(e => [e.term, e]))

export function useVocabSheet() {
  const [entry, setEntry] = useState(null)

  const openTerm = useCallback((term) => {
    const canonical = term?.toLowerCase()
    const found = byTerm[canonical] ?? glossary.find(e =>
      e.aliases.some(a => a.toLowerCase() === canonical)
    )
    if (found) setEntry(found)
  }, [])

  const close = useCallback(() => setEntry(null), [])

  return { openTerm, vocabEntry: entry, closeVocab: close }
}
