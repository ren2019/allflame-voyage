import { RegionTargets, RegionTargetDetails } from './RegionTargets'
import { regionTargets, type RegionalCell } from '../logic/regionTargets'
import type { ScoreOptions } from '../logic/scoring'
import { CalibrationLink } from './CalibrationLink'
import { useState, type ReactNode } from 'react'
import { BORDER_MODS, borderModById, voyageModById } from '../data/mods'
import { BORDER_CHOICES, localizedBorder, matchesBorderQuery } from '../data/borderLocale'
import { rotateEdges } from '../logic/connectivity'
import { buildSingleChartSearch } from '../logic/regex'
import type { Board, Borders, ChartData, Placement } from '../types'
import { START_CELL, STAT_LABELS, STAT_SHORT } from '../types'
import { tooltipProps } from './Tooltip'
import { chartShapeLabel, voyageModText, voyageModShort, SCOPE_LABELS } from '../data/localization'

interface Props {
  board: Board
  borders: Borders
  charts: Map<string, ChartData>
  perTile: number[]
  strategyId?: string | null
  scoreOptions?: ScoreOptions
  selectedCell: number | null
  highlightUid: string | null
  /** only flag connector mismatches as errors under the strict rule */
  strictMode: boolean
  placingChart: ChartData | null
  onCellClick: (i: number) => void
  onRemove: (i: number) => void
  onRotate: (i: number) => void
  onBorderChange: (segment: number, id: string | null) => void
  onTogglePreserve: (uid: string) => void
  onFinishVoyage: () => void
  onCopySequence: () => void
  voyageMsg: string
  /** a copy/preserve step-through is active - hide the action buttons to avoid confusion */
  sequenceActive?: boolean
  /** the solve control, rendered front-and-centre above "Copy into game" */
  solveSlot?: ReactNode
}

function BorderSelect({
  value,
  onChange,
  seg,
  vertical,
}: {
  value: string | null
  onChange: (id: string | null) => void
  seg: number
  vertical?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const mod = value ? borderModById.get(value) : null
  const label = value ? localizedBorder(value) : undefined
  const filtered = BORDER_CHOICES.filter((m) => matchesBorderQuery(m.id, q))
  // keep the popover on-screen: right-column segments align right, left-column align left
  const align = seg >= 3 && seg <= 5 ? 'right' : seg >= 9 ? 'left' : 'center'

  const pick = (id: string | null) => {
    onChange(id)
    setOpen(false)
  }

  return (
    <span
      className={`bslot ${mod ? 'filled' : ''}`}
      data-border-segment={seg}
      aria-label={`边界位置 ${seg + 1}`}
      title={label?.text ?? '边界位置：点击搜索'}
      onClick={() => {
        setQ('')
        setOpen(true)
      }}
    >
      {mod ? (
        <span style={{ maxWidth: vertical ? 56 : 125, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {label?.short}
        </span>
      ) : (
        <span className="bslot-empty">·</span>
      )}
      {value && <CalibrationLink id={value} slot={seg} />}
      {open && (
        <>
          <span
            className="bpop-backdrop"
            onClick={(e) => {
              e.stopPropagation()
              setOpen(false)
            }}
          />
          <span className={`bpop bpop-${align}`} onClick={(e) => e.stopPropagation()}>
            <input
              autoFocus
              placeholder="搜索边界词缀…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setOpen(false)
                if (e.key === 'Enter' && filtered.length > 0) pick(filtered[0].id)
              }}
            />
            <span className="bpop-list">
              <button className="bpop-item muted" onClick={() => pick(null)}>
                无边界词缀
              </button>
              {filtered.map((m) => (
                <button
                  key={m.id}
                  className={`bpop-item ${m.id === value ? 'active' : ''}`}
                  onClick={() => pick(m.id)}
                >
                  <span className="bpop-full">{m.text}</span>
                </button>
              ))}
              {filtered.length === 0 && <span className="bpop-none">无匹配词缀</span>}
            </span>
          </span>
        </>
      )}
    </span>
  )
}

type EdgeStatus = 'none' | 'connected' | 'open' | 'mismatch'

function Tile({
  placement,
  chart,
  score,
  selected,
  highlighted,
  placing,
  isStart,
  edgeStatus,
  onClick,
  onRemove,
  onRotate,
  onTogglePreserve,
  region,
  cellIndex,
  onTargetDetails,
}: {
  placement: Placement | null
  chart: ChartData | null
  score: number
  selected: boolean
  highlighted: boolean
  placing: boolean
  isStart: boolean
  region?: RegionalCell
  cellIndex: number
  onTargetDetails: () => void
  edgeStatus: EdgeStatus[]
  onClick: () => void
  onRemove: () => void
  onRotate: () => void
  onTogglePreserve: () => void
}) {
  const [copied, setCopied] = useState(false)
  const startBadge = isStart ? (
    <span className="tile-start" title="航程从此处开始">
      ⚓ 起点
    </span>
  ) : null
  if (!placement || !chart) {
    return (
      <div className={`tile empty ${placing ? 'placing' : ''}`} onClick={onClick}>
        {startBadge}
        {placing ? '放在此处' : ''}
      </div>
    )
  }
  const edges = rotateEdges(chart.edges, placement.rotation)
  const mods = chart.modIds.map((id) => voyageModById.get(id)).filter(Boolean)
  const tt = tooltipProps({
    title: chart.name,
    lines: [
      { text: `区域等级：${chart.level}${chart.shape ? ` · ${chartShapeLabel(chart.shape)}` : ''}`, cls: 'muted' },
      ...(chart.rewards ?? []).map((e) => ({
        text: `+${e.percent}% ${STAT_LABELS[e.stat]}`,
        cls: 'scope-self',
      })),
      ...mods.map((m) => ({
        text: `${voyageModText(m!.id)}（${SCOPE_LABELS[m!.scope]}）`,
        cls: `scope-${m!.scope}`,
      })),
    ],
  })
  // show the implicit (adjacent/voyage) on the tile - it's the strategic mod
  const primary = mods.find((m) => m!.scope !== 'self') ?? mods[0]
  return (
    <div
      className={`tile ${region ? 'with-region-targets' : ''} ${selected ? 'selected' : ''} ${highlighted ? 'highlighted' : ''} ${chart.preserved ? 'preserved' : ''} ${primary ? `tscope-${primary.scope}` : ''}`}
      onClick={onClick}
      {...tt}
    >
      {(['n', 'e', 's', 'w'] as const).map((d, i) =>
        edges[i] ? <span key={d} className={`path-bar ${d} ${edgeStatus[i]}`} /> : null,
      )}
      {primary &&
        (primary.short ? (
          <div className="tile-duo">
            <span className="tile-duo-col">
              <span className={`tile-duo-pct scope-${primary.scope}`}>{voyageModShort(primary.id)}</span>
              <span className="tile-duo-label">
                {primary.scope === 'self'
                  ? '本区域'
                  : primary.scope === 'adjacent'
                    ? '相邻区域'
                    : '全航程'}
              </span>
            </span>
          </div>
        ) : primary.effects[0] ? (
          <div className="tile-duo">
            <span className="tile-duo-col">
              <span className={`tile-duo-pct scope-${primary.scope}`}>
                +{primary.effects[0].percent}% {STAT_SHORT[primary.effects[0].stat]}
              </span>
              <span className="tile-duo-label">
                {primary.scope === 'self'
                  ? '本区域'
                  : primary.scope === 'adjacent'
                    ? '相邻区域'
                    : '全航程'}
              </span>
            </span>
          </div>
        ) : (
          <div className={`tile-duo-text scope-${primary.scope}`}>{voyageModText(primary.id)}</div>
        ))}
      {!primary && chart.implicitText && (
        <div className="tile-duo-text scope-global">{chart.implicitText}</div>
      )}
      {chart.preserved && (
        <span className="tile-preserved-badge" title="已锁定：完成航程后确认是否保留">
          🔒 保留
        </span>
      )}
      <div className="tile-actions">
        <button
          className={chart.preserved ? 'active' : ''}
          title={chart.preserved ? '已锁定：取消后允许消耗' : '锁定海图：完成航程时确认是否保留'}
          onClick={(e) => {
            e.stopPropagation()
            onTogglePreserve()
          }}
        >
          {chart.preserved ? '🔒' : '🔓'}
        </button>
        <button
          title="复制游戏定位文本（名称与词缀），查找此海图"
          onClick={(e) => {
            e.stopPropagation()
            navigator.clipboard.writeText(buildSingleChartSearch(chart)).catch(() => {})
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1200)
          }}
        >
          {copied ? '✓' : '⧉'}
        </button>
        <button
          title="旋转"
          onClick={(e) => {
            e.stopPropagation()
            onRotate()
          }}
        >
          ⟳
        </button>
        <button
          title="移除"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
        >
          ✕
        </button>
      </div>
      {region && <RegionTargets cell={region} index={cellIndex} onDetails={onTargetDetails} />}
      {startBadge}
      <span className="tile-lvl">区域 {chart.level}</span>
      <div className="tile-score">{score.toFixed(1)}</div>
    </div>
  )
}

const DIRS = [
  { dr: -1, dc: 0, opp: 2 }, // N
  { dr: 0, dc: 1, opp: 3 }, // E
  { dr: 1, dc: 0, opp: 0 }, // S
  { dr: 0, dc: -1, opp: 1 }, // W
]

export function BoardView(props: Props) {
  const { board, borders, charts } = props
  const [showTargets, setShowTargets] = useState(false)
  const [detailCell, setDetailCell] = useState<number | null>(null)
  const targets = regionTargets(board, borders, charts, props.strategyId ?? null, props.scoreOptions)

  const edgesAt = (i: number) => {
    const p = board[i]
    if (!p) return null
    const c = charts.get(p.chartUid)
    return c ? rotateEdges(c.edges, p.rotation) : null
  }

  const edgeStatusFor = (i: number): EdgeStatus[] => {
    const e = edgesAt(i)
    if (!e) return ['none', 'none', 'none', 'none']
    const r = Math.floor(i / 3)
    const c = i % 3
    return DIRS.map((d, k) => {
      if (!e[k]) return 'none' as EdgeStatus
      const nr = r + d.dr
      const nc = c + d.dc
      if (nr < 0 || nr > 2 || nc < 0 || nc > 2) return 'open' as EdgeStatus
      const ne = edgesAt(nr * 3 + nc)
      if (!ne) return 'open' as EdgeStatus
      if (ne[d.opp]) return 'connected' as EdgeStatus
      return (props.strictMode ? 'mismatch' : 'open') as EdgeStatus
    })
  }

  const tile = (i: number) => {
    const p = board[i]
    return (
      <Tile
        key={i}
        cellIndex={i}
        region={showTargets ? targets[i] : undefined}
        onTargetDetails={() => setDetailCell(i)}
        placement={p}
        chart={p ? charts.get(p.chartUid) ?? null : null}
        score={props.perTile[i]}
        selected={props.selectedCell === i}
        highlighted={!!p && p.chartUid === props.highlightUid}
        placing={!!props.placingChart && !p}
        isStart={i === START_CELL}
        edgeStatus={edgeStatusFor(i)}
        onClick={() => props.onCellClick(i)}
        onRemove={() => props.onRemove(i)}
        onRotate={() => props.onRotate(i)}
        onTogglePreserve={() => p && props.onTogglePreserve(p.chartUid)}
      />
    )
  }
  const border = (seg: number, vertical?: boolean) => (
    <BorderSelect
      key={`b${seg}`}
      value={borders[seg]}
      seg={seg}
      vertical={vertical}
      onChange={(id) => props.onBorderChange(seg, id)}
    />
  )

  const randomize = () => {
    for (let seg = 0; seg < 12; seg++) {
      const m = BORDER_MODS[Math.floor(Math.random() * BORDER_MODS.length)]
      props.onBorderChange(seg, m.id)
    }
  }
  const clearBorders = () => {
    for (let seg = 0; seg < 12; seg++) props.onBorderChange(seg, null)
  }

  return (
    <div className="board-wrap">
      <div className="board-toolbar">
        <span className="board-title">航程摆盘</span>
        <span className="spacer" />
        <button type="button" aria-pressed={showTargets} onClick={() => setShowTargets(v => !v)}>区域目标</button>
        <button onClick={randomize} title="模拟重置边界词缀">
          🎲 随机边界
        </button>
        <button onClick={clearBorders}>清空边界</button>
      </div>
      {detailCell !== null && <RegionTargetDetails cell={targets[detailCell]} index={detailCell} onClose={() => setDetailCell(null)} />}
      <div className="board-grid">
        <div className="corner" />
        {border(0)}
        {border(1)}
        {border(2)}
        <div className="corner" />

        {border(9, true)}
        {tile(0)}
        {tile(1)}
        {tile(2)}
        {border(3, true)}

        {border(10, true)}
        {tile(3)}
        {tile(4)}
        {tile(5)}
        {border(4, true)}

        {border(11, true)}
        {tile(6)}
        {tile(7)}
        {tile(8)}
        {border(5, true)}

        <div className="corner" />
        {border(6)}
        {border(7)}
        {border(8)}
        <div className="corner" />
      </div>
      <div className="board-hint">
        角落有两条直接边界，中边一条，中心没有。先点击库存海图再点击格子放置；点击两个已放置格子可交换。
      </div>
      <div className="legend">
        <span className="legend-item scope-self">■ 本区域</span>
        <span className="legend-item scope-adjacent">■ 相邻区域</span>
        <span className="legend-item scope-global">■ 全航程</span>
      </div>
      {!props.sequenceActive && props.solveSlot}
      {!props.sequenceActive && (
        <div className="voyage-finish">
          <button
            className="copy-into-game"
            disabled={board.every((p) => !p)}
            onClick={props.onCopySequence}
            title="按游戏放置顺序从左下开始逐格复制定位文本，再按对应顺序 Ctrl+左键点击海图。"
          >
            📋 复制到游戏
          </button>
          <button
            className="finish-voyage"
            disabled={board.every((p) => !p)}
            onClick={props.onFinishVoyage}
            title="核销本盘实际消耗的海图，并逐张确认锁定海图（🔒）是否存活；随后清空摆盘，开始下一航程。"
          >
            🌊 完成航程
          </button>
          {props.voyageMsg && <span className="voyage-msg">{props.voyageMsg}</span>}
        </div>
      )}
    </div>
  )
}
