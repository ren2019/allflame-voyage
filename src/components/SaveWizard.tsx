import { useMemo, useState } from 'react'
import {
  CUSTOM_OPTIONS,
  PIECE_TYPES,
  customKey,
  customLabel,
  matchesPiece,
  type PieceType,
} from '../logic/pieceKeeps'
import type { ChartData } from '../types'

interface Props {
  pool: ChartData[]
  /** current keep-count overrides from app state */
  keeps: Record<string, number>
  onApply: (keeps: Record<string, number>) => void
  onClose: () => void
}

/** wizard steps: BANKING piece types grouped per strategy, in claim-priority
 *  order (a family shared by several strategies gets one knob, on the first) */
const STEPS: { strategyId: string; strategyName: string; pieces: PieceType[] }[] = []
for (const p of PIECE_TYPES) {
  if (!p.banks) continue
  const last = STEPS[STEPS.length - 1]
  if (last?.strategyId === p.strategyId) last.pieces.push(p)
  else STEPS.push({ strategyId: p.strategyId, strategyName: p.strategyName, pieces: [p] })
}

/** Guided popup: step through the strategies and set how many of each
 *  recommended chart type to bank. The solver holds the best X of each. */
export function SaveWizard({ pool, keeps, onApply, onClose }: Props) {
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<Record<string, number>>({ ...keeps })
  const [query, setQuery] = useState('')

  const summary = step >= STEPS.length
  const current = summary ? null : STEPS[step]

  const have = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of PIECE_TYPES)
      counts.set(p.key, pool.filter((c) => matchesPiece(c, p)).length)
    return counts
  }, [pool])

  const keepOf = (p: PieceType) => draft[p.key] ?? p.defaultKeep
  const bumpKey = (key: string, base: number, delta: number) =>
    setDraft((d) => ({ ...d, [key]: Math.max(0, (d[key] ?? base) + delta) }))

  // ---- user-added chart types for the current step ----
  const customsOf = (strategyId: string) =>
    Object.keys(draft)
      .filter((k) => k.startsWith(`custom:${strategyId}:`))
      .map((k) => ({ key: k, modIds: k.split(':')[2].split('+') }))

  const customs = current ? customsOf(current.strategyId) : []
  // searchable list of tier families this step doesn't already cover
  const q = query.trim().toLowerCase()
  const addable = current
    ? CUSTOM_OPTIONS.filter(
        (o) =>
          !o.modIds.every((id) =>
            current.pieces.some((p) => p.modIds?.includes(id)),
          ) &&
          !customs.some((c) => c.modIds.join('+') === o.value) &&
          (!q || o.label.toLowerCase().includes(q)),
      )
    : []

  const pinnedTotal = (strategyId: string, pieces: PieceType[]) =>
    pieces.reduce((sum, p) => sum + keepOf(p), 0) +
    customsOf(strategyId).reduce((sum, c) => sum + (draft[c.key] ?? 0), 0)

  return (
    <div className="onboard-backdrop" onClick={onClose}>
      <div className="onboard save-wizard" onClick={(e) => e.stopPropagation()}>
        <div className="panel-title">
          🔖 为策略保留海图
          <span className="muted sw-progress">
            {summary ? '汇总' : `第 ${step + 1}/${STEPS.length} 步`}
          </span>
          <span className="spacer" />
          <button onClick={onClose}>取消</button>
        </div>

        {current && (
          <>
            <div className="sw-strat">
              <span className="sw-strat-name">{current.strategyName}</span>
            </div>
            <div className="muted small-note" style={{ marginTop: 2 }}>
              为该策略保留每种推荐海图多少张？求解器会保留其中价值最高的指定数量，
              超出的海图可正常使用。设为 0 表示不保留。
            </div>
            <div className="sw-list">
              {current.pieces.map((p) => {
                const keep = keepOf(p)
                const owned = have.get(p.key) ?? 0
                return (
                  <div key={p.key} className={`sw-row ${keep > 0 ? 'pinned' : ''}`}>
                    <span className="sw-name">{p.label}</span>
                    <span className="sw-mod muted">
                      建议 {p.recommended} 张 · 已有 {owned} 张
                    </span>
                    <span className="spacer" />
                    <span className="sw-stepper">
                      <button onClick={() => bumpKey(p.key, p.defaultKeep, -1)} disabled={keep === 0}>
                        −
                      </button>
                      <span className={`sw-keep ${keep > owned ? 'short' : ''}`}>{keep}</span>
                      <button onClick={() => bumpKey(p.key, p.defaultKeep, 1)}>+</button>
                    </span>
                  </div>
                )
              })}
              {customs.map((c) => {
                const keep = draft[c.key] ?? 0
                const owned = pool.filter((ch) =>
                  ch.modIds.some((id) => c.modIds.includes(id)),
                ).length
                return (
                  <div key={c.key} className={`sw-row ${keep > 0 ? 'pinned' : ''}`}>
                    <span className="sw-name">{customLabel(c.modIds)}</span>
                    <span className="sw-mod muted">自定义类型 · 已有 {owned} 张</span>
                    <span className="spacer" />
                    <span className="sw-stepper">
                      <button onClick={() => bumpKey(c.key, 0, -1)} disabled={keep === 0}>
                        −
                      </button>
                      <span className={`sw-keep ${keep > owned ? 'short' : ''}`}>{keep}</span>
                      <button onClick={() => bumpKey(c.key, 0, 1)}>+</button>
                    </span>
                    <button
                      className="sw-remove"
                      title="移除此海图类型"
                      onClick={() =>
                        setDraft((d) => {
                          const next = { ...d }
                          delete next[c.key]
                          return next
                        })
                      }
                    >
                      ✕
                    </button>
                  </div>
                )
              })}
            </div>
            <div className="sw-add">
              <input
                placeholder="添加海图类型…搜索保险箱、灯笼、木桶等"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {q && (
              <div className="sw-add-list">
                {addable.map((o) => (
                  <button
                    key={o.value}
                    className="sw-add-option"
                    onClick={() => {
                      setDraft((d) => ({
                        ...d,
                        [customKey(current.strategyId, o.modIds)]: 1,
                      }))
                      setQuery('')
                    }}
                  >
                    <span>{o.label}</span>
                    <span className={`sw-add-scope scope-${o.scope === 'voyage' ? 'global' : 'adjacent'}`}>
                      {o.scope === 'voyage' ? '全航程' : '相邻区域'}
                    </span>
                  </button>
                ))}
                {addable.length === 0 && <span className="muted pad">没有匹配结果</span>}
              </div>
            )}
          </>
        )}

        {summary && (
          <>
            <div className="muted small-note">
              点击保存后生效。保留海图会在库存显示 🔒 和对应策略；可随时重新打开此向导调整数量。
            </div>
            <div className="sw-list">
              {STEPS.map((s) => {
                const total = pinnedTotal(s.strategyId, s.pieces)
                return (
                  <div key={s.strategyId} className="sw-row summary">
                    <span className="sw-pin">{total > 0 ? '🔖' : '·'}</span>
                    <span className="sw-name">{s.strategyName}</span>
                    <span className="sw-mod muted">最多保留 {total} 张</span>
                  </div>
                )
              })}
            </div>
          </>
        )}

        <div className="sw-actions">
          <button disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
            ← 上一步
          </button>
          <span className="spacer" />
          {!summary && <button onClick={() => setStep((s) => s + 1)}>下一步 →</button>}
          {summary && (
            <button
              className="primary sw-save"
              onClick={() => {
                onApply(draft)
                onClose()
              }}
            >
              💾 保存保留数量
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
