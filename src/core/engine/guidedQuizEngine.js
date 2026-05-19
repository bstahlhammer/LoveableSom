import { guidedQuizTree, GUIDED_INITIAL_NODE, NEUTRAL_BASELINE } from '../data/guidedQuizTree.js'

const AXES = ['body', 'sweetness', 'tannin', 'acidity']

/** Initial question id. */
export function getInitialNode() {
  return GUIDED_INITIAL_NODE
}

/** Look up a node by id. */
export function getNode(id) {
  return guidedQuizTree[id] ?? null
}

/**
 * Resolve the next node id given the current node and the user's answer.
 * `answer` shape:
 *   - single-choice: { optionId: string, notSure?: boolean }
 *   - multi-choice : { optionIds: string[] }
 * `allAnswers` is the full { [nodeId]: answer } map so branching functions
 * can inspect prior choices.
 */
export function getNextNode(currentId, answer, allAnswers) {
  const node = getNode(currentId)
  if (!node) return null

  // Multi-select nodes use the node-level `next`
  if (node.type === 'multi') {
    return typeof node.next === 'function' ? node.next(allAnswers) : node.next ?? null
  }

  // Single-select uses the chosen option's `next`
  const opt = node.options.find(o => o.id === answer?.optionId)
  if (!opt) return null
  return typeof opt.next === 'function' ? opt.next(allAnswers) : opt.next ?? null
}

/**
 * Compute palate from a map of guided-quiz answers.
 *
 * @param {Record<string, { optionId?: string, optionIds?: string[], notSure?: boolean }>} answers
 * @returns {{
 *   palate: { body, sweetness, tannin, acidity },
 *   flavorCharacter: 'fruity' | 'savory' | 'balanced' | null,
 *   confidence: number,                 // 0..1
 *   answeredCount: number,
 *   confidentCount: number,
 * }}
 */
export function computePalateFromGuidedAnswers(answers) {
  const acc = { ...NEUTRAL_BASELINE }
  let answeredCount = 0
  let confidentCount = 0
  let flavorCharacter = null

  for (const [nodeId, answer] of Object.entries(answers || {})) {
    const node = getNode(nodeId)
    if (!node || !answer) continue
    answeredCount++

    if (node.type === 'multi') {
      const ids = answer.optionIds ?? []
      if (ids.length > 0) confidentCount++
      for (const optId of ids) {
        const opt = node.options.find(o => o.id === optId)
        if (!opt) continue
        applyDelta(acc, opt.palate)
        if (opt.flavor) flavorCharacter = opt.flavor
      }
    } else {
      const opt = node.options.find(o => o.id === answer.optionId)
      if (!opt) continue
      if (!opt.notSure) confidentCount++
      applyDelta(acc, opt.palate)
      if (opt.flavor) flavorCharacter = opt.flavor
    }
  }

  // Clamp
  for (const axis of AXES) {
    acc[axis] = Math.max(0, Math.min(100, Math.round(acc[axis])))
  }

  // Each confident answer adds ~0.2 confidence; 5 confident answers = full confidence.
  // "Not sure" answers don't count. Capped at 1.
  const ANSWERS_FOR_FULL_CONFIDENCE = 5
  const confidence = answeredCount === 0
    ? 0
    : Math.min(1, confidentCount / ANSWERS_FOR_FULL_CONFIDENCE)

  return { palate: acc, flavorCharacter, confidence, answeredCount, confidentCount }
}

function applyDelta(acc, delta) {
  if (!delta) return
  for (const axis of AXES) {
    if (typeof delta[axis] === 'number') acc[axis] += delta[axis]
  }
}
