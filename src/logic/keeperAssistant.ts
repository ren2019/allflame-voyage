import rules from '../data/keeper-rules.json'

interface KeeperCondition { label: string; pattern: string; source: string }
interface KeeperRule { conditions: string[]; source: string; note?: string }

/** One quoted OR expression per strategy. Never subject to the weighted search length cap. */
export function keeperRecommendation(strategyId: string) {
  const rule = (rules.strategies as Record<string, KeeperRule>)[strategyId]
  const conditions = (rule?.conditions ?? []).map((id) => {
    const condition = (rules.conditions as Record<string, KeeperCondition>)[id]
    if (!condition) throw new Error(`留图配置缺少条件：${id}`)
    return condition
  })
  const patterns = [...new Set(conditions.map((condition) => condition.pattern))]
  return {
    version: rules.version,
    regex: patterns.length ? `"${patterns.join('|')}"` : null,
    conditions,
    source: rule?.source,
    note: rule?.note ?? (rule ? '' : '暂无有来源的专项留图规则。'),
  }
}
