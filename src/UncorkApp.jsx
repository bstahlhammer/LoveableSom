import { useState, useCallback } from 'react'
import { tasteProfiles } from './data/mockData.js'
import DeviceFrame from './components/DeviceFrame.jsx'
import ScreenTransition from './components/ScreenTransition.jsx'
import Toast from './components/Toast.jsx'

import HomeScreen from './screens/HomeScreen.jsx'
import ScanPromptScreen from './screens/ScanPromptScreen.jsx'
import ScanningScreen from './screens/ScanningScreen.jsx'
import AnonResultsScreen from './screens/AnonResultsScreen.jsx'
import QuizIntroScreen from './screens/QuizIntroScreen.jsx'
import QuizScreen from './screens/QuizScreen.jsx'
import ProfileRevealScreen from './screens/ProfileRevealScreen.jsx'
import PersonalizedResultsScreen from './screens/PersonalizedResultsScreen.jsx'
import WineDetailScreen from './screens/WineDetailScreen.jsx'

const INITIAL_QUIZ_ANSWERS = {
  flavorPreferences: [],
  goToDrink: null,
  mealAppeal: null,
  boldness: 50,
  sweetness: null,
  lovedWineIds: [],
  hatedWineIds: [],
}

const SWEETNESS_MAP = {
  'I love sweet':             80,
  'Slightly sweet is perfect': 55,
  'Dry is fine':              30,
  'Bone dry always':          10,
}

function deriveProfile(quizAnswers) {
  const boldness    = quizAnswers.boldness ?? 50
  const sweetnessVal = SWEETNESS_MAP[quizAnswers.sweetness] ?? 30

  const palate = {
    body:      boldness,
    sweetness: sweetnessVal,
    tannin:    boldness * 0.9,
    acidity:   Math.max(0, 100 - boldness * 0.5),
  }

  let best = tasteProfiles[0]
  let bestDist = Infinity

  for (const profile of tasteProfiles) {
    const p = profile.palate
    const dist = Math.sqrt(
      (palate.body      - p.body)      ** 2 +
      (palate.sweetness - p.sweetness) ** 2 +
      (palate.tannin    - p.tannin)    ** 2 +
      (palate.acidity   - p.acidity)   ** 2
    )
    if (dist < bestDist) { bestDist = dist; best = profile }
  }

  return {
    ...best,
    lovedWineIds: quizAnswers.lovedWineIds ?? [],
    hatedWineIds: quizAnswers.hatedWineIds ?? [],
  }
}

export default function App() {
  const [screen,       setScreen]       = useState('home')
  const [history,      setHistory]      = useState([])
  const [direction,    setDirection]    = useState('forward')
  const [selectedWine, setSelectedWine] = useState(null)
  const [returnScreen, setReturnScreen] = useState('anonResults')
  const [buyingFor,    setBuyingFor]    = useState('me')
  const [quizAnswers,  setQuizAnswers]  = useState(INITIAL_QUIZ_ANSWERS)
  const [tasteProfile, setTasteProfile] = useState(null)
  const [toast,        setToast]        = useState(null)

  const navigate = useCallback((to) => {
    setDirection('forward')
    setHistory(h => [...h, screen])
    setScreen(to)
  }, [screen])

  const goBack = useCallback(() => {
    setHistory(h => {
      if (h.length === 0) return h
      const prev = h[h.length - 1]
      setDirection('back')
      setScreen(prev)
      return h.slice(0, -1)
    })
  }, [])

  const handleAnswerChange = useCallback((key, value) => {
    setQuizAnswers(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleQuizComplete = useCallback((answers) => {
    const profile = deriveProfile(answers)
    setTasteProfile(profile)
    setDirection('forward')
    setHistory(h => [...h, screen])
    setScreen('profileReveal')
  }, [screen])

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

  const handleRate = useCallback((label) => {
    showToast(`${label === 'Love it' ? '❤️' : label === 'Pretty good' ? '👍' : label === 'Not sure' ? '🤷' : '👎'} Saved: ${label}`)
    setTimeout(() => {
      setDirection('back')
      setHistory(h => h.slice(0, -1))
      setScreen(returnScreen)
    }, 1200)
  }, [returnScreen, showToast])

  function renderScreen() {
    const nav = { navigate, goBack }
    switch (screen) {
      case 'home':
        return <HomeScreen {...nav} />
      case 'scanPrompt':
        return (
          <ScanPromptScreen
            {...nav}
            buyingFor={buyingFor}
            onBuyingForChange={setBuyingFor}
          />
        )
      case 'scanning':
        return <ScanningScreen {...nav} />
      case 'anonResults':
        return (
          <AnonResultsScreen
            {...nav}
            tasteProfile={tasteProfile}
            onWineSelect={w => handleWineSelect(w, 'anonResults')}
          />
        )
      case 'quizIntro':
        return <QuizIntroScreen {...nav} />
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
        return <ProfileRevealScreen {...nav} tasteProfile={tasteProfile} />
      case 'personalizedResults':
        return (
          <PersonalizedResultsScreen
            {...nav}
            tasteProfile={tasteProfile}
            buyingFor={buyingFor}
            onWineSelect={w => handleWineSelect(w, 'personalizedResults')}
          />
        )
      case 'wineDetail':
        return (
          <WineDetailScreen
            {...nav}
            wine={selectedWine}
            tasteProfile={tasteProfile}
            onRate={handleRate}
          />
        )
      default:
        return <HomeScreen {...nav} />
    }
  }

  return (
    <DeviceFrame>
      <ScreenTransition screenKey={screen} direction={direction}>
        {renderScreen()}
      </ScreenTransition>
      {toast && <Toast message={toast} />}
    </DeviceFrame>
  )
}
