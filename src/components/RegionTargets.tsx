import './region-targets.css'
import { useEffect, useRef, type CSSProperties } from 'react'
import type {
  RegionalCell,
  TargetDefinition,
  TargetSource,
} from '../logic/regionTargets'
import { priorityBand, REGION_TARGET_CONFIG } from '../logic/regionTargets'
import { voyageModText } from '../data/localization'
import { localizedBorder } from '../data/borderLocale'
import { TEXT_LIBRARY } from '../data/textLibrary'

function bandStyle(weight: number): CSSProperties {
  const band = priorityBand(weight)
  if (!band) return {}
  return {
    '--region-band-color-dark': band.themeColors['minimal-dark'].color,
    '--region-band-color-light': band.themeColors['minimal-light'].color,
    '--region-band-bg-dark': band.themeColors['minimal-dark'].background,
    '--region-band-bg-light': band.themeColors['minimal-light'].background,
  } as CSSProperties
}

function TargetIcon({ target }: { target: TargetDefinition }) {
  const url = `${import.meta.env.BASE_URL}${target.iconAsset}`
  return target.iconAssetType === 'svg' ? (
    <span
      aria-hidden="true"
      className="region-vector"
      style={{ maskImage: `url("${url}")`, WebkitMaskImage: `url("${url}")` }}
    />
  ) : (
    <img src={url} alt="" aria-hidden="true" />
  )
}

export function RegionTargets({
  cell,
  index,
  onDetails,
}: {
  cell: RegionalCell
  index: number
  onDetails: () => void
}) {
  return (
    <div
      className="region-targets"
      aria-label={`区域 ${index + 1} 目标`}
      onClick={(e) => e.stopPropagation()}
    >
      {cell.visible.map((group) => {
        const band = priorityBand(group.weight)
        return (
          <button
            type="button"
            className={`region-target band-${band?.id}`}
            key={group.id}
            style={bandStyle(group.weight)}
            data-target-group={group.id}
            aria-label={`${group.label} · ${band?.label}优先级 ${group.weight} · 查看详情`}
            title={`${group.label} · ${band?.label}优先级 ${group.weight}`}
            onClick={onDetails}
          >
            <TargetIcon target={group.representative} />
          </button>
        )
      })}
      {cell.overflow && (
        <button
          type="button"
          className="region-target region-more"
          aria-label={`更多目标 · 共 ${cell.groups.length} 类`}
          onClick={onDetails}
        >
          ···
        </button>
      )}
      {cell.groups.length === 0 && (
        <button
          type="button"
          className="region-target-empty"
          onClick={onDetails}
        >
          暂无目标
        </button>
      )}
    </div>
  )
}

function sourceLabel(source: TargetSource) {
  if (source.kind === 'destination')
    return `目的地：${TEXT_LIBRARY.records.find((r) => r.kind === 'destination' && r.internalId === source.id)?.cnText ?? source.id}`
  if (source.kind === 'border')
    return `边界 ${(source.segment ?? 0) + 1}：${localizedBorder(source.id)?.text ?? source.id}`
  return `格 ${(source.cell ?? 0) + 1}：${voyageModText(source.id)}`
}

export function RegionTargetDetails({
  cell,
  index,
  onClose,
}: {
  cell: RegionalCell
  index: number
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const opener = useRef(
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  )
  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    return () => {
      dialog?.close()
      opener.current?.focus()
    }
  }, [])
  return (
    <dialog
      ref={ref}
      className="region-details"
      aria-label={`区域 ${index + 1} 目标详情`}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <div className="region-details-heading">
        <h2>区域 {index + 1} 目标详情</h2>
        <button
          type="button"
          autoFocus
          onClick={onClose}
          aria-label="关闭区域目标详情"
        >
          ✕
        </button>
      </div>
      <p className="muted">
        展示权重仅用于提醒，不改变摆盘评分。版本：
        {REGION_TARGET_CONFIG.configVersion}
      </p>
      {cell.targets.length === 0 && <p>当前没有已识别的目标。</p>}
      {cell.groups.map((group) => (
        <section
          key={group.id}
          style={bandStyle(group.weight)}
          className={`region-detail-group band-${priorityBand(group.weight)?.id}`}
        >
          <h3>
            {group.label} · {priorityBand(group.weight)?.label}优先级{' '}
            {group.weight}
          </h3>
          {group.targets.map((target) => (
            <article key={target.id}>
              <h4>
                <TargetIcon target={target.definition} />
                {target.definition.label} · {target.weight}
              </h4>
              <ul>
                {target.sources.map((source, i) => (
                  <li key={i}>{sourceLabel(source)}</li>
                ))}
              </ul>
              <p>{target.definition.notes}</p>
              <details>
                <summary>图案与规则来源</summary>
                <p>
                  {target.definition.artCredit.author} ·{' '}
                  {target.definition.artCredit.license}
                </p>
                {target.definition.artCredit.sourceUrl?.startsWith(
                  'https://',
                ) && (
                  <a
                    href={target.definition.artCredit.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    图案来源
                  </a>
                )}
                <p>{target.definition.artCredit.notes}</p>
                {target.definition.sourceRefs.map((id) => {
                  const sources: Record<
                    string,
                    { url?: string; kind: string }
                  > = REGION_TARGET_CONFIG.sources
                  return (
                    <p key={id}>
                      {sources[id]?.url ? (
                        <a
                          href={sources[id].url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {id}
                        </a>
                      ) : (
                        id
                      )}
                    </p>
                  )
                })}
              </details>
            </article>
          ))}
        </section>
      ))}
      {cell.targets
        .filter((t) => t.weight <= 0)
        .map((t) => (
          <article key={t.id}>
            <h3>{t.definition.label} · 仅详情（权重 0）</h3>
            <p>{t.definition.notes}</p>
            <ul>
              {t.sources.map((source, i) => (
                <li key={i}>{sourceLabel(source)}</li>
              ))}
            </ul>
          </article>
        ))}
      {cell.context.length > 0 && (
        <details>
          <summary>区域附加效果</summary>
          <ul>
            {cell.context.map((text, i) => (
              <li key={i}>{text}</li>
            ))}
          </ul>
        </details>
      )}
      <details>
        <summary>维护记录与已知限制</summary>
        <p>
          来源数据：{REGION_TARGET_CONFIG.clientPatch}
          ；数量与机制须以实际客户端为准。
        </p>
        <ul>
          {REGION_TARGET_CONFIG.unresolved.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        {cell.uncovered.length > 0 && (
          <p>未覆盖：{cell.uncovered.join('、')}</p>
        )}
      </details>
    </dialog>
  )
}
