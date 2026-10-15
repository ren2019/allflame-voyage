import initialRules from '../data/borderAffinity.json'
import type { Borders } from '../types'

export interface BorderAffinityRules {
  version: string
  basis: string
  sources: Record<string, { label: string; url: string }>
  strategies: Record<string, {
    requiredBorderId: string | null
    weights: Record<string, { weight: number; reason: string; sourceIds: string[] }>
  }>
}

export const BORDER_AFFINITY_RULES: BorderAffinityRules = initialRules

/** Presentation tiers for one strategy-specific border weight, on its 0–10 scale. */
export function borderAffinityPriority(weight: number | null) {
  if (weight === null || !Number.isFinite(weight) || weight < 0 || weight > 10) return null
  if (weight <= 2) return { band: 'low', label: '可忽略' } as const
  if (weight <= 6) return { band: 'medium', label: '适配' } as const
  return { band: 'high', label: '重点' } as const
}

/** Read-only strategy × twelve borders. No board, solver or inventory input. */
export function evaluateBorderAffinity(strategyId: string | null, borders: Borders, rules = BORDER_AFFINITY_RULES) {
  const strategy = strategyId ? rules.strategies[strategyId] : undefined
  const contributions = Array.from({ length: 12 }, (_, segment) => {
    const borderId = borders[segment] ?? null
    const rule = borderId ? strategy?.weights[borderId] : undefined
    return { segment, borderId, weight: rule && Number.isFinite(rule.weight) ? rule.weight : null, reason: rule?.reason ?? null, sourceIds: rule?.sourceIds ?? [] }
  })
  const status = !strategyId ? 'no-strategy' : !strategy ? 'unsupported' : borders.length !== 12 || borders.some((id) => !id) ? 'incomplete' : contributions.some((entry) => entry.weight === null) ? 'unsupported' : 'complete'
  return {
    version: rules.version,
    status,
    total: status === 'complete' ? contributions.reduce((sum, entry) => sum + entry.weight!, 0) : null,
    contributions,
    requiredBorder: strategy?.requiredBorderId ? { id: strategy.requiredBorderId, present: borders.includes(strategy.requiredBorderId) } : null,
  }
}
