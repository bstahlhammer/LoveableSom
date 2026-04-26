import { useState } from 'react'
import { theme } from '../theme/theme.js'
import { quizSteps } from '../data/mockData.js'
import ProgressBar from '../components/ProgressBar.jsx'
import PillGroup from '../components/PillGroup.jsx'
import SliderStep from '../components/SliderStep.jsx'
import WineSearchStep from '../components/WineSearchStep.jsx'
import TopBar from '../components/TopBar.jsx'

function isStepComplete(step, answers) {
  if (!step.required) return true
  const val = answers[step.id]
  if (step.type === 'pills' && step.multi) return Array.isArray(val) && val.length > 0
  if (step.type === 'pills' && !step.multi) return val !== null && val !== undefined
  return true
}

export default function QuizScreen({ navigate, goBack, quizAnswers, onAnswerChange, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0)

  const step = quizSteps[currentStep]
  const isLast = currentStep === quizSteps.length - 1
  const canContinue = isStepComplete(step, quizAnswers)

  // Slider: ensure we always have a number
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

  const isWineSearch = step.type === 'wine_search'
  const isHate = step.mode === 'hate'

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: theme.colors.surface }}>
      <TopBar onBack={goBack} onHome={() => navigate('home')} />
      {/* Progress */}
      <div style={{ flexShrink: 0 }}>
        <ProgressBar
          current={currentStep}
          total={quizSteps.length}
          onStepClick={handleStepClick}
        />
      </div>

      {/* Step header */}
      <div style={{ flexShrink: 0, padding: `${theme.spacing.xl} ${theme.spacing.lg} ${theme.spacing.md}` }}>
        <div style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.gold, fontFamily: theme.typography.fontSans, fontWeight: theme.typography.weights.medium, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: theme.spacing.xs }}>
          Step {currentStep + 1} of {quizSteps.length}
        </div>
        <h2 style={{ fontFamily: theme.typography.fontSerif, fontSize: theme.typography.sizes.xl, fontWeight: theme.typography.weights.normal, color: isHate ? '#A32D2D' : theme.colors.text, lineHeight: 1.3, marginBottom: theme.spacing.xs }}>
          {step.title}
        </h2>
        <p style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.textMuted, fontFamily: theme.typography.fontSans }}>
          {step.subtitle}
        </p>
      </div>

      {/* Step content */}
      <div className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: `0 ${theme.spacing.lg}` }}>
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
      </div>

      {/* Footer */}
      <div style={{ flexShrink: 0, padding: theme.spacing.lg, borderTop: `0.5px solid ${theme.colors.border}` }}>
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          style={{
            width: '100%',
            padding: '16px',
            backgroundColor: canContinue ? theme.colors.brand : theme.colors.border,
            color: canContinue ? theme.colors.cream : theme.colors.textMuted,
            border: 'none',
            borderRadius: theme.radius.md,
            fontSize: theme.typography.sizes.lg,
            fontWeight: theme.typography.weights.medium,
            fontFamily: theme.typography.fontSans,
            cursor: canContinue ? 'pointer' : 'not-allowed',
            transition: 'background-color 0.15s ease',
          }}
        >
          {isLast ? 'See my taste profile' : isWineSearch ? 'Done' : 'Continue'}
        </button>

        {isWineSearch && (
          <button
            onClick={handleContinue}
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              color: theme.colors.textMuted,
              fontSize: theme.typography.sizes.sm,
              fontFamily: theme.typography.fontSans,
              cursor: 'pointer',
              marginTop: theme.spacing.sm,
              textAlign: 'center',
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
            }}
          >
            Skip this step
          </button>
        )}
      </div>
    </div>
  )
}
