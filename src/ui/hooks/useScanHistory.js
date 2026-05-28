import { useCallback } from 'react'
import { supabase } from '../../integrations/supabase/client.ts'

export function useScanHistory() {
  const saveScan = useCallback(async ({ wines = [], photoFile, buyingFor, place, locationLabel } = {}) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { scan: null, error: 'Not signed in' }

    let photo_path = null
    if (photoFile) {
      const ext = (photoFile.name?.split('.').pop() || 'jpg').toLowerCase()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('scan-photos')
        .upload(path, photoFile, { contentType: photoFile.type || 'image/jpeg', upsert: false })
      if (!uploadError) photo_path = path
    }

    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .insert({
        user_id: user.id,
        photo_path,
        wine_count: wines.length,
        buying_for: buyingFor ?? null,
        location_label: place?.name ?? locationLabel ?? null,
        place_id: place?.placeId ?? null,
        place_address: place?.address ?? null,
        place_lat: place?.lat ?? null,
        place_lng: place?.lng ?? null,
      })
      .select()
      .single()

    if (scanError) return { scan: null, error: scanError.message }

    if (wines.length) {
      const rows = wines.map((wine, i) => ({
        scan_id: scan.id,
        user_id: user.id,
        position: i,
        wine,
      }))
      await supabase.from('scan_wines').insert(rows)
    }

    return { scan, error: null }
  }, [])

  const loadScan = useCallback(async (scanId) => {
    const { data, error } = await supabase
      .from('scan_wines')
      .select('wine, position')
      .eq('scan_id', scanId)
      .order('position', { ascending: true })
    if (error) return { wines: [], scan: null }
    return { wines: (data || []).map(r => r.wine), scan: null }
  }, [])

  const listScans = useCallback(async () => {
    const { data, error } = await supabase
      .from('scans')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) return { scans: [] }
    return { scans: data || [] }
  }, [])

  const deleteScan = useCallback(async (scan) => {
    if (scan.photo_path) {
      await supabase.storage.from('scan-photos').remove([scan.photo_path])
    }
    await supabase.from('scans').delete().eq('id', scan.id)
    return {}
  }, [])

  const updateScanLocation = useCallback(async (scanId, update) => {
    const patch = {}
    if (update.place) {
      const p = update.place
      patch.location_label = p.name ?? null
      patch.place_id       = p.placeId ?? null
      patch.place_address  = p.address ?? null
      patch.place_lat      = p.lat ?? null
      patch.place_lng      = p.lng ?? null
    } else if (update.locationLabel !== undefined) {
      patch.location_label = update.locationLabel
    }
    await supabase.from('scans').update(patch).eq('id', scanId)
    return {}
  }, [])

  const getPhotoUrl = useCallback(async (photoPath) => {
    if (!photoPath) return null
    const { data } = await supabase.storage
      .from('scan-photos')
      .createSignedUrl(photoPath, 3600)
    return data?.signedUrl ?? null
  }, [])

  return { saveScan, loadScan, listScans, deleteScan, updateScanLocation, getPhotoUrl }
}
