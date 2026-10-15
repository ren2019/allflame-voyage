interface Props {
  onClose: () => void
  onDemo: () => void
}

const STEPS: { title: string; body: string }[] = [
  { title: '1 · 收集并测绘海图', body: '在地图中的深海遭遇获得海图后，登上君临号，与瓦莱丽一起完成测绘，揭示航行词缀。' },
  { title: '2 · 导入库存', body: '在国服游戏中 Ctrl+Alt+C 高级复制已测绘海图，然后在本页 Ctrl+V 导入，也可在库存中手动添加。尚无海图时，可用 25 张随机示例体验。' },
  { title: '3 · 设置边界', body: '航程是从左下角 ⚓ 出发的 3×3 摆盘。12 个边界作用于直接接触的格子：四角各两个，边中格各一个，中心没有直接边界。填写当前边界或随机生成；游戏内可用亡者硫磺重置边界。' },
  { title: '4 · 设置奖励权重', body: '按偏好设置通货、圣甲虫、命运卡、硫磺等奖励的权重，它们影响海图价值、摆盘评分和优选海图搜索。' },
  { title: '5 · 求解并放置', body: '求解器寻找满足连接要求的高价值摆盘。点击候选载入方案，可继续手动调整，再按游戏内放置指南定位海图。' },
]

export function Onboarding({ onClose, onDemo }: Props) {
  return (
    <div className="onboard-backdrop" onClick={onClose}>
      <div className="onboard" onClick={(e) => e.stopPropagation()}>
        <div className="panel-title">规划航程</div>
        <p className="onboard-intro">
          从已测绘海图库存规划 3×3 航程，按连接形状、相邻效果和边界词缀求解摆盘。
        </p>
        {STEPS.map((s) => (
          <div key={s.title} className="onboard-step">
            <div className="onboard-step-title">{s.title}</div>
            <div className="onboard-step-body">{s.body}</div>
          </div>
        ))}
        <div className="onboard-scopes">
          词缀颜色：&nbsp;
          <span className="scope-self">■ 本区域</span>&nbsp;·&nbsp;
          <span className="scope-adjacent">■ 相邻区域</span>&nbsp;·&nbsp;
          <span className="scope-global">■ 全航程</span>
        </div>
        <div className="onboard-actions">
          <button
            className="primary"
            onClick={() => {
              onDemo()
              onClose()
            }}
          >
            使用 25 张示例海图体验
          </button>
          <button onClick={onClose}>开始规划</button>
        </div>
      </div>
    </div>
  )
}
