import { useState } from 'react'
import { applyCenterChoice, STRATEGIES, type StrategyDef } from '../data/strategies'
import type { Borders, ChartData } from '../types'

interface Props {
  activeId: string | null
  pool: ChartData[]
  borders: Borders
  onSelect: (id: string | null) => void
  /** chosen layout variant per strategy id (missing = default) */
  layoutChoice?: Record<string, string>
  onLayoutChoice?: (strategyId: string, layoutId: string) => void
  /** chosen centre-piece family per strategy id (missing = best available) */
  centerChoice?: Record<string, string>
  onCenterChoice?: (strategyId: string, choiceId: string) => void
}

/** per-requirement tally of what the library can supply (shared with the
 *  jackpot banners so they can never contradict the strategy card) */
export function pieceStatus(s: StrategyDef, pool: ChartData[]) {
  return (s.requirements ?? []).map((req) => {
    const have = pool.filter(
      (c) =>
        (req.modIds && c.modIds.some((id) => req.modIds!.includes(id))) ||
        (req.areaTypes && c.areaType && req.areaTypes.includes(c.areaType)),
    ).length
    return { ...req, have, missing: Math.max(0, req.count - have) }
  })
}

function Readiness({
  strategy,
  pool,
  borders,
}: {
  strategy: StrategyDef
  pool: ChartData[]
  borders: Borders
}) {
  const reqs = pieceStatus(strategy, pool)
  const borderMissing =
    strategy.requiresBorderId && !borders.includes(strategy.requiresBorderId.id)
  if (reqs.length === 0 && !strategy.requiresBorderId) return null
  const missing = reqs.filter((r) => r.missing > 0)
  if (missing.length > 0 || borderMissing) {
    const parts = [
      ...missing.map((m) => `${m.missing}× ${m.label}`),
      ...(borderMissing ? [strategy.requiresBorderId!.label] : []),
    ]
    return (
      <div className="strat-notready">
        ⚠ 材料不足，建议等待。缺少：{parts.join('、')}。
        {strategy.waitHint ? ` ${strategy.waitHint}` : ''}
      </div>
    )
  }
  return (
    <div className="strat-ready">
      ✓ 材料齐备：{' '}
      {reqs
        .map(
          (r) =>
            `${Math.min(r.have, r.count)}/${r.count}× ${r.label}${
              r.have > r.count ? `（另有 ${r.have - r.count} 张备用）` : ''
            }`,
        )
        .join(', ')}
    </div>
  )
}

/**
 * Curated strategies. Selecting one OVERRIDES the manual reward weights and
 * adds placement rules that shape what the solver suggests. Its own section so
 * it's obvious when a strategy - not your sliders - is steering results.
 */
function RegexRow({ regex }: { regex: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="strat-regex-row">
      <span className="strat-regex-label" title="粘贴到游戏海图搜索框，定位此策略值得保留的海图">
        保留材料搜索
      </span>
      <input readOnly value={regex} onFocus={(e) => e.target.select()} />
      <button
        onClick={() => {
          navigator.clipboard.writeText(regex).catch(() => {})
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1500)
        }}
      >
        {copied ? '✓' : '复制'}
      </button>
    </div>
  )
}

export function StrategiesPanel({
  activeId,
  pool,
  borders,
  onSelect,
  layoutChoice,
  onLayoutChoice,
  centerChoice,
  onCenterChoice,
}: Props) {
  const strategy = STRATEGIES.find((s) => s.id === activeId)
  const chosenLayout = strategy?.layouts?.find((v) => v.id === layoutChoice?.[strategy.id]) ?? strategy?.layouts?.[0]
  const chosenCenter = strategy?.centerOptions?.find((o) => o.id === centerChoice?.[strategy.id]) ?? strategy?.centerOptions?.[0]

  return (
    <section className="strategies" aria-label="规划策略">
      <div className="strategy-controls">
        <label>策略
          <select aria-label="当前策略" value={strategy?.id ?? ''} onChange={(e) => onSelect(e.target.value || null)}>
            <option value="">无策略（手动）</option>
            {STRATEGIES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        {strategy && chosenLayout && <label>布局
          <select aria-label="策略布局" value={chosenLayout.id} onChange={(e) => onLayoutChoice?.(strategy.id, e.target.value)}>
            {strategy.layouts!.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
        </label>}
        {strategy && chosenCenter && <label>中心海图
          <select aria-label="中心海图" value={chosenCenter.id} onChange={(e) => onCenterChoice?.(strategy.id, e.target.value)}>
            {strategy.centerOptions!.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </label>}
      </div>
      {strategy ? <>
        <Readiness strategy={applyCenterChoice(strategy, centerChoice?.[strategy.id])} pool={pool} borders={borders} />
        <details className="strategy-guide" key={strategy.id}>
          <summary>攻略与材料</summary>
          <p>{strategy.tagline}</p>
          {chosenLayout && <p className="muted">{chosenLayout.hint}</p>}
          {chosenCenter && chosenCenter.id !== strategy.centerOptions![0].id && <p className="muted">中心优先使用{chosenCenter.label.replace('仅', '')}海图，其他中心材料留在库存中</p>}
          <ul className="strat-guide">{strategy.guide.map((line, i) => <li key={i}>{line}</li>)}</ul>
          {strategy.source.url ? <a className="strat-source" href={strategy.source.url} target="_blank" rel="noopener noreferrer">{strategy.source.label}</a> : <span className="strat-source">{strategy.source.label}</span>}
          {strategy.extraLinks?.map((link) => <a key={link.url} className="strat-source strat-extra-link" href={link.url} target="_blank" rel="noopener noreferrer">{link.label}</a>)}
          {strategy.searchRegex && <RegexRow regex={strategy.searchRegex} />}
        </details>
      </> : <p className="muted strategy-manual-note">手动权重可在求解旁的设置中调整。</p>}
    </section>
  )
}
