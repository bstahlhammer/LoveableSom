import { useState } from 'react'

const KEY = 'uncork_shortlist'

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') }
  catch { return [] }
}

function wineId(wine) {
  return wine?.id ?? wine?.name ?? ''
}

export function useShortlist() {
  const [list, setList] = useState(load)

  function toggle(wine) {
    setList(prev => {
      const id = wineId(wine)
      const has = prev.some(w => wineId(w) === id)
      const next = has ? prev.filter(w => wineId(w) !== id) : [...prev, wine]
      localStorage.setItem(KEY, JSON.stringify(next))
      return next
    })
  }

  function isSaved(wine) {
    const id = wineId(wine)
    return list.some(w => wineId(w) === id)
  }

  function clear() {
    setList([])
    localStorage.removeItem(KEY)
  }

  return { list, toggle, isSaved, clear }
}
