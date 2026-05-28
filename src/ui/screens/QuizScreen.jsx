import { useState } from 'react'
import T from '../theme/T.js'
import { getQuizSteps } from '@/core/api'
import PillGroup from '../components/PillGroup.jsx'
import SliderStep from '../components/SliderStep.jsx'
import WineSearchStep from '../components/WineSearchStep.jsx'
import WineRatingStep from '../components/WineRatingStep.jsx'

function isStepComplete(step, answers) {
  if (!step.required) return true
  const val = answers[step.id]
  if (step.type === 'pills' && step.multi) return Array.isArray(val) && val.length > 0
  if (step.type === 'pills' && !step.multi) return val !== null && val !== undefined
  return true
}

export default function QuizScreen({ navigate, goBack, quizAnswers, onAnswerChange, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0)

  const steps = getQuizSteps()
  const step = steps[currentStep]
  const isLast = currentStep === steps.length - 1
  const canContinue = isStepComplete(step, quizAnswers)

  const sliderValue = typeof quizAnswers[step?.id] === 'number'
    ? quizAnswers[step.id]
    : step?.defaultValue ?? 50

  function handleContinue() {
    if (isLast) {
      onComplete(quizAnswers)
    } else {
      setCurrentStep(s => s + 1)
    }
  }

  function handleStepClick(idx) {
    if (idx < currentStep) setCurrentStep(idx)
  }

  const isWineSearch   = step.type === 'wine_search'
  const isWineRatings  = step.type === 'wine_ratings'
  const isOptionalSearch = isWineSearch || isWineRatings
  const isHate = step.mode === 'hate'
  const pct = Math.min(100, ((currentStep + 1) / steps.length) * 100)

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0,
      background: T.ink0, fontFamily: T.fontBody, position: 'relative', overflow: 'hidden',
    }}>
      {/* watercolor wash */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: -40, right: -30, width: 180, height: 180, borderRadius: '50%', background: T.forest300, opacity: 0.07, filter: 'blur(44px)' }} />
      </div>

      {/* top bar */}
      <div style={{ padding: '16px 22px 0', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, zIndex: 1, position: 'relative' }}>
        <button onClick={goBack} style={{ background: 'transparent', border: 'none', color: T.ink400, fontSize: 22, cursor: 'pointer', padding: 4, lineHeight: 1, flexShrink: 0 }}>←</button>
        {/* inline progress bar */}
        <div style={{ flex: 1, height: 4, background: T.ink150, borderRadius: 2, overflow: 'hidden', cursor: 'pointer' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: T.forest500, borderRadius: 2, transition: 'width 0.3s ease' }} />
        </div>
        <button onClick={() => navigate('home')} style={{ background: 'transparent', border: 'none', color: T.ink400, fontSize: 13, cursor: 'pointer', padding: 4, fontFamily: T.fontBody }}>✕</button>
      </div>

      {/* step header */}
      <div style={{ flexShrink: 0, padding: '18px 24px 12px', zIndex: 1, position: 'relative' }}>
        <div style={{ fontSize: 11, color: T.forest500, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
          Step {currentStep + 1} of {steps.length}
        </div>
        <h2 style={{
          fontFamily: T.fontDisplay, fontWeight: 500, fontSize: 26,
          color: isHate ? T.scarlet600 : T.ink900,
          lineHeight: 1.15, margin: '0 0 8px', letterSpacing: '-0.01em',
        }}>
          {step.title}
        </h2>
        {step.subtitle && (
          <p style={{ fontSize: 13, color: T.ink400, lineHeight: 1.5, margin: 0 }}>
            {step.subtitle}
          </p>
        )}
      </div>

      {/* step content */}
      <div className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '0 18px', zIndex: 1, position: 'relative', background: `linear-gradient(to bottom, ${T.forest50} 0%, ${T.ink0} 35%, ${T.ink0} 70%, ${T.cobalt50} 100%)` }}>
        {step.type === 'pills' && (
          <PillGroup
            options={step.options}
            multi={step.multi}
            value={quizAnswers[step.id] ?? (step.multi ? [] : null)}
            onChange={val => onAnswerChange(step.id, val)}
          />
        )}
        {step.type === 'slider' && (
          <SliderStep
            value={sliderValue}
            onChange={val => onAnswerChange(step.id, val)}
            labels={step.labels}
          />
        )}
        {isWineSearch && (
          <WineSearchStep
            mode={step.mode}
            value={quizAnswers[step.id] ?? []}
            onChange={val => onAnswerChange(step.id, val)}
          />
        )}
        {isWineRatings && (
          <WineRatingStep
            value={quizAnswers[step.id] ?? {}}
            onChange={val => onAnswerChange(step.id, val)}
          />
        )}
      </div>

      {/* footer */}
      <div style={{
        flexShrink: 0, padding: '12px 18px 28px',
        borderTop: `1px solid ${T.ink100}`,
        display: 'flex', flexDirection: 'column', gap: 8,
        zIndex: 1, position: 'relative', background: T.ink0,
      }}>
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          style={{
            width: '100%', padding: '15px',
            background: canContinue
              ? `linear-gradient(135deg, ${T.forest500} 0%, ${T.forest700} 100%)`
              : T.ink150,
            color: canContinue ? 'white' : T.ink400,
            border: 'none', borderRadius: 100,
            fontFamily: T.fontBody, fontSize: 15, fontWeight: 600,
            cursor: canContinue ? 'pointer' : 'not-allowed',
            transition: 'background-color 0.15s ease',
          }}
        >
          {isLast ? 'See my taste profile →' : isOptionalSearch ? 'Done' : 'Continue →'}
        </button>
        {isOptionalSearch && (
          <button
            onClick={handleContinue}
            style={{
              background: 'none', border: 'none', color: T.ink400,
              fontSize: 13, fontFamily: T.fontBody, cursor: 'pointer',
              textDecoration: 'underline', textUnderlineOffset: 3, padding: 4,
            }}
          >
            Skip this step
          </button>
        )}
      </div>
    </div>
  )
}
