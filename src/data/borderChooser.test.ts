import { describe, expect, it } from 'vitest'
import { BORDER_CHOICES } from './borderLocale'
import { borderCatalogue } from './borderChooser'

describe('border chooser catalogue', () => {
  it('covers all 64 stable IDs once in the five approved, balanced categories', () => {
    const catalogue = borderCatalogue()
    expect(catalogue.map(category => [category.name, category.families.length])).toEqual([
      ['怪物数量', 6], ['收益经验', 6], ['通货掉落', 13], ['遭遇宝藏', 7], ['特殊机制', 7],
    ])
    const ids = catalogue.flatMap(category => category.families.flatMap(family => family.items.map(item => item.id)))
    expect(ids).toHaveLength(64)
    expect(new Set(ids).size).toBe(64)
    expect([...ids].sort()).toEqual(BORDER_CHOICES.map(choice => choice.id).sort())
    expect(catalogue[1].families[0]).toMatchObject({ name: '物品稀有度', items: [
      { id: 'b-rarity-1', tier: '50%' }, { id: 'b-rarity-2', tier: '75%' }, { id: 'b-rarity-3', tier: '100%' },
    ] })
    expect(catalogue[2].families.map(family => family.icon)).toEqual([
      'rare-ancient.webp', 'rare-divine.webp', 'rare-exalt.webp', 'rare-annul.webp',
      'rare-chaos.webp', 'rare-vaal.webp', 'rare-gcp.webp', 'rare-chrome.webp',
      'rare-regret.webp', 'rare-blessed.webp', 'rare-regal.webp', 'rare-support.webp', 'rare-scarabdrop.webp',
    ])
  })
  it('sorts complete family and category totals, keeps ties stable, and never treats missing data as zero', () => {
    // The currency category is complete: eleven 1-point orbs, support 4,
    // scarabs 5 => 20. Encounters are complete: anchors 6+7, six others 1 => 19.
    const weights = {
      'b-ancient': 1, 'b-divine': 1, 'b-exalt': 1, 'b-annul': 1, 'b-chaos': 1,
      'b-vaal': 1, 'b-gcp': 1, 'b-chrome': 1, 'b-regret': 1, 'b-blessed': 1, 'b-regal': 1,
      'b-support': 4, 'b-scarabdrop': 5,
      'b-octoboss': 1, 'b-crabboss': 1, 'b-locker': 1, 'b-pirates': 1,
      'b-anchor-1': 6, 'b-anchor-2': 7, 'b-goldlantern': 1, 'b-izaro': 1,
      'b-pack-1': 100, 'b-pack-2': 100, // incomplete family: NOT 200
      'b-rare-1': 0, 'b-rare-2': 0, 'b-rare-3': 0,
    }
    const catalogue = borderCatalogue(weights)
    expect(catalogue.map(category => [category.key, category.weight])).toEqual([
      ['currency', 20], ['encounters', 19], ['monsters', null], ['rewards', null], ['mechanics', null],
    ])
    expect(catalogue[0].families.map(family => family.key)).toEqual([
      'scarabdrop', 'support', 'ancient', 'divine', 'exalt', 'annul', 'chaos', 'vaal', 'gcp', 'chrome', 'regret', 'blessed', 'regal',
    ])
    expect(catalogue[1].families[0]).toMatchObject({ key: 'anchor', weight: 13 })
    expect(catalogue[2].families.slice(0, 2).map(family => [family.key, family.weight])).toEqual([['rare', 0], ['pack', null]])
    expect(borderCatalogue().map(category => category.key)).toEqual(['monsters', 'rewards', 'currency', 'encounters', 'mechanics'])
  })
})

it('treats complete zero-weight categories as known and preserves their tie order', () => {
  const zeroWeights = Object.fromEntries(BORDER_CHOICES.map(choice => [choice.id, 0]))
  expect(borderCatalogue(zeroWeights).map(category => [category.key, category.weight])).toEqual([
    ['monsters', 0], ['rewards', 0], ['currency', 0], ['encounters', 0], ['mechanics', 0],
  ])
})
