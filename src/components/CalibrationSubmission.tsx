import { useEffect, useRef, useState } from 'react'
import { calibrationRow } from '../data/calibrationCatalogue'
import { REVIEW_LABELS, type CalibrationRecords } from '../logic/calibrationRecords'
import { calibrationSubmission, calibrationSubmissionSource } from '../logic/calibrationSubmission'

export function CalibrationSubmission({ records, onClose }: { records: CalibrationRecords; onClose: () => void }) {
  const [source] = useState(() => calibrationSubmissionSource(records))
  const [keys, setKeys] = useState(Object.keys(records))
  const submission = calibrationSubmission(source, keys)
  const overBudget = submission.byteLength > 30000
  const dialog = useRef<HTMLDialogElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const modal = dialog.current
    modal?.showModal()
    closeButton.current?.focus()
    return () => { modal?.close(); opener?.focus() }
  }, [])
  return <dialog ref={dialog} className="cal-submission" aria-labelledby="cal-submission-title" onCancel={event => { event.preventDefault(); onClose() }}>
    <div className="cal-submission-header"><h2 id="cal-submission-title">提交校准 Issue 预览</h2><button ref={closeButton} onClick={onClose}>返回编辑</button></div>
    <p>校准内容和备注将公开到 GitHub。请检查后复制完整正文，在 GitHub 登录、粘贴并最终发布。</p>
    <p>已选择 {keys.length} 条 / 已保存 {Object.keys(records).length} 条。搜索和筛选不改变提交范围。</p>
    <ul className="cal-submission-records">{Object.values(records).map(record => <li key={record.key}>
      <label><input type="checkbox" aria-label={'提交 ' + record.key} checked={keys.includes(record.key)} onChange={event => setKeys(previous => event.target.checked ? [...previous, record.key] : previous.filter(key => key !== record.key))} /> <strong>{record.key}</strong></label>
      <dl><dt>位置／用途</dt><dd>{calibrationRow(record.key)!.place}</dd><dt>当前中文</dt><dd>{calibrationRow(record.key)!.chinese || '缺少中文'}</dd><dt>建议中文</dt><dd>{record.suggestion}</dd><dt>校准备注</dt><dd>{record.note || '无'}</dd><dt>审阅结果</dt><dd>{REVIEW_LABELS[record.status]}</dd></dl>
    </li>)}</ul>
    <label htmlFor="cal-submission-json">完整校准 JSON</label>
    <textarea id="cal-submission-json" readOnly value={submission.json} />
    <label htmlFor="cal-submission-body">完整 Issue 正文</label>
    <textarea id="cal-submission-body" readOnly value={submission.body} />
    <p>选中并复制以上完整正文；打开草稿后粘贴到 GitHub 正文。打开草稿不代表已提交，本地记录会保留。</p>
    <p>完整正文：{submission.byteLength.toLocaleString('en-US')} UTF-8 字节；本站单次预算为 30,000 UTF-8 字节。</p>
    {overBudget && <p role="alert" className="cal-warning">完整正文为 {submission.byteLength.toLocaleString('en-US')} UTF-8 字节，超过本站 30,000 字节的单次预算。请减少勾选条目，或返回编辑缩短备注后重试。全部内容仍保留，没有截断。</p>}
    {!keys.length && <p role="alert">请至少选择一条已保存记录。</p>}
    <div className="cal-submission-actions">{!!keys.length && !overBudget && <a href={submission.shortUrl} target="_blank" rel="noopener noreferrer">打开 GitHub Issue 草稿</a>}</div>
  </dialog>
}
