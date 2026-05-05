import { useState } from 'react'

export function useScan() {
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState(null)

  async function scanImage(file) {
    setScanning(true)
    setError(null)

    try {
      const base64 = await fileToBase64(file)
      const mimeType = file.type || 'image/jpeg'

      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mimeType }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Server error ${res.status}`)
      }

      const { wines } = await res.json()
      return wines
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setScanning(false)
    }
  }

  return { scanImage, scanning, error }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      // FileReader gives "data:image/jpeg;base64,<data>" — strip the prefix
      const result = reader.result
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
