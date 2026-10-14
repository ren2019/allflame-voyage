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
  const [expanded, setExpanded] = useState<string | null>(activeId)

  return (
    <div className="strategies">
      <div className="panel-title">
        策略
        {activeId && <span className="strat-live-badge">使用中</span>}
      </div>
      <div className="muted small-note" style={{ marginTop: 0 }}>
        社区策略。选中后使用该策略的奖励权重和位置偏好，关闭后恢复手动权重。
      </div>

      <button
        className={`strat-card strat-none ${activeId === null ? 'active' : ''}`}
        onClick={() => onSelect(null)}
      >
        <span className="strat-name">无策略（手动）</span>
        <span className="strat-tagline">
          使用自己的奖励权重，可在求解旁的 ⚙ 设置中调整。
        </span>
      </button>

      {STRATEGIES.map((s) => {
        const isActive = activeId === s.id
        const isOpen = expanded === s.id
        // the centre pick reshapes readiness, so the card must reflect it
        const effective = applyCenterChoice(s, centerChoice?.[s.id])
        return (
          <div key={s.id} className={`strat-card ${isActive ? 'active' : ''}`}>
            <button
              className="strat-head"
              onClick={() => setExpanded(isOpen ? null : s.id)}
              title="查看详情"
            >
              <span className="strat-name">
                {s.name}
                {s.badge && <span className="strat-badge-new">{s.badge}</span>}
              </span>
              <span className="strat-tagline">{s.tagline}</span>
            </button>
            {isOpen && (
              <div className="strat-body">
                <ul className="strat-guide">
                  {s.guide.map((g, i) => (
                    <li key={i}>{g}</li>
                  ))}
                </ul>
                {s.source.url ? (
                  <a className="strat-source" href={s.source.url} target="_blank" rel="noopener noreferrer">
                    ▶ {s.source.label}
                  </a>
                ) : (
                  <span className="strat-source">{s.source.label}</span>
                )}
                {s.extraLinks?.map((l) => (
                  <a
                    key={l.url}
                    className="strat-source strat-extra-link"
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    🔗 {l.label}
                  </a>
                ))}
              </div>
            )}
            {(isActive || isOpen) &&
              s.layouts &&
              (() => {
                const chosen =
                  s.layouts.find((v) => v.id === layoutChoice?.[s.id]) ?? s.layouts[0]
                return (
                  <div className="strat-layouts">
                    <div className="strat-layouts-row">
                      <span className="strat-layouts-label">布局</span>
                      <select
                        value={chosen.id}
                        onChange={(e) => onLayoutChoice?.(s.id, e.target.value)}
                      >
                        {s.layouts.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="strat-layouts-hint muted">{chosen.hint}</div>
                  </div>
                )
              })()}
            {(isActive || isOpen) &&
              s.centerOptions &&
              (() => {
                const chosen =
                  s.centerOptions.find((o) => o.id === centerChoice?.[s.id]) ?? s.centerOptions[0]
                return (
                  <div className="strat-layouts">
                    <div className="strat-layouts-row">
                      <span className="strat-layouts-label">中心海图</span>
                      <select
                        value={chosen.id}
                        onChange={(e) => onCenterChoice?.(s.id, e.target.value)}
                      >
                        {s.centerOptions.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {chosen.id !== s.centerOptions[0].id && (
                      <div className="strat-layouts-hint muted">
                        中心优先使用{chosen.label.replace('仅', '')}海图，其他中心材料留在库存中
                      </div>
                    )}
                  </div>
                )
              })()}
            {(isActive || isOpen) && s.searchRegex && <RegexRow regex={s.searchRegex} />}
            {(isActive || isOpen) && <Readiness strategy={effective} pool={pool} borders={borders} />}
            <button
              className={`strat-use ${isActive ? 'on' : ''}`}
              onClick={() => onSelect(isActive ? null : s.id)}
            >
              {isActive ? '✓ 已启用，点击关闭' : '使用此策略'}
            </button>
          </div>
        )
      })}
    </div>
  )
}
