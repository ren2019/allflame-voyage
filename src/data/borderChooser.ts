import { localizedBorder } from './borderLocale'

export interface BorderChooserItem {
  id: string
  text: string
  tier: string
}
export interface BorderFamily {
  key: string
  name: string
  items: BorderChooserItem[]
  icon?: string
  iconName?: string
  /** Null means at least one tier has an unknown occurrence weight. */
  weight: number | null
}
export interface BorderCategory {
  key: string
  name: string
  families: BorderFamily[]
  weight: number | null
}

const tiers = (key: string, values: string[]) => values.map((tier, index) => ({ id: `b-${key}-${index + 1}`, tier }))
const family = (key: string, name: string, values?: string[]): BorderFamily => ({
  key, name, weight: null,
  items: (values ? tiers(key, values) : [{ id: `b-${key}`, tier: '选用' }]).map(item => ({ ...item, text: localizedBorder(item.id)!.text })),
})
const currency = (key: string, name: string, iconName = name): BorderFamily => ({
  ...family(key, key === 'support' ? '辅助技能石掉落' : `额外${name}`), icon: `rare-${key}.webp`, iconName,
})

/** Presentation catalogue in the maintainer-approved fallback order. Stable IDs,
 * complete wording, effects, and evidence remain owned by the existing tables. */
const categories: BorderCategory[] = [
  { key: 'monsters', name: '怪物数量', weight: null, families: [
    family('pack', '怪物群规模', ['16%', '24%', '32%']),
    family('rare', '稀有怪物数量', ['50%', '75%', '100%']),
    family('beasts', '额外海兽群', ['8 个', '12 个', '16 个']),
    family('crabs', '额外螃蟹群', ['8 个', '12 个', '16 个']),
    family('drowned', '额外溺亡者群', ['8 个', '12 个', '16 个']),
    family('rareconn', '每条连接增加稀有怪物', ['50%', '75%']),
  ] },
  { key: 'rewards', name: '收益经验', weight: null, families: [
    family('rarity', '物品稀有度', ['50%', '75%', '100%']),
    family('quantconn', '物品数量（每条连接降低 50%）', ['120%', '180%']),
    family('curr', '通货总增', ['50%', '75%', '100%']),
    family('scarab', '圣甲虫总增', ['50%', '75%', '100%']),
    family('gold', '装备转为金币', ['25%', '50%']),
    family('exp', '经验值', ['100%', '150%', '200%']),
  ] },
  { key: 'currency', name: '通货掉落', weight: null, families: [
    currency('ancient', '远古石'), currency('divine', '神圣石'), currency('exalt', '崇高石'),
    currency('annul', '剥离石'), currency('chaos', '混沌石'), currency('vaal', '瓦尔宝珠'),
    currency('gcp', '宝石匠的棱镜', '宝石棱镜'), currency('chrome', '幻色石'), currency('regret', '后悔石'),
    currency('blessed', '祝福石'), currency('regal', '富豪石'), currency('support', '辅助宝石'), currency('scarabdrop', '圣甲虫'),
  ] },
  { key: 'encounters', name: '遭遇宝藏', weight: null, families: [
    family('octoboss', '污秽蟹群'), family('crabboss', '船长灾星'), family('locker', '海盗储物箱'),
    family('pirates', '盐水腐朽袭掠队'), family('anchor', '额外宝藏锚', ['2 个', '4 个']),
    family('goldlantern', '黄金灯笼'), family('izaro', '女神祭坛'),
  ] },
  { key: 'mechanics', name: '特殊机制', weight: null, families: [
    family('minmagic', '至少为魔法怪物'), family('magicmods', '魔法怪物额外词缀'),
    family('mag', '词缀数值', ['40%', '60%', '80%']), family('keep', '海图不被消耗', ['30%', '50%']),
    family('lanterns', '放置灯笼不减数量'), family('sulphdrop', '稀有怪物掉落死者硫磺'),
    family('decks', '基础通货转为命运卡组'),
  ] },
]

/** Occurrence weights deliberately default to unknown; source acquisition is #38. */
export type BorderOccurrenceWeights = Readonly<Partial<Record<string, number | null>>>

function totalWeight(items: BorderChooserItem[], weights: BorderOccurrenceWeights): number | null {
  let total = 0
  for (const item of items) {
    const weight = weights[item.id]
    if (typeof weight !== 'number' || !Number.isFinite(weight) || weight < 0) return null
    total += weight
  }
  return total
}

// Complete totals precede unknowns. Returning 0 preserves the approved order
// among equal totals and unknowns, without manufacturing an occurrence rank.
function byWeight(a: { weight: number | null }, b: { weight: number | null }): number {
  if (a.weight === null) return b.weight === null ? 0 : 1
  return b.weight === null ? -1 : b.weight - a.weight
}

export function borderCatalogue(weights: BorderOccurrenceWeights = {}): BorderCategory[] {
  return categories.map(category => ({
    ...category,
    weight: totalWeight(category.families.flatMap(family => family.items), weights),
    families: category.families.map(family => ({ ...family, weight: totalWeight(family.items, weights) })).sort(byWeight),
  })).sort(byWeight)
}
