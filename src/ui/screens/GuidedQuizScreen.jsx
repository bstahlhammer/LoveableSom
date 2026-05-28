import { useState, useMemo } from 'react'
import T from '../theme/T.js'
import {
  getGuidedInitialNode,
  getGuidedNode,
  getGuidedNextNode,
} from '@/core/api'
import QuizOptionCard from '../components/QuizOptionCard.jsx'

export default function GuidedQuizScreen({ navigate, goBack, onComplete }) {
  const [path,    setPath]    = useState([getGuidedInitialNode()])
  const [answers, setAnswers] = useState({})

  const currentId = path[path.length - 1]
  const node      = getGuidedNode(currentId)

  const estimatedTotal = Math.max(path.length + 2, 6)
  const stepIndex      = path.length - 1
  const pct = Math.min(100, ((stepIndex + 1) / estimatedTotal) * 100)

  const currentAnswer = answers[currentId]

  const canContinue = useMemo(() => {
    if (!node) return false
    if (node.type === 'multi') {
      return Array.isArray(currentAnswer?.optionIds) && currentAnswer.optionIds.length > 0
    }
    return Boolean(currentAnswer?.optionId)
  }, [node, currentAnswer])

  if (!node) return null

  function handleSingleSelect(opt) {
    setAnswers(prev => ({ ...prev, [currentId]: { optionId: opt.id, notSure: !!opt.notSure } }))
  }

  function handleMultiToggle(opt) {
    setAnswers(prev => {
      const existing = prev[currentId]?.optionIds ?? []
      const next = existing.includes(opt.id)
        ? existing.filter(x => x !== opt.id)
        : [...existing, opt.id]
      return { ...prev, [currentId]: { optionIds: next } }
    })
  }

  function handleContinue() {
    const answer = answers[currentId]
    const nextId = getGuidedNextNode(currentId, answer, { ...answers, [currentId]: answer })
    if (nextId) {
      setPath(p => [...p, nextId])
    } else {
      onComplete(answers)
    }
  }

  function handleBack() {
    if (path.length > 1) {
      setPath(p => p.slice(0, -1))
    } else {
      goBack()
    }
  }

  function handleSkip() {
    const notSureOpt = node.options.find(o => o.notSure)
    let answerForBranch = answers[currentId]
    if (notSureOpt) {
      answerForBranch = { optionId: notSureOpt.id, notSure: true }
      setAnswers(prev => ({ ...prev, [currentId]: answerForBranch }))
    } else if (node.type === 'multi') {
      answerForBranch = { optionIds: [] }
      setAnswers(prev => ({ ...prev, [currentId]: answerForBranch }))
    }
    const nextId = getGuidedNextNode(currentId, answerForBranch, { ...answers, [currentId]: answerForBranch })
    if (nextId) setPath(p => [...p, nextId])
    else onComplete({ ...answers, [currentId]: answerForBranch ?? answers[currentId] })
  }

  const isLast = !node.options.some(o => (typeof o.next === 'function' ? o.next(answers) : o.next))
                  && (typeof node.next === 'function' ? !node.next(answers) : !node.next)

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0,
      background: T.ink0, fontFamily: T.fontBody, position: 'relative', overflow: 'hidden',
    }}>
      {/* watercolor wash */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: -50, left: -30, width: 200, height: 200, borderRadius: '50%', background: T.forest300, opacity: 0.07, filter: 'blur(52px)' }} />
        <div style={{ position: 'absolute', bottom: 80, right: -30, width: 160, height: 160, borderRadius: '50%', background: T.cobalt300, opacity: 0.05, filter: 'blur(40px)' }} />
      </div>

      {/* top bar */}
      <div style={{ padding: '16px 22px 0', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, zIndex: 1, position: 'relative' }}>
        <button onClick={handleBack} style={{ background: 'transparent', border: 'none', color: T.ink400, fontSize: 22, cursor: 'pointer', padding: 4, lineHeight: 1, flexShrink: 0 }}>←</button>
        <div style={{ flex: 1, height: 4, background: T.ink150, borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: T.forest500, borderRadius: 2, transition: 'width 0.3s ease' }} />
        </div>
        <button onClick={() => navigate('home')} style={{ background: 'transparent', border: 'none', color: T.ink400, fontSize: 13, cursor: 'pointer', padding: 4, fontFamily: T.fontBody }}>✕</button>
      </div>

      {/* header */}
      <div style={{ flexShrink: 0, padding: '18px 24px 12px', zIndex: 1, position: 'relative' }}>
        <div style={{ fontSize: 11, color: T.forest500, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
          Level {node.level} · {node.levelLabel}
        </div>
        <h2 style={{ fontFamily: T.fontDisplay, fontWeight: 500, fontSize: 26, color: T.ink900, lineHeight: 1.15, margin: '0 0 8px', letterSpacing: '-0.01em' }}>
          {node.question}
        </h2>
        {node.subtitle && (
          <p style={{ fontSize: 13, color: T.ink400, lineHeight: 1.5, margin: 0 }}>
            {node.subtitle}
          </p>
        )}
      </div>

      {/* options */}
      <div className="hide-scrollbar" style={{
        flex: 1, overflowY: 'auto', padding: '0 18px 16px',
        display: 'flex', flexDirection: 'column', gap: 8,
        zIndex: 1, position: 'relative',
        background: `linear-gradient(to bottom, ${T.forest50} 0%, ${T.ink0} 35%, ${T.ink0} 70%, ${T.cobalt50} 100%)`,
      }}>
        {node.options.map(opt => {
          const selected = node.type === 'multi'
            ? Boolean(currentAnswer?.optionIds?.includes(opt.id))
            : currentAnswer?.optionId === opt.id
          return (
            <QuizOptionCard
              key={opt.id}
              label={opt.label}
              hint={opt.hint}
              selected={selected}
              onClick={() => node.type === 'multi'
                ? handleMultiToggle(opt)
                : handleSingleSelect(opt)
              }
            />
          )
        })}
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
            transition: 'all 0.15s ease',
          }}
        >
          {isLast ? 'See my taste profile →' : 'Continue →'}
        </button>
        <button
          onClick={handleSkip}
          style={{
            background: 'none', border: 'none', color: T.ink400,
            fontSize: 13, fontFamily: T.fontBody, cursor: 'pointer',
            textDecoration: 'underline', textUnderlineOffset: 3, padding: 4,
          }}
        >
          Not sure, skip this question
        </button>
      </div>
    </div>
  )
}
