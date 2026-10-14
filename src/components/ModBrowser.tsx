import { CalibrationLink } from './CalibrationLink'
import { useMemo, useState } from 'react'
import { BORDER_MODS, VOYAGE_MODS } from '../data/mods'
import { localizedBorder, matchesBorderQuery } from '../data/borderLocale'
import { voyageModText, voyageModShort } from '../data/localization'
import type { Scope } from '../types'
import { STAT_SHORT } from '../types'

interface Props {
  disabled: Set<string>
  onToggle: (id: string, off: boolean) => void
  onBulk: (ids: string[], off: boolean) => void
  onClose: () => void
}

interface Group {
  title: string
  hint: string
  mods: { id: string; text: string; short?: string; value?: string; statusLabel?: string }[]
}

const valueLabel = (effects: { stat: string; percent: number }[]): string | undefined => {
  const e = effects[0]
  if (!e) return undefined
  return `${e.percent > 0 ? '+' : ''}${e.percent}% ${STAT_SHORT[e.stat as keyof typeof STAT_SHORT] ?? e.stat}`
}

export function ModBrowser({ disabled, onToggle, onBulk, onClose }: Props) {
  const [q, setQ] = useState('')

  const groups: Group[] = useMemo(() => {
    const byScope = (scope: Scope) =>
      VOYAGE_MODS.filter((m) => m.scope === scope).map((m) => ({
        id: m.id,
        text: voyageModText(m.id),
        short: voyageModShort(m.id),
        value: valueLabel(m.effects),
      }))
    return [
      { title: '本区域词缀', hint: '海图自身区域', mods: byScope('self') },
      { title: '相邻区域词缀', hint: '相邻区域', mods: byScope('adjacent') },
      { title: '全航程词缀', hint: '整个航程', mods: byScope('global') },
      {
        title: '边界词缀',
        hint: '外圈十二个位置',
        mods: BORDER_MODS.map((m) => ({
          id: m.id,
          text: localizedBorder(m.id)!.text,
          statusLabel: localizedBorder(m.id)!.statusLabel,
          value: valueLabel(m.effects) ?? (m.magnitude ? `${m.magnitude}% 幅度` : undefined),
        })),
      },
    ]
  }, [])

  const query = q.trim().toLowerCase()
  const match = (m: { id: string; text: string; short?: string }) =>
    !query || m.text.toLowerCase().includes(query) || (m.short ?? '').toLowerCase().includes(query) ||
    (m.id.startsWith('b-') && matchesBorderQuery(m.id, query))

  const disabledCount = disabled.size

  return (
    <div className="onboard-backdrop" onClick={onClose}>
      <div className="onboard modbrowser" onClick={(e) => e.stopPropagation()}>
        <div className="panel-title">
          海图词缀
          <span className="spacer" />
          <button onClick={onClose}>完成</button>
        </div>
        <p className="onboard-intro" style={{ marginBottom: 8 }}>
          这里列出了工具支持的全部词缀。取消勾选后，该词缀不再参与评分。选择会保存并保留到后续更新。
          {disabledCount > 0 ? `（已禁用 ${disabledCount} 项）` : ''}
        </p>
        <input
          placeholder="搜索词缀…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ marginBottom: 10 }}
        />
        {groups.map((g) => {
          const shown = g.mods.filter(match)
          if (shown.length === 0) return null
          const ids = shown.map((m) => m.id)
          const anyOn = shown.some((m) => !disabled.has(m.id))
          return (
            <div key={g.title} className="mb-group">
              <div className="mb-group-head">
                <span className="mb-group-title">{g.title}</span>
                <span className="muted mb-group-hint">{g.hint}</span>
                <span className="spacer" />
                <button className="mb-bulk" onClick={() => onBulk(ids, anyOn)}>
                  {anyOn ? '全部禁用' : '全部启用'}
                </button>
              </div>
              <div className="mb-list">
                {shown.map((m) => {
                  const on = !disabled.has(m.id)
                  return (
                    <label key={m.id} className={`mb-row ${on ? '' : 'off'}`}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={(e) => onToggle(m.id, !e.target.checked)}
                      />
                      <span className="mb-text">{m.text}</span>
                      {m.statusLabel && <span className="muted">{m.statusLabel}</span>}
                      {m.value && <span className="mb-value">{m.value}</span>}
                      <CalibrationLink id={m.id} />
                    </label>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
