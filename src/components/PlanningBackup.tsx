import { useState, type Dispatch, type SetStateAction } from 'react'
import { restorePlanningState, type AppState } from '../logic/storage'
import { restoreVoyageHistory } from '../logic/voyageHistory'

const scope = '全部库存、摆盘与朝向、边界、策略及求解与预留配置、航程历史'

/** The same planning-state file format, separate from game-text inventory imports. */
export function PlanningBackup({ state, onLoadState }: {
  state: AppState
  onLoadState: Dispatch<SetStateAction<AppState>>
}) {
  const [message, setMessage] = useState('')
  const exportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const anchor = document.createElement('a')
    anchor.href = URL.createObjectURL(blob)
    anchor.download = 'voyage-solver-state.json'
    anchor.click()
    URL.revokeObjectURL(anchor.href)
  }
  const importJson = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text())
      onLoadState(restorePlanningState(parsed))
      setMessage('已从 JSON 载入规划状态' + (restoreVoyageHistory(parsed?.voyageHistory).damaged ? '；已忽略损坏航程历史，其余规划数据已保留' : ''))
    } catch {
      setMessage('JSON 文件无效或无法读取')
    }
  }
  return <div className="planning-backup" role="group" aria-label="规划备份：库存、摆盘、配置和历史">
    <button onClick={exportJson} title={`保存${scope}为 JSON 文件；不含主题及中文校准记录`}>导出规划备份</button>
    <label className="file-btn" title={`从 JSON 文件恢复${scope}，替换当前规划`}>
      恢复规划备份
      <input aria-label="恢复规划备份" type="file" accept=".json" onChange={(event) => {
        const file = event.currentTarget.files?.[0]
        event.currentTarget.value = ''
        if (file) void importJson(file)
      }} />
    </label>
    {message && <div className="planning-backup-status"><span role="status">{message}</span><button aria-label="关闭备份提示" onClick={() => setMessage('')}>✕</button></div>}
  </div>
}
