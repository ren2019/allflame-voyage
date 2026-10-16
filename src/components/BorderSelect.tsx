import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { borderModById } from '../data/mods'
import { localizedBorder, matchesBorderQuery } from '../data/borderLocale'
import { borderCatalogue, type BorderChooserItem, type BorderFamily } from '../data/borderChooser'
import { borderAffinityPriority } from '../logic/borderAffinity'
import { CalibrationLink } from './CalibrationLink'
import './border-chooser.css'

const catalogue = borderCatalogue()

export function BorderSelect({ value, onChange, seg, vertical, affinityWeight }: {
  value: string | null
  onChange: (id: string | null) => void
  seg: number
  vertical?: boolean
  affinityWeight: number | null
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const selectedCategory = catalogue.find(category => category.families.some(family => family.items.some(item => item.id === value)))
  const currentFamily = selectedCategory?.families.find(family => family.items.some(item => item.id === value))
  const current = currentFamily?.items.find(item => item.id === value)
  const [categoryKey, setCategoryKey] = useState(catalogue[0].key)
  const anchor = useRef<HTMLSpanElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const [position, setPosition] = useState({ left: 8, top: 8 })
  const label = value ? localizedBorder(value) : undefined
  const mod = value ? borderModById.get(value) : undefined
  const priority = borderAffinityPriority(affinityWeight)
  const searching = query.trim().length > 0
  const normalizedQuery = query.normalize('NFKC').toLowerCase().replace(/\s+/g, '')
  const families = catalogue.flatMap(category => searching
    ? category.families.map(family => ({
      ...family,
      items: family.items.filter(item => matchesBorderQuery(item.id, query) || family.name.includes(normalizedQuery)),
    })).filter(family => family.items.length > 0)
    : category.key === categoryKey ? category.families : [])

  const iconFamilies = families.filter(family => family.icon)
  const rowFamilies = families.filter(family => !family.icon)
  const firstVisible = iconFamilies[0] ?? rowFamilies[0]

  useLayoutEffect(() => {
    if (!open) return
    const update = () => {
      if (!anchor.current || !panel.current) return
      const slot = anchor.current.getBoundingClientRect()
      const popup = panel.current.getBoundingClientRect()
      const left = Math.max(8, Math.min(slot.left + slot.width / 2 - popup.width / 2, window.innerWidth - popup.width - 8))
      const below = slot.bottom + 6
      const preferredTop = below + popup.height <= window.innerHeight - 8 ? below : slot.top - popup.height - 6
      const top = Math.max(8, Math.min(preferredTop, window.innerHeight - popup.height - 8))
      setPosition(previous => previous.left === left && previous.top === top ? previous : { left, top })
    }
    update()
    search.current?.focus()
    const observer = new ResizeObserver(update)
    if (panel.current) observer.observe(panel.current)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open])

  const close = () => {
    setOpen(false)
    anchor.current?.focus({ preventScroll: true })
  }
  const pick = (id: string | null) => {
    onChange(id)
    close()
  }
  const show = () => {
    setQuery('')
    setCategoryKey(selectedCategory?.key ?? catalogue[0].key)
    setOpen(true)
  }
  const keyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
    }
    if (event.key === 'Tab' && panel.current) {
      const controls = [...panel.current.querySelectorAll<HTMLElement>('button, input')]
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
  }
  const tierButton = (item: BorderChooserItem, quick = false) => <button
    key={item.id}
    type="button"
    className={quick ? 'border-quick-tier' : 'bpop-item border-tier'}
    aria-label={item.text}
    aria-pressed={item.id === value}
    title={item.text}
    onClick={event => { event.stopPropagation(); pick(item.id) }}
  >{item.tier}{!quick && <span className="border-choice-full">{item.text}</span>}</button>
  const renderFamily = (family: BorderFamily) => family.icon ? <button
    key={family.key}
    type="button"
    className="bpop-item border-currency"
    aria-label={family.items[0].text}
    aria-pressed={family.items[0].id === value}
    title={family.items[0].text}
    onClick={() => pick(family.items[0].id)}
  ><img src={`${import.meta.env.BASE_URL}target-icons/${family.icon}`} alt="" /><span>{family.iconName}</span><span className="border-choice-full">{family.items[0].text}</span></button>
    : <div className="border-family" role="group" aria-label={family.name} key={family.key} onClick={() => pick(family.items[0].id)}>
      <button type="button" className="border-family-default" aria-label={`${family.name}，默认选择 ${family.items[0].tier}`} title={family.items[0].text}>{family.name}</button>
      <div className="border-family-tiers">{family.items.map(item => tierButton(item))}</div>
    </div>

  return <span
    ref={anchor}
    className={`bslot ${mod ? 'filled' : ''} ${vertical ? 'bslot-vertical' : ''}`}
    data-border-segment={seg}
    data-affinity-band={priority?.band}
    role="button"
    tabIndex={0}
    aria-label={`边界位置 ${seg + 1}`}
    aria-haspopup="dialog"
    aria-expanded={open}
    title={(label?.text ?? '边界位置：点击搜索') + (priority ? `\n${priority.label}` : '')}
    onClick={show}
    onKeyDown={event => {
      if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); show() }
    }}
  >
    {mod ? <span className="bslot-label">{label?.short}</span> : <span className="bslot-empty">·</span>}
    {value && <CalibrationLink id={value} slot={seg} />}
    {open && createPortal(<div onClick={event => event.stopPropagation()}>
      <div className="bpop-backdrop" onClick={close} />
      <div ref={panel} className="bpop border-chooser" style={position} role="dialog" aria-modal="true" aria-label={`选择边界 ${seg + 1}`} onKeyDown={keyDown}>
        <div className="border-chooser-head">
          <span>边界 {seg + 1} · <strong title={label?.text}>{currentFamily ? `${currentFamily.name}${currentFamily.items.length > 1 ? ` ${current?.tier}` : ''}` : label?.text ?? value ?? '未选择'}</strong></span>
          <div className="border-chooser-quick" aria-label="同类其他档位">{currentFamily?.items.filter(item => item.id !== value).map(item => tierButton(item, true))}</div>
          <button type="button" className="border-chooser-close" aria-label="关闭边界选择" onClick={close}>×</button>
        </div>
        <div className="border-chooser-search">
          <input ref={search} placeholder="搜索边界词缀…" aria-label="搜索边界词缀" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => {
            if (event.key === 'Enter' && firstVisible) { event.preventDefault(); pick(firstVisible.items[0].id) }
          }} />
          <button type="button" aria-label="无边界词缀" onClick={() => pick(null)}>清空</button>
        </div>
        <div className="border-chooser-body">
          <nav aria-label="边界分类">{catalogue.map(category => <button type="button" key={category.key} aria-label={`${category.name}，${category.families.length} 类词缀`} aria-pressed={!searching && category.key === categoryKey} onClick={() => { setCategoryKey(category.key); setQuery('') }}><span>{category.name}</span><small>{category.families.length}</small></button>)}</nav>
          <div className="border-chooser-results">
            {searching && <div className="border-chooser-result-count" role="status">搜索结果 · {families.reduce((count, family) => count + family.items.length, 0)} 项</div>}
            {iconFamilies.length > 0 && <div className="border-currency-grid">{iconFamilies.map(renderFamily)}</div>}
            {rowFamilies.map(renderFamily)}
            {families.length === 0 && <span className="bpop-none">无匹配词缀</span>}
          </div>
        </div>
      </div>
    </div>, document.body)}
  </span>
}
