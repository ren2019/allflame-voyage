import config from '../data/region-targets.json'
import { borderModById, voyageModById } from '../data/mods'
import type { Board, Borders, ChartData } from '../types'
import { borderTouches } from '../types'
import type { ScoreOptions } from './scoring'
import { boardEffectScope } from './effectScope'

export const REGION_TARGET_CONFIG = config
export type TargetDefinition = typeof config.targets[number]
export interface TargetSource { kind: 'destination' | 'mod' | 'border'; id: string; cell?: number; segment?: number }
export interface RegionalTarget { id: string; definition: TargetDefinition; weight: number; sources: TargetSource[] }
export interface TargetGroup { id: string; label: string; weight: number; targets: RegionalTarget[]; representative: TargetDefinition }
export interface RegionalCell { targets: RegionalTarget[]; groups: TargetGroup[]; visible: TargetGroup[]; overflow: boolean; activeMods: string[]; context: string[]; uncovered: string[] }
const defaultOptions: ScoreOptions = { adjacencyMode:'physical', adjacentAffectsSelf:false }

export function priorityBand(weight: number) {
  return config.display.priorityBands.find(b=>weight>=b.min&&weight<=b.max) ?? null
}

/** Read-only, deterministic presentation projection. Strategy can only rank existing encounters. */
export function regionTargets(board: Board, borders: Borders, charts: Map<string,ChartData>, strategyId: string|null, opts: ScoreOptions=defaultOptions, rulesConfig=REGION_TARGET_CONFIG): RegionalCell[] {
 const config=rulesConfig
 const definitions = new Map(config.targets.map(t=>[t.id,t]))
 const rules = new Map(config.modRules.map(r=>[r.modId,r]))
 const scope = boardEffectScope(board,charts,opts)
 const cells: RegionalCell[] = Array.from({length:9},()=>({targets:[],groups:[],visible:[],overflow:false,activeMods:[],context:[],uncovered:[]}))
 const add = (cell:number,id:string,source:TargetSource) => {
  const definition=definitions.get(id)
  if (!definition) {cells[cell].uncovered.push(id);return}
  let target=cells[cell].targets.find(t=>t.id===id)
  if (!target) {
   const overrides: Record<string,number> = definition.strategyOverrides
   target={id,definition,weight:strategyId ? overrides[strategyId]??definition.basePriority:definition.basePriority,sources:[]}
   cells[cell].targets.push(target)
  }
  target.sources.push(source)
 }
 const applyMod = (cell:number,id:string,source:TargetSource) => {
  const rule=rules.get(id)
  cells[cell].activeMods.push(id)
  if (!rule) {cells[cell].uncovered.push(id);return}
  if(scope.connCount[cell]<rule.minimumConnections) return
  rule.targetIds.forEach(t=>add(cell,t,source))
  if (rule.contextLabel) cells[cell].context.push(rule.contextLabel)
 }
 board.forEach((p,i)=>{
  if(!p) return
  const chart=charts.get(p.chartUid)
  if(!chart) return
  const destination=config.destinationRules.find(r=>r.destinationId===chart.areaType)
  destination?.targetIds.forEach(id=>add(i,id,{kind:'destination',id:destination.destinationId,cell:i}))
  if (chart.areaType && !destination) cells[i].uncovered.push(chart.areaType)
  for(const id of chart.modIds) {
   if(opts.disabledMods?.has(id)) continue
   const mod=voyageModById.get(id)
   if(!mod) {cells[i].uncovered.push(id);continue}
   const scale=mod.scaling==='connections'?scope.connCount[i]:mod.scaling==='inverse-connections'?4-scope.connCount[i]:1
   if(scale<=0) continue
   for(const n of scope.targets(i,mod.scope)) applyMod(n,id,{kind:'mod',id,cell:i})
  }
 })
 borders.forEach((id,segment)=>{
  const cell=borderTouches(segment)
  if(!id||!board[cell]||opts.disabledMods?.has(id)) return
  if(!borderModById.has(id)) {cells[cell].uncovered.push(id);return}
  applyMod(cell,id,{kind:'border',id,segment})
 })
 cells.forEach(cell=>{
  for(const rule of config.regionalPriorityRules) {
   if(!strategyId||!rule.whenStrategyIds.includes(strategyId)||!rule.whenActiveModIdsAny.some(id=>cell.activeMods.includes(id))) continue
   const overrides:Record<string,number>=rule.priorityOverrides
   for(const target of cell.targets) if(overrides[target.id]!==undefined) target.weight=overrides[target.id]
  }
  const sortTargets=(a:RegionalTarget,b:RegionalTarget)=>b.weight-a.weight||a.definition.tieBreak-b.definition.tieBreak
  cell.targets.sort(sortTargets)
  const grouped=new Map<string,RegionalTarget[]>()
  for(const target of cell.targets) {
   if(target.weight<=0) continue
   const key=target.definition.displayGroup
   grouped.set(key,[...(grouped.get(key)??[]),target])
  }
  cell.groups=[...grouped].map(([id,targets])=>({id,label:config.displayGroups.find(g=>g.id===id)?.label??targets[0].definition.label,weight:targets[0].weight,representative:targets[0].definition,targets}))
    .sort((a,b)=>b.weight-a.weight||a.representative.tieBreak-b.representative.tieBreak)
  cell.overflow=cell.groups.length>config.display.maxIcons
  cell.visible=cell.groups.slice(0,cell.overflow?config.display.maxIcons-1:config.display.maxIcons)
 })
 return cells
}
