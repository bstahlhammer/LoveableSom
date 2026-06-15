import { useState, useCallback, useEffect, useRef } from 'react'
import {
  inferPalateFromRatings,
  nearestTasteProfile,
  buildTasteIdentity,
  groupRatingsByBucket,
  computePalateFromGuidedAnswers,
  getTasteProfiles,
  findWineImage,
} from '@/core/api'
import DeviceFrame from './ui/components/DeviceFrame.jsx'
import ScreenTransition from './ui/components/ScreenTransition.jsx'
import Toast from './ui/components/Toast.jsx'
import BottomNav from './ui/components/BottomNav.jsx'
import FeedbackFAB from './ui/components/FeedbackFAB.jsx'
import { useAuth } from './ui/hooks/useAuth.js'
import { useScanHistory } from './ui/hooks/useScanHistory.js'
import { useTasteProfileSync } from './ui/hooks/useTasteProfileSync.js'

import HomeScreen from './ui/screens/HomeScreen.jsx'
import ScanPromptScreen from './ui/screens/ScanPromptScreen.jsx'
import ScanningScreen from './ui/screens/ScanningScreen.jsx'
import AnonResultsScreen from './ui/screens/AnonResultsScreen.jsx'
import TasteBuilderScreen from './ui/screens/TasteBuilderScreen.jsx'
import QuizScreen from './ui/screens/QuizScreen.jsx'
import GuidedQuizScreen from './ui/screens/GuidedQuizScreen.jsx'
import RateBottlesScreen from './ui/screens/RateBottlesScreen.jsx'
import ProfileRevealScreen from './ui/screens/ProfileRevealScreen.jsx'
import PersonalizedResultsScreen from './ui/screens/PersonalizedResultsScreen.jsx'
import WineDetailScreen from './ui/screens/WineDetailScreen.jsx'
import AuthScreen from './ui/screens/AuthScreen.jsx'
import HistoryScreen from './ui/screens/HistoryScreen.jsx'
import ProfileScreen from './ui/screens/ProfileScreen.jsx'
import MyWinesScreen from './ui/screens/MyWinesScreen.jsx'
import ScanReviewScreen from './ui/screens/ScanReviewScreen.jsx'
import ExploreScreen from './ui/screens/ExploreScreen.jsx'
import AddWineSheet from './ui/components/AddWineSheet.jsx'
import { placeFromPhoto } from './ui/utils/photoGeo.js'

const TAB_FOR_SCREEN = {
  home: 'home',
  myWines: 'myWines',
  history: 'history',
  profile: 'profile',
  profileReveal: 'profile',
}
const SCREENS_WITH_NAV = new Set(['home', 'myWines', 'history', 'profile'])

const INITIAL_QUIZ_ANSWERS = {
  flavorPreferences: [],
  goToDrink: null,
  mealAppeal: null,
  boldness: 50,
  sweetness: null,
  wineRatings: {},
  ratedWineData: {},
  guidedAnswers: {},
  lovedWineIds: [],
  hatedWineIds: [],
  aiPalate: null,
  archetypeSeed: null,
}

const SWEETNESS_MAP = {
  'I love sweet':              80,
  'Slightly sweet is perfect': 55,
  'Dry is fine':               30,
  'Bone dry always':           10,
}

function deriveProfile(quizAnswers) {
  const ratings = quizAnswers.wineRatings ?? {}
  const externalWineData = quizAnswers.ratedWineData ?? {}
  const inferredR = inferPalateFromRatings(ratings, externalWineData)

  const guided  = quizAnswers.guidedAnswers ?? {}
  const inferredG = computePalateFromGuidedAnswers(guided)

  const aiPalate = quizAnswers.aiPalate ?? null
  // aiPalate may carry a nested `character` field when describe-palate detected character axes
  const aiPalateStructural = aiPalate ? { body: aiPalate.body, sweetness: aiPalate.sweetness, tannin: aiPalate.tannin, acidity: aiPalate.acidity } : null
  const aiCharacter = aiPalate?.character ?? null
  const aiConfidence = aiPalate ? 1.5 : 0

  // Archetype seed: user-picked starter profile, soft signal.
  const seedId = quizAnswers.archetypeSeed ?? null
  const seedProfile = seedId ? getTasteProfiles().find(p => p.id === seedId) : null
  const seedPalate = seedProfile?.palate ?? null
  const seedConfidence = seedPalate ? 0.8 : 0

  const hasSlider = quizAnswers.boldness !== undefined || quizAnswers.sweetness
  const boldness     = quizAnswers.boldness ?? 50
  const sweetnessVal = SWEETNESS_MAP[quizAnswers.sweetness] ?? 30
  const sliderPalate = {
    body:      boldness,
    sweetness: sweetnessVal,
    tannin:    boldness * 0.9,
    acidity:   Math.max(0, 100 - boldness * 0.5),
  }
  const sliderConfidence = hasSlider && quizAnswers.sweetness ? 0.3 : 0

  const sources = [
    { palate: inferredR.palate,    weight: inferredR.confidence },
    { palate: inferredG.palate,    weight: inferredG.confidence },
    { palate: aiPalateStructural,  weight: aiConfidence },
    { palate: seedPalate,          weight: seedConfidence },
    { palate: sliderPalate,        weight: sliderConfidence },
  ].filter(s => s.palate)
  const totalWeight = sources.reduce((s, x) => s + x.weight, 0)

  let palate
  if (totalWeight === 0) {
    palate = { ...sliderPalate }
  } else {
    palate = { body: 0, sweetness: 0, tannin: 0, acidity: 0 }
    for (const { palate: p, weight: w } of sources) {
      palate.body      += p.body      * w
      palate.sweetness += p.sweetness * w
      palate.tannin    += p.tannin    * w
      palate.acidity   += p.acidity   * w
    }
    palate.body      = Math.round(palate.body      / totalWeight)
    palate.sweetness = Math.round(palate.sweetness / totalWeight)
    palate.tannin    = Math.round(palate.tannin    / totalWeight)
    palate.acidity   = Math.round(palate.acidity   / totalWeight)
  }

  const archetype = nearestTasteProfile(palate)
  const ratingsByBucket = groupRatingsByBucket(ratings)

  // Merge character: AI description takes priority, fall back to inferred-from-ratings
  const inferredChar = inferredR.character ?? null
  let character = null
  if (aiCharacter || inferredChar) {
    const axes = ['earthiness', 'funk', 'mineral', 'oak', 'floral']
    character = {}
    for (const axis of axes) {
      character[axis] = aiCharacter?.[axis] != null ? aiCharacter[axis] : (inferredChar?.[axis] ?? null)
    }
    if (Object.values(character).every(v => v == null)) character = null
  }

  // Override display identity when character axes are expressed
  const identity = buildTasteIdentity(palate, character)

  return {
    ...archetype,
    name: identity?.name ?? archetype.name,
    description: identity?.description ?? archetype.description,
    archetype,           // preserve structural archetype for internal use
    palate,
    character,
    ratingsByBucket,
    inferenceConfidence: Math.min(1, totalWeight),
    flavorCharacter: inferredG.flavorCharacter,
    lovedWineIds: ratingsByBucket.loved ?? [],
    hatedWineIds: ratingsByBucket.hated ?? [],
    hasAiSignal: !!aiPalate,
  }
}

function anonDefaultSort(buyingFor, scanIntent) {
  const tags = scanIntent?.tags ?? []
  if (tags.includes('splurge') || buyingFor === 'gift') return 'value'
  return 'crowd'
}

function personalizedDefaultSort(buyingFor, scanIntent) {
  const tags = scanIntent?.tags ?? []
  if (tags.includes('splurge') || buyingFor === 'gift') return 'value'
  if (tags.includes('crowd') || buyingFor === 'group') return 'crowd'
  return 'match'
}

export default function App() {
  const auth = useAuth()
  const [screen,       setScreen]       = useState('home')
  const [history,      setHistory]      = useState([])
  const [direction,    setDirection]    = useState('forward')
  const [selectedWine, setSelectedWine] = useState(null)
  const [returnScreen, setReturnScreen] = useState('anonResults')
  const [buyingFor,    setBuyingFor]    = useState(null)
  const [scanIntent,   setScanIntent]   = useState(null) // { tags: string[], maker?, region?, varietal? }
  const [quizAnswers,  setQuizAnswers]  = useState(INITIAL_QUIZ_ANSWERS)
  const [tasteProfile, setTasteProfile] = useState(null)
  const [toast,        setToast]        = useState(null)
  const [pendingAfterAuth, setPendingAfterAuth] = useState(null)
  const [authMode, setAuthMode] = useState('full')

  const [hasScanned, setHasScanned] = useState(false)
  const [scanFile, setScanFile] = useState(null)
  const [scannedWines, setScannedWines] = useState(null)
  // Active scan context for the shelf-spotlight feature on wine detail
  const [activeScan, setActiveScan] = useState(null) // { scanId, photoUrl }
  // In-memory cache: scanId → photoBase64. Lets history scans reuse the photo
  // that was already decoded in-browser, even when Supabase Storage isn't available.
  const scanPhotoCacheRef = useRef(new Map())
  // Scan-review flow: a past scan + its wines being rated by the user.
  const [reviewScan, setReviewScan] = useState(null) // raw row from `scans`
  const [reviewWines, setReviewWines] = useState([])
  const [showAddWine, setShowAddWine] = useState(false)
  const [resultsViewState, setResultsViewState] = useState({})
  const [resultsViewKey, setResultsViewKey] = useState(0)

  const { saveScan, loadScan, getPhotoUrl } = useScanHistory()
  const { saveProfile, loadProfile } = useTasteProfileSync(auth.user?.id)

  // Hydrate taste profile from DB when user signs in
  useEffect(() => {
    if (!auth.user?.id) return
    let cancelled = false
    ;(async () => {
      const { profile } = await loadProfile()
      if (!cancelled && profile && !tasteProfile) setTasteProfile(profile)
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.user?.id])

  // Re-derive and persist profile whenever wine ratings change
  useEffect(() => {
    if (!auth.user?.id) return
    if (Object.keys(quizAnswers.wineRatings).length === 0) return
    const profile = deriveProfile(quizAnswers)
    setTasteProfile(profile)
    saveProfile(profile)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizAnswers.wineRatings])

  const navigate = useCallback((to) => {
    // Screens accessible without an account — scan, browse, and taste-profile flows.
    // Auth is only required for personal data screens: history, my wines, profile.
    const GUEST_SCREENS = new Set([
      'home', 'auth',
      'scanPrompt', 'scanning', 'anonResults', 'wineDetail',
      'quizIntro', 'quiz', 'guidedQuiz', 'rateBottles',
      'profileReveal', 'personalizedResults', 'explore',
    ])
    if (!auth.user && !GUEST_SCREENS.has(to)) {
      setPendingAfterAuth(to)
      setAuthMode('full')
      setDirection('forward')
      setHistory(h => [...h, screen])
      setScreen('auth')
      return
    }
    setDirection('forward')
    setHistory(h => [...h, screen])
    if (to === 'scanning') setHasScanned(true)
    setScreen(to)
  }, [screen, auth.user])

  const handleEmailSignIn = useCallback(() => {
    setAuthMode('email')
    setDirection('forward')
    setHistory(h => [...h, screen])
    setScreen('auth')
  }, [screen])

  const goBack = useCallback(() => {
    setHistory(h => {
      if (h.length === 0) return h
      const prev = h[h.length - 1]
      // Skip the scanning screen when results already exist — going back
      // would otherwise remount ScanningScreen and trigger a fresh scan.
      if (prev === 'scanning' && scannedWines && h.length >= 2) {
        setDirection('back')
        setScreen(h[h.length - 2])
        return h.slice(0, -2)
      }
      setDirection('back')
      setScreen(prev)
      return h.slice(0, -1)
    })
  }, [scannedWines])

  const handleAnswerChange = useCallback((key, value) => {
    setQuizAnswers(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleQuizComplete = useCallback((answers) => {
    const merged = { ...quizAnswers, ...answers }
    setQuizAnswers(merged)
    const profile = deriveProfile(merged)
    setTasteProfile(profile)
    saveProfile(profile)
    setDirection('forward')
    setHistory(h => [...h, screen])
    setScreen('profileReveal')
  }, [screen, quizAnswers, saveProfile])

  const handleGuidedComplete = useCallback((guidedAnswers) => {
    const merged = { ...quizAnswers, guidedAnswers }
    setQuizAnswers(merged)
    const profile = deriveProfile(merged)
    setTasteProfile(profile)
    saveProfile(profile)
    setDirection('forward')
    setHistory(h => [...h, screen])
    setScreen('profileReveal')
  }, [screen, quizAnswers, saveProfile])

  const showToast = useCallback((msg) => {
    setToast(msg)
    const t = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(t)
  }, [])

  const handleWineSelect = useCallback((wine, from) => {
    setSelectedWine(wine)
    setReturnScreen(from)
    setDirection('forward')
    setHistory(h => [...h, screen])
    setScreen('wineDetail')
  }, [screen])

  const handleRate = useCallback(({ stars, tasteMatch, comment, wineId, bucketId, wineData } = {}) => {
    if (wineId && bucketId) {
      setQuizAnswers(prev => ({
        ...prev,
        wineRatings: { ...prev.wineRatings, [wineId]: bucketId },
        ratedWineData: wineData ? { ...prev.ratedWineData, [wineId]: wineData } : prev.ratedWineData,
      }))
    }
    const starStr = stars ? '★'.repeat(stars) + ' ' : ''
    const matchStr = tasteMatch ? ` · ${tasteMatch}` : ''
    showToast(`${starStr}Rating saved${matchStr}`)
    setTimeout(() => {
      setDirection('back')
      setHistory(h => h.slice(0, -1))
      setScreen(returnScreen)
    }, 1200)
  }, [returnScreen, showToast])

  const handleAuthed = useCallback(() => {
    if (pendingAfterAuth) {
      const dest = pendingAfterAuth
      setPendingAfterAuth(null)
      setDirection('forward')
      setScreen(dest)
    } else {
      setDirection('back')
      setHistory(h => h.slice(0, -1))
      setScreen(prev => history[history.length - 1] ?? 'home')
    }
    showToast('Signed in')
  }, [pendingAfterAuth, history, showToast])

  function renderScreen() {
    const nav = { navigate, goBack }
    switch (screen) {
      case 'home':
        return <HomeScreen
          {...nav}
          auth={auth}
          tasteProfile={tasteProfile}
          hasActiveSession={hasScanned && !!scannedWines}
          activeWineCount={
            Array.isArray(scannedWines?.wines) ? scannedWines.wines.length
            : Array.isArray(scannedWines) ? scannedWines.length
            : 0
          }
          onResumeScan={() => navigate(tasteProfile ? 'personalizedResults' : 'anonResults')}
          onEmailSignIn={handleEmailSignIn}
          onAddWine={() => setShowAddWine(true)}
          onOpenScan={async (scanRow) => {
            const { wines } = await loadScan(scanRow.id)
            setReviewScan(scanRow)
            setReviewWines(wines || [])
            navigate('scanReview')
          }}
        />
      case 'scanReview':
        return (
          <ScanReviewScreen
            scan={reviewScan}
            wines={reviewWines}
            goBack={goBack}
            onSaved={() => {
              setDirection('back')
              setHistory(h => h.slice(0, -1))
              setScreen('home')
            }}
            onToast={showToast}
          />
        )
      case 'auth':
        return <AuthScreen {...nav} onAuthed={handleAuthed} authMode={authMode} />
      case 'scanPrompt':
        return (
          <ScanPromptScreen
            {...nav}
            tasteProfile={tasteProfile}
            onScan={(file, intent) => { setScanFile(file); setScannedWines(null); setBuyingFor(null); setScanIntent(intent ?? null) }}
          />
        )
      case 'scanning':
        return (
          <ScanningScreen
            {...nav}
            file={scanFile}
            buyingFor={buyingFor}
            onBuyingForChange={setBuyingFor}
            scanIntent={scanIntent}
            onScanIntentChange={setScanIntent}
            tasteProfile={tasteProfile}
            onScanComplete={async (payload) => {
              setScannedWines(payload)
              const wines = Array.isArray(payload?.wines) ? payload.wines : []
              const scanType = payload?.scanType ?? 'list'
              const photoBase64 = payload?.photoBase64 ?? null
              // Set activeScan immediately so ShelfSpotlight is ready before navigation
              setActiveScan(photoBase64 ? { photoBase64, scanType } : null)
              if (wines.length && auth.user) {
                const place = await placeFromPhoto(scanFile).catch(() => null)
                const { scan } = await saveScan({
                  wines,
                  photoFile: scanFile,
                  buyingFor,
                  place: place || undefined,
                  locationLabel: place?.name,
                  scanType,
                })
                if (scan) {
                  const photoUrl = scan.photo_path ? await getPhotoUrl(scan.photo_path) : null
                  setActiveScan({ scanId: scan.id, photoUrl, photoBase64, scanType })
                  if (photoBase64) scanPhotoCacheRef.current.set(scan.id, photoBase64)
                }
              }
            }}
          />
        )
      case 'anonResults':
        return (
          <AnonResultsScreen
            key={resultsViewKey}
            {...nav}
            tasteProfile={tasteProfile}
            scannedWines={scannedWines}
            scanIntent={scanIntent}
            buyingFor={buyingFor}
            scanId={activeScan?.scanId}
            onWineSelect={w => handleWineSelect(w, 'anonResults')}
            sortKey={resultsViewState.anonResults?.sortKey ?? anonDefaultSort(buyingFor, scanIntent)}
            onSortChange={k => setResultsViewState(prev => ({
              ...prev,
              anonResults: { ...(prev.anonResults ?? {}), sortKey: k },
            }))}
          />
        )
      case 'quizIntro':
        return (
          <TasteBuilderScreen
            {...nav}
            initialRatings={quizAnswers.wineRatings}
            initialAiPalate={quizAnswers.aiPalate}
            initialArchetypeSeed={quizAnswers.archetypeSeed}
            initialRatedWineData={quizAnswers.ratedWineData}
            onComplete={handleQuizComplete}
          />
        )
      case 'guidedQuiz':
        return (
          <GuidedQuizScreen
            {...nav}
            onComplete={handleGuidedComplete}
          />
        )
      case 'rateBottles':
        return (
          <RateBottlesScreen
            {...nav}
            initialRatings={quizAnswers.wineRatings}
            initialAiPalate={quizAnswers.aiPalate}
            initialRatedWineData={quizAnswers.ratedWineData}
            onComplete={handleQuizComplete}
          />
        )
      case 'quiz':
        return (
          <QuizScreen
            {...nav}
            quizAnswers={quizAnswers}
            onAnswerChange={handleAnswerChange}
            onComplete={handleQuizComplete}
          />
        )
      case 'profileReveal':
        return (
          <ProfileRevealScreen
            {...nav}
            tasteProfile={tasteProfile}
            hasScanned={hasScanned}
            scannedWines={scannedWines}
            onWineSelect={w => handleWineSelect(w, 'profileReveal')}
          />
        )
      case 'personalizedResults':
        return (
          <PersonalizedResultsScreen
            key={resultsViewKey}
            {...nav}
            tasteProfile={tasteProfile}
            buyingFor={buyingFor}
            scanIntent={scanIntent}
            scannedWines={scannedWines}
            scanId={activeScan?.scanId}
            mealAppeal={quizAnswers.guidedAnswers?.mealAppeal ?? quizAnswers.mealAppeal ?? null}
            onWineSelect={w => handleWineSelect(w, 'personalizedResults')}
            sortKey={resultsViewState.personalizedResults?.sortKey ?? personalizedDefaultSort(buyingFor, scanIntent)}
            onSortChange={k => setResultsViewState(prev => ({
              ...prev,
              personalizedResults: { ...(prev.personalizedResults ?? {}), sortKey: k },
            }))}
          />
        )
      case 'wineDetail':
        return (
          <WineDetailScreen
            {...nav}
            wine={selectedWine}
            tasteProfile={tasteProfile}
            activeScan={activeScan}
            onRate={handleRate}
            onWineSelect={w => handleWineSelect(w, 'wineDetail')}
          />
        )
      case 'explore':
        return <ExploreScreen {...nav} tasteProfile={tasteProfile} />
      case 'myWines':
        return <MyWinesScreen {...nav} tasteProfile={tasteProfile} onWineSelect={w => handleWineSelect(w, 'myWines')} />
      case 'history':
        return (
          <HistoryScreen
            {...nav}
            onOpenScan={async (scanRow) => {
              // Reset sort/filter state synchronously (before any await) so these
              // commits land before PersonalizedResultsScreen mounts on navigate.
              setBuyingFor(null)
              setScanIntent(null)
              setResultsViewState(prev => ({ ...prev, personalizedResults: null, anonResults: null }))
              setResultsViewKey(k => k + 1)
              const { wines: rawWines } = await loadScan(scanRow.id)
              const wines = (rawWines || []).map((w, i) => ({ ...w, _scanIdx: i, imageUrl: w.imageUrl ?? findWineImage(w.name) }))
              if (wines?.length) {
                setScannedWines({ wines, readability: 'good', retakeReasons: [], message: '' })
                setHasScanned(true)
                const photoUrl = scanRow.photo_path ? await getPhotoUrl(scanRow.photo_path) : null
                const cachedPhoto = scanPhotoCacheRef.current.get(scanRow.id) ?? null
                setActiveScan({ scanId: scanRow.id, photoUrl, photoBase64: cachedPhoto, scanType: scanRow.scan_type ?? 'list' })
                navigate(tasteProfile ? 'personalizedResults' : 'anonResults')
              }
            }}
          />
        )
      case 'profile':
        return (
          <ProfileScreen
            {...nav}
            auth={auth}
            tasteProfile={tasteProfile}
            onProfileUpdate={setTasteProfile}
          />
        )
      default:
        return <HomeScreen {...nav} auth={auth} onEmailSignIn={handleEmailSignIn} />
    }
  }

  const showNav = SCREENS_WITH_NAV.has(screen) && !!auth.user
  const activeTab = TAB_FOR_SCREEN[screen]

  return (
    <DeviceFrame>
      <ScreenTransition screenKey={screen} direction={direction}>
        {renderScreen()}
      </ScreenTransition>
      {showNav && <BottomNav activeTab={activeTab} navigate={navigate} />}
      {toast && <Toast message={toast} />}
      {auth.user && (
        <FeedbackFAB
          currentScreen={screen}
          userId={auth.user.id}
          showToast={showToast}
        />
      )}
      {showAddWine && (
        <AddWineSheet
          onClose={() => setShowAddWine(false)}
          onSaved={(label) => {
            setShowAddWine(false)
            showToast(label || 'Wine logged')
          }}
        />
      )}
    </DeviceFrame>
  )
}
