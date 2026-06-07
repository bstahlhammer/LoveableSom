/**
 * Core API — the single contract between UI and business logic.
 *
 * The UI layer (src/ui/**) MUST only import from this file when it needs
 * data, scoring, sorting, or any other domain logic.
 */

import {
  wines,
  tasteProfiles,
  quizSteps,
  wineSearchDb,
  RATING_BUCKETS,
} from './data/mockData.js'
import { createClient as _createSupabaseClient } from '@supabase/supabase-js'
import { sortWines as _sortWines } from './engine/sortEngine.js'
import { chooseHeroPicks as _chooseHeroPicks } from './engine/heroPicksEngine.js'
import { computeApproachability as _computeApproachability } from './engine/approachabilityEngine.js'
import { computeMatch as _computeMatch, computeMatchWithConfidence as _computeMatchWithConfidence, explainMatch as _explainMatch, explainMismatch as _explainMismatch } from './engine/matchEngine.js'
import {
  inferPalateFromRatings as _inferPalateFromRatings,
  nearestTasteProfile as _nearestTasteProfile,
  groupRatingsByBucket as _groupRatingsByBucket,
  buildTasteIdentity as _buildTasteIdentity,
} from './engine/palateInferenceEngine.js'
import {
  getInitialNode as _getGuidedInitialNode,
  getNode as _getGuidedNode,
  getNextNode as _getGuidedNextNode,
  computePalateFromGuidedAnswers as _computePalateFromGuidedAnswers,
} from './engine/guidedQuizEngine.js'
import {
  applyFilters as _applyFilters,
  getFilterFacets as _getFilterFacets,
  countActiveFilters as _countActiveFilters,
  EMPTY_FILTERS,
  CERTIFICATION_LABELS,
  COLOR_LABELS,
} from './engine/filterEngine.js'

/**
 * Ask Claude to translate a free-text wine description into palate axes
 * + a short coaching note. Returns { palate, confidence, coachingNote, vocabulary }.
 */
export async function describePalateFromText(description) {
  try {
    const res = await fetch('/api/describe-palate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description }),
    })
    if (!res.ok) throw new Error(`http_${res.status}`)
    return await res.json()
  } catch (e) {
    return {
      palate: { body: 50, tannin: 40, sweetness: 30, acidity: 55 },
      confidence: 0,
      coachingNote: 'Could not reach AI. Try again in a moment.',
      vocabulary: [],
      error: e?.message || 'unknown',
    }
  }
}

// ---------- Data ----------

export function getWines() { return wines }
export function getTasteProfiles() { return tasteProfiles }
export function getQuizSteps() { return quizSteps }
export function getWineSearchIndex() { return wineSearchDb }
export function getRatingBuckets() { return RATING_BUCKETS }

// ---------- Engines ----------

export function sortWines(wineList, mode, tasteProfile = null) {
  return _sortWines(wineList, mode, tasteProfile)
}

export function chooseHeroPicks(wineList, tasteProfile = null) {
  return _chooseHeroPicks(wineList, tasteProfile)
}

export function computeApproachability(wine) {
  return _computeApproachability(wine)
}

export function computeMatch(wine, tasteProfile) {
  return _computeMatch(wine, tasteProfile)
}

export function computeMatchWithConfidence(wine, tasteProfile) {
  return _computeMatchWithConfidence(wine, tasteProfile)
}

export function explainMatch(wine, tasteProfile) {
  return _explainMatch(wine, tasteProfile)
}

export function explainMismatch(wine, tasteProfile) {
  return _explainMismatch(wine, tasteProfile)
}

export function inferPalateFromRatings(ratings) {
  return _inferPalateFromRatings(ratings)
}

export function nearestTasteProfile(palate) {
  return _nearestTasteProfile(palate)
}

export function groupRatingsByBucket(ratings) {
  return _groupRatingsByBucket(ratings)
}

export function buildTasteIdentity(palate, character) {
  return _buildTasteIdentity(palate, character)
}

// ---------- Guided quiz ----------

export function getGuidedInitialNode() { return _getGuidedInitialNode() }
export function getGuidedNode(id)      { return _getGuidedNode(id) }
export function getGuidedNextNode(id, answer, all) {
  return _getGuidedNextNode(id, answer, all)
}
export function computePalateFromGuidedAnswers(answers) {
  return _computePalateFromGuidedAnswers(answers)
}

// ---------- Filters ----------

export function applyFilters(wineList, filters) { return _applyFilters(wineList, filters) }
export function getFilterFacets(wineList)       { return _getFilterFacets(wineList) }
export function countActiveFilters(filters)     { return _countActiveFilters(filters) }
export { EMPTY_FILTERS, CERTIFICATION_LABELS, COLOR_LABELS }

// ---------- Image lookup ----------

const _norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

export function findWineImage(name) {
  if (!name) return null
  const target = _norm(name)
  const match = wines.find(w => {
    const n = _norm(w.name)
    return n === target || n.includes(target) || target.includes(n)
  })
  return match?.imageUrl ?? null
}

// ---------- Wine catalog (Supabase — 100k+ wines) ----------

const _SUPABASE_URL      = 'https://bromlnbihmfknqcdbieq.supabase.co'
const _SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyb21sbmJpaG1ma25xY2RiaWVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMTQyMzMsImV4cCI6MjA5MzU5MDIzM30.jwvh8WQkX5ssSKhY512CH03GG5QRijtLGhNs29iYUjI'

let _supabaseClient = null
function _supabase() {
  if (!_supabaseClient) {
    _supabaseClient = _createSupabaseClient(_SUPABASE_URL, _SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    })
  }
  return _supabaseClient
}

const _normCatalog = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()

/**
 * Look up a wine by name in the Supabase catalog.
 * Returns the best-matching record or null.
 *
 * Strategy:
 *   1. Exact name match (case-insensitive)
 *   2. Full-text search fallback
 */
export async function lookupWineCatalog(name) {
  if (!name) return null
  try {
    const client = _supabase()

    // 1. Exact match
    const { data: exact, error: e1 } = await client
      .from('wine_catalog')
      .select('id,name,winery,vintage,variety,region,country,description,points,price,body,tannin,sweetness,acidity,color,image_url,flavor_tags,wine_style,adventurousness')
      .ilike('name', name)
      .limit(1)
      .single()
    if (e1 && e1.code !== 'PGRST116') console.error('[catalog] exact match error:', e1.message, '| name:', name)
    if (exact) return _catalogToWine(exact)

    // 2. Full-text search
    const query = _normCatalog(name).split(' ').filter(Boolean).join(' & ')
    if (!query) return null
    const { data: fts, error: e2 } = await client
      .from('wine_catalog')
      .select('id,name,winery,vintage,variety,region,country,description,points,price,body,tannin,sweetness,acidity,color,image_url,flavor_tags,wine_style,adventurousness')
      .textSearch('name', query, { type: 'websearch', config: 'english' })
      .limit(1)
    if (e2) console.error('[catalog] fts error:', e2.message, '| name:', name)
    if (fts?.length) return _catalogToWine(fts[0])
  } catch (err) {
    console.error('[catalog] lookup threw:', err?.message, '| name:', name)
  }
  return null
}

/**
 * Search the catalog for wines matching a query string.
 * Returns up to `limit` results (default 20).
 */
export async function searchWineCatalog(query, { limit = 20, country, variety, minPoints, maxPrice } = {}) {
  if (!query?.trim()) return []
  try {
    const client = _supabase()
    let q = client
      .from('wine_catalog')
      .select('id,name,winery,vintage,variety,region,country,description,points,price,body,tannin,sweetness,acidity,color,image_url,flavor_tags,wine_style,adventurousness')
      .textSearch('name', query.trim(), { type: 'websearch', config: 'english' })
      .limit(limit)

    if (country)   q = q.eq('country', country)
    if (variety)   q = q.ilike('variety', `%${variety}%`)
    if (minPoints) q = q.gte('points', minPoints)
    if (maxPrice)  q = q.lte('price', maxPrice)

    const { data } = await q
    return (data || []).map(_catalogToWine)
  } catch {
    return []
  }
}

/**
 * Fetch a page of wines from the catalog (for Explore / Browse screens).
 * Returns { wines, total }.
 */
export async function getCatalogPage({ page = 0, pageSize = 40, country, variety, minPoints, maxPrice, color, natural, minAdventurousness } = {}) {
  try {
    const client = _supabase()
    let q = client
      .from('wine_catalog')
      .select('id,name,winery,vintage,variety,region,country,description,points,price,body,tannin,sweetness,acidity,color,image_url,flavor_tags,wine_style,adventurousness', { count: 'exact' })
      .order('points', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (country)            q = q.eq('country', country)
    if (variety)            q = q.ilike('variety', `%${variety}%`)
    if (minPoints)          q = q.gte('points', minPoints)
    if (maxPrice)           q = q.lte('price', maxPrice)
    if (color)              q = q.eq('color', color)
    if (natural)            q = q.contains('wine_style', ['natural'])
    if (minAdventurousness) q = q.gte('adventurousness', minAdventurousness)

    const { data, count } = await q
    return { wines: (data || []).map(_catalogToWine), total: count ?? 0 }
  } catch {
    return { wines: [], total: 0 }
  }
}

function _ratingLabel(points) {
  if (!points) return null
  if (points >= 95) return 'Well above average'
  if (points >= 90) return 'Above average'
  if (points >= 85) return 'Below average'
  return 'Well below average'
}

function _catalogToWine(row) {
  return {
    id:          `cat_${row.id}`,
    _catalogId:  row.id,
    name:        row.name,
    winery:      row.winery,
    vintage:     row.vintage ? String(row.vintage) : null,
    grape:       row.variety,
    region:      row.region,
    country:     row.country,
    tasting:     row.description,
    rating:      row.points,
    ratingLabel: _ratingLabel(row.points),
    price:       row.price ? `$${row.price}` : null,
    priceNum:    row.price,
    body:        row.body,
    tannin:      row.tannin,
    sweetness:   row.sweetness,
    acidity:     row.acidity,
    color:       row.color,
    imageUrl:        row.image_url || null,
    flavorTags:      row.flavor_tags      ?? [],
    wineStyle:       row.wine_style       ?? ['conventional'],
    adventurousness: row.adventurousness  ?? 3,
    // Placeholders for fields the match engine may read
    isValue:     row.price != null && row.points >= 90 && row.price <= 30,
    isCrowd:     row.points >= 88,
    pairings:    [],
    retailers:   [],
  }
}

/**
 * Look up a wine by name using the web-search endpoint.
 * Tries Supabase catalog first, then Claude AI as fallback.
 * Returns { wine, source } where source is 'catalog' | 'ai' | 'not_found' | 'error'.
 */
export async function findWineOnWeb(name, vintage = null) {
  try {
    const res = await fetch('/api/find-wine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, vintage }),
    })
    if (!res.ok) return { wine: null, source: 'error' }
    return await res.json()
  } catch {
    return { wine: null, source: 'error' }
  }
}

/**
 * Trigger a lazy image fetch for a catalog wine.
 * Fires and forgets — updates the catalog in the background.
 * Returns the image URL if already cached, otherwise null.
 */
export async function fetchCatalogImage(catalogId, name) {
  if (!catalogId || !name) return null
  try {
    const res = await fetch(`/api/wine-image?name=${encodeURIComponent(name)}&catalog_id=${catalogId}`)
    if (!res.ok) return null
    const { imageUrl } = await res.json()
    return imageUrl || null
  } catch {
    return null
  }
}

// ---------- Stubs for auth-gated features ----------
// These require Supabase — return safe no-op responses for now.

export async function searchPlaces() { return { suggestions: [], error: 'not_configured' } }
export async function getPlaceDetails() { return { place: null, error: 'not_configured' } }
export async function findNearbyPlaces() { return { places: [], error: 'not_configured' } }

export async function locateBottleInScan({ photoUrl, photoBase64, wineName, vintage, region, grape } = {}) {
  if ((!photoUrl && !photoBase64) || !wineName) return { found: false, error: 'missing_params' }
  try {
    const res = await fetch('/api/locate-bottle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoUrl, photoBase64, wineName, vintage, region, grape }),
    })
    if (!res.ok) return { found: false, error: 'request_failed' }
    return await res.json()
  } catch (e) {
    return { found: false, error: e?.message || 'unknown' }
  }
}
