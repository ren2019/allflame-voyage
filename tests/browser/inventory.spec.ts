import { readFileSync } from 'node:fs'
import { expect, test } from './offline'

const samples = readFileSync(new URL('../../samples/charted.zh-CN.txt', import.meta.url), 'utf8')
const [first, second] = samples.trim().split(/\n\s*(?=物品类别: 海图)/)

test('简中导入和库存保持同批实例、重扫数量及已核对属性', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.onboard .panel-title')).toHaveText('规划航程')
  await page.getByRole('button', { name: '开始规划', exact: true }).click()
  await expect(page.locator('.import-panel .panel-title')).toHaveText('导入海图')
  const importText = async (text: string) => {
    await page.locator('.import-panel textarea').fill(text)
    await page.getByRole('button', { name: '解析并加入', exact: true }).click()
  }
  await importText(`${first}\n${first}`)
  await expect(page.locator('.chart-grid .chart-sq')).toHaveCount(2)
  await expect(page.locator('.import-panel .muted.pad')).toHaveText('导入 2 张海图')
  await importText(`${first}\n${first}`)
  await expect(page.locator('.chart-grid .chart-sq')).toHaveCount(2)
  await expect(page.locator('.import-panel .muted.pad')).toContainText('跳过 2 张已在库存中的海图')
  await importText(first)
  await expect(page.locator('.chart-grid .chart-sq')).toHaveCount(2)
  await expect(page.locator('.import-panel .muted.pad')).toContainText('跳过 1 张已在库存中的海图')
  await importText(second)
  await expect(page.locator('.chart-grid .chart-sq')).toHaveCount(3)
  await page.getByTitle('列表视图（编辑海图）', { exact: true }).click()
  const cards = page.locator('.chart-card')
  await expect(cards).toHaveCount(3)
  const firstCard = cards.filter({ has: page.locator('.chart-name', { hasText: '航海 冒险 珊瑚暗礁海图' }) }).first()
  await expect(firstCard).toContainText('蛤蜊海架')
  await expect(firstCard).toContainText('端点')
  await expect(firstCard).toContainText('区域等级 83')
  await expect(firstCard).toContainText('物品数量 +110%')
  await expect(firstCard).toContainText('亡者硫磺 +75%')
  await expect(firstCard).toContainText('相邻区域包含 (8—10) 个额外的螃蟹群')
  const secondCard = cards.filter({ has: page.locator('.chart-name', { hasText: '航海 深入 金沙海床海图' }) })
  await expect(secondCard).toContainText('深渊平原')
  await expect(secondCard).toContainText('直线')
  await expect(secondCard).toContainText('怪物群大小 +5%')
  await expect(secondCard).toContainText('所有航行区域的怪物群规模提高 5%')
  await page.getByPlaceholder('按名称或词缀筛选…').fill('螃蟹')
  await expect(cards).toHaveCount(2)
  // Source-only derived chart exercises newly acquired parser and UI vocabulary;
  // it is not counted as an additional real mainland client sample.
  const magic = first.replace(/(\{ 基底属性 \}\n)[^\n]+/, '$1相邻区域的魔法怪物数量提高 30%').replace('+33(26-40)%', '+34(26-40)%')
  // The original dedupe boundary keys on retained explicit rawText; this
  // distinct physical example also has a different explicit resistance roll.
  await importText(magic)
  await expect(page.locator('.import-panel .muted.pad')).toHaveText('导入 1 张海图')
  await page.getByPlaceholder('按名称或词缀筛选…').fill('魔法怪物数量')
  await expect(cards).toHaveCount(1)
  await expect(cards).toContainText('相邻区域的魔法怪物数量提高 30%')
})
