import { useEffect, useId, useRef, useState } from 'react'
import './compact-copy.css'

interface Props {
  label: string
  text: string
}

/** A compact search reference, also shared by the inventory-independent keeper assistant. */
export function CompactCopyText({ label, text }: Props) {
  const titleId = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const fullText = useRef<HTMLTextAreaElement>(null)
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'failure'>('idle')
  const feedback = status === 'success' ? '已复制完整文本'
    : status === 'failure' ? '复制失败，请选择全文后手动复制'
      : status === 'pending' ? '正在复制…' : ''

  useEffect(() => {
    if (open && !dialog.current?.open) {
      dialog.current?.showModal()
      fullText.current?.focus()
      fullText.current?.select()
    }
  }, [open])

  async function copy() {
    setStatus('pending')
    try {
      await navigator.clipboard.writeText(text)
      setStatus('success')
    } catch {
      setStatus('failure')
      setOpen(true)
    }
  }

  return (
    <div className="compact-copy" data-copy-status={status}>
      <div className="compact-copy-row">
        <button className="compact-copy-name" type="button" onClick={() => setOpen(true)} title="查看完整搜索串">
          {label}
        </button>
        <button className="compact-copy-icon" type="button" onClick={copy} disabled={status === 'pending'}
          aria-label={`复制${label}`} title={`复制${label}`}>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {status === 'success' ? <path d="m5 12 4 4L19 6" /> : <><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>}
          </svg>
        </button>
      </div>
      <div className="compact-copy-status" role="status">{feedback && `${label}：${feedback}`}</div>
      <dialog ref={dialog} className="compact-copy-dialog" aria-labelledby={titleId} onClose={() => setOpen(false)}>
        <div className="compact-copy-heading">
          <h2 id={titleId}>{label}</h2>
          <button type="button" aria-label="关闭全文弹窗" title="关闭" onClick={() => dialog.current?.close()}>×</button>
        </div>
        <p className="muted">完整搜索串，可全选后按 Ctrl+C（Mac 为 ⌘C）手动复制。</p>
        <textarea ref={fullText} aria-label="完整搜索串" readOnly value={text} rows={6} onFocus={(e) => e.target.select()} />
        <div className="compact-copy-dialog-actions">
          <button type="button" onClick={() => { fullText.current?.focus(); fullText.current?.select() }}>选择全文</button>
          <button type="button" onClick={copy} disabled={status === 'pending'}>复制全文</button>
        </div>
        <p className="compact-copy-status" role="status">{feedback}</p>
      </dialog>
    </div>
  )
}
