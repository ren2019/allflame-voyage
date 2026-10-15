import { useState } from 'react'
import { STRATEGIES } from '../data/strategies'
import { keeperRecommendation } from '../logic/keeperAssistant'
import { CompactCopyText } from './CompactCopyText'
import './keeper-assistant.css'

/** Local UI selection only: no inventory, reservation or solver-setting mutation interface. */
export function KeeperAssistant() {
  const [selected, setSelected] = useState<string[]>([])
  return <details className="keeper-assistant">
    <summary>留图助手</summary>
    <section aria-label="留图助手">
      <p className="muted">无需导入库存。选择想积攒的策略，复制搜索串后在游戏中手动整理海图。</p>
      <fieldset>
        <legend>想积攒的策略（可多选）</legend>
        {STRATEGIES.map((strategy) => <label key={strategy.id}>
          <input type="checkbox" checked={selected.includes(strategy.id)} onChange={(event) =>
            setSelected((current) => event.target.checked ? [...current, strategy.id] : current.filter((id) => id !== strategy.id))} />
          {strategy.name}
        </label>)}
      </fieldset>
      <p className="muted">仅提供推荐，不改变策略预留、摆盘锁定或求解策略。</p>
      {STRATEGIES.filter((strategy) => selected.includes(strategy.id)).map((strategy) => {
        const recommendation = keeperRecommendation(strategy.id)
        return <article key={strategy.id} aria-label={`${strategy.name}留图建议`}>
          {recommendation.regex ? <>
            <CompactCopyText label={`${strategy.name}留图搜索`} text={recommendation.regex} />
            {recommendation.note && <p className="muted">{recommendation.note}</p>}
            <p className="muted">游戏语法与容量未验证 · 完整保留 {recommendation.conditions.length} 项条件 · {recommendation.regex.length} 字符</p>
            <details><summary>条件与来源</summary>
              <ul>{recommendation.conditions.map((condition) => <li key={condition.pattern}>{condition.label} <small>（{condition.source}）</small></li>)}</ul>
              <p className="muted">{recommendation.source} · 配置 {recommendation.version}</p>
            </details>
          </> : <p>{strategy.name}：{recommendation.note}</p>}
        </article>
      })}
    </section>
  </details>
}
