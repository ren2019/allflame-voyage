import { useEffect, useRef, useState } from 'react'
import { calibrationRow } from '../data/calibrationCatalogue'
import { REVIEW_LABELS, type CalibrationRecords } from '../logic/calibrationRecords'
import { calibrationSubmission, calibrationSubmissionSource } from '../logic/calibrationSubmission'

export function CalibrationSubmission({ records, onClose }: { records: CalibrationRecords; onClose: () => void }) {
  const [source] = useState(() => calibrationSubmissionSource(records))
  const [keys, setKeys] = useState(Object.keys(records))
  const [deliveryStatus, setDeliveryStatus] = useState({ body: '', message: '' })
  const submission = calibrationSubmission(source, keys)
  const overBudget = submission.byteLength > 30000
  const dialog = useRef<HTMLDialogElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const bodyField = useRef<HTMLTextAreaElement>(null)
  const deliveryAttempt = useRef(0)
  function selectRecord(key: string, checked: boolean) {
    deliveryAttempt.current++
    setDeliveryStatus({ body: '', message: '' })
    setKeys(previous => checked ? [...previous, key] : previous.filter(selected => selected !== key))
  }
  async function copyBody() {
    const body = submission.body
    const attempt = ++deliveryAttempt.current
    try {
      await navigator.clipboard.writeText(body)
      if (attempt !== deliveryAttempt.current) return
      setDeliveryStatus({ body, message: '已复制完整 Issue 正文。请在 GitHub 核对并最终发布；本地记录会保留。' })
    } catch {
      if (attempt !== deliveryAttempt.current) return
      setDeliveryStatus({ body, message: '未能复制到剪贴板。请选中「完整 Issue 正文」，手动复制后在 GitHub 正文粘贴。' })
      bodyField.current?.focus()
      bodyField.current?.select()
    }
  }
  function openPrefilledDraft() {
    deliveryAttempt.current++
    // Open first, then detach the opener before navigating. noopener's null return
    // cannot distinguish a successful open from a blocked popup.
    try {
      const draft = window.open('about:blank', '_blank')
      if (!draft || !submission.prefilledUrl) throw new Error('Draft unavailable')
      draft.opener = null
      draft.location.replace(submission.prefilledUrl)
      setDeliveryStatus({ body: submission.body, message: '已请求打开 GitHub 草稿，请在 GitHub 登录、核对并最终发布。若未打开或网络加载失败，请复制完整正文并使用备用链接。' })
    } catch {
      setDeliveryStatus({ body: submission.body, message: '未能打开草稿，可能被浏览器拦截。请复制完整正文，并使用备用链接「打开 GitHub Issue 草稿」重试。' })
    }
  }
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const modal = dialog.current
    modal?.showModal()
    closeButton.current?.focus()
    return () => { modal?.close(); opener?.focus() }
  }, [])
  return <dialog ref={dialog} className="cal-submission" aria-labelledby="cal-submission-title" onCancel={event => { event.preventDefault(); onClose() }}>
    <div className="cal-submission-header"><h2 id="cal-submission-title">提交校准 Issue 预览</h2><button ref={closeButton} onClick={onClose}>返回编辑</button></div>
    <p>校准内容和备注将公开到 GitHub。请检查后打开草稿，在 GitHub 登录、核对并最终发布。</p>
    <p>已选择 {keys.length} 条 / 已保存 {Object.keys(records).length} 条。搜索和筛选不改变提交范围。</p>
    <ul className="cal-submission-records">{Object.values(records).map(record => <li key={record.key}>
      <label><input type="checkbox" aria-label={'提交 ' + record.key} checked={keys.includes(record.key)} onChange={event => selectRecord(record.key, event.target.checked)} /> <strong>{record.key}</strong></label>
      <dl><dt>位置／用途</dt><dd>{calibrationRow(record.key)!.place}</dd><dt>当前中文</dt><dd>{calibrationRow(record.key)!.chinese || '缺少中文'}</dd><dt>建议中文</dt><dd>{record.suggestion}</dd><dt>校准备注</dt><dd>{record.note || '无'}</dd><dt>审阅结果</dt><dd>{REVIEW_LABELS[record.status]}</dd></dl>
    </li>)}</ul>
    <label htmlFor="cal-submission-json">完整校准 JSON</label>
    <textarea id="cal-submission-json" readOnly value={submission.json} />
    <label htmlFor="cal-submission-body">完整 Issue 正文</label>
    <textarea ref={bodyField} id="cal-submission-body" readOnly value={submission.body} />
    <p>备用方式：复制以上完整正文，使用仅预填标题的「打开 GitHub Issue 草稿」备用链接，在 GitHub 正文粘贴。预填链接无法打开、被拦截或网络加载失败时也可使用。打开草稿不代表已提交，本地记录会保留。</p>
    <p>完整正文：{submission.byteLength.toLocaleString('en-US')} UTF-8 字节；本站单次预算为 30,000 UTF-8 字节。</p>
    {!overBudget && !submission.prefilledUrl && !!keys.length && <p>完整编码后的链接超过本站 6,000 字符的 URL 预算。请先复制完整 Issue 内容，再打开备用草稿，在 GitHub 正文粘贴并最终发布。这是本站的保守预算，并非 GitHub 官方上限。</p>}
    {overBudget && <p role="alert" className="cal-warning">完整正文为 {submission.byteLength.toLocaleString('en-US')} UTF-8 字节，超过本站 30,000 字节的单次预算。请减少勾选条目，或返回编辑缩短备注后重试。全部内容仍保留，没有截断。</p>}
    {!keys.length && <p role="alert">请至少选择一条已保存记录。</p>}
    <div className="cal-submission-actions">{!!keys.length && !overBudget && <>
      {submission.prefilledUrl && <button className="primary" onClick={openPrefilledDraft}>打开已预填的 GitHub Issue 草稿</button>}
      <button onClick={copyBody}>复制完整 Issue 内容</button>
      <a href={submission.shortUrl} target="_blank" rel="noopener noreferrer">打开 GitHub Issue 草稿</a>
      {deliveryStatus.body === submission.body && <p role="status">{deliveryStatus.message}</p>}
    </>}</div>
  </dialog>
}
