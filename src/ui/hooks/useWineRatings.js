import { useState } from 'react'

const STORAGE_KEY = 'uncork_wine_ratings'

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }
  catch { return {} }
}

export function useWineRatings() {
  const [ratings, setRatings] = useState(load)

  async function saveRating({ wineId, bucketId, stars, tasteMatch, recommend, drinkAgain, goodFor, notes, wine }) {
    setRatings(prev => {
      const next = {
        ...prev,
        [wineId]: {
          bucketId:   bucketId   !== undefined ? bucketId   : (prev[wineId]?.bucketId   ?? null),
          stars:      stars      !== undefined ? stars      : (prev[wineId]?.stars      ?? null),
          tasteMatch: tasteMatch !== undefined ? tasteMatch : (prev[wineId]?.tasteMatch ?? null),
          recommend:  recommend  !== undefined ? recommend  : (prev[wineId]?.recommend  ?? null),
          drinkAgain: drinkAgain !== undefined ? drinkAgain : (prev[wineId]?.drinkAgain ?? null),
          goodFor:    goodFor    !== undefined ? goodFor    : (prev[wineId]?.goodFor    ?? []),
          notes:      notes      !== undefined ? notes      : (prev[wineId]?.notes      ?? ''),
          wine: wine ?? prev[wineId]?.wine ?? null,
          savedAt: Date.now(),
        },
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
    return {}
  }

  async function removeRating(wineId) {
    setRatings(prev => {
      const next = { ...prev }
      delete next[wineId]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
    return {}
  }

  return { ratings, saveRating, removeRating }
}
