#!/usr/bin/env node
/**
 * 快速翻译 · 浏览器半边离线冒烟测试（不需要 DSH、不需要浏览器）
 *
 *   node dev/smoke.mjs
 *
 * 做什么：
 *   1. 用最小的 React / DOM / fetch 垫片加载 client.js，跑 apply()，确认两个 slot 都注册了
 *   2. 把 TranslatePanel 里所有组件递归渲染一遍，抓 ReferenceError / TypeError
 *   3. 检查 zh / en 两套文案的 key 完全一致
 *   4. 真的点按钮走一遍主流程：加载模型 → 翻译（假 SSE 流）→ 入历史 → ⇄ 交换两次复原
 *      → 显式方向翻转/复原 → 清空 → 回看历史 → 删除 → 两步清空 → 折叠历史
 *   5. 风格切换：纸本 → 色场（记进偏好、刷新后保持），色场下再走一遍翻译 / 互换 / 历史 / 分享，最后切回纸本
 *
 * 它不能做的：看不见界面长什么样。样式是否好看只能靠人（或截图）。
 * 改了 client.js 之后先跑这个，全绿再去刷新页面。
 */
import fs from 'node:fs'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const clientPath = resolve(here, '../client.js')
const src = fs.readFileSync(clientPath, 'utf8')
const encoder = new TextEncoder()

/* ----------------------------- 垫片 ----------------------------- */
let loaded = null
const localeListeners = {}
globalThis.window = { innerWidth: 1200, __ModuleLoader__: { load: (m) => { loaded = m } }, addEventListener() {}, removeEventListener() {} }
globalThis.document = {
  baseURI: 'http://localhost/',
  querySelector: () => null,
  createElement: () => ({ dataset: {} }),
  head: { appendChild() {} },
  addEventListener() {},
  removeEventListener() {},
}
Object.defineProperty(globalThis, 'navigator', { value: { platform: 'MacIntel', language: 'zh-CN', clipboard: { writeText: async () => {} } }, configurable: true, writable: true })
const storage = new Map()
globalThis.localStorage = { getItem: (k) => (storage.has(k) ? storage.get(k) : null), setItem: (k, v) => storage.set(k, v) }
globalThis.location = { origin: 'http://localhost' }
globalThis.TextDecoder = TextDecoder

let translateCalls = 0
globalThis.fetch = async (url) => {
  const s = String(url)
  if (s.includes('/models')) {
    return { ok: true, json: async () => ({ ok: true, models: [{ provider: 'p', providerName: 'Provider P', model: 'm1', name: 'Model One' }], skipped: [], default: { provider: 'p', model: 'm1' } }) }
  }
  if (s.includes('/translate')) {
    translateCalls++
    const events = [
      { type: 'meta', provider: 'p', model: 'm1' },
      { type: 'delta', text: '你好' },
      { type: 'delta', text: '，世界' },
      { type: 'done', text: '你好，世界', elapsedMs: 12, truncated: false, provider: 'p', model: 'm1' },
    ]
    const bytes = encoder.encode(events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join(''))
    let sent = false
    return { ok: true, body: { getReader: () => ({ read: async () => (sent ? { done: true } : ((sent = true), { done: false, value: bytes })) }) } }
  }
  throw new Error('unexpected fetch ' + s)
}

// React 垫片：state 槽按「组件实例路径 + 序号」隔离，这样嵌套组件互不串槽
let stack = []
let localIdx = 0
const stateStore = new Map()
const slot = () => `${stack.join('>') || 'root'}#${localIdx++}`
const React = {
  createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
  useState(init) {
    const k = slot()
    if (!stateStore.has(k)) stateStore.set(k, typeof init === 'function' ? init() : init)
    return [stateStore.get(k), (next) => stateStore.set(k, typeof next === 'function' ? next(stateStore.get(k)) : next)]
  },
  useEffect() {},
  useRef(init) {
    const k = slot()
    if (!stateStore.has(k)) stateStore.set(k, { current: init })
    return stateStore.get(k)
  },
  useCallback: (fn) => fn,
  useMemo: (fn) => fn(),
}

/* ----------------------------- 加载 ----------------------------- */
vm.runInThisContext(src)
if (!loaded) throw new Error('client.js 没有调用 window.__ModuleLoader__.load()')
const mod = loaded.factory((name) => (name === 'react' ? React : (() => { throw new Error('只能 require("react")，收到：' + name) })()))
const registrations = []
const ctx = {
  inject(deps, cb) {
    if (deps.includes('locale')) return cb({ locale: { getSnapshot: () => ({ active: 'zh' }) }, on(evt, fn) { localeListeners[evt] = fn } })
  },
  slots: { inject: (_k, fn) => fn(), register: (o, c) => (registrations.push({ o, c }), () => {}) },
}
mod.apply(ctx)

let failures = 0
const check = (label, ok) => { console.log(`  ${ok ? '✓' : '✗'} ${label}`); if (!ok) failures++ }
const section = (title) => console.log(`\n== ${title}`)

/* ----------------------------- 遍历 ----------------------------- */
const Panel = registrations.find((r) => r.o.name === 'main')?.c
function render() { stack = []; localIdx = 0; return Panel() }
function findAll(node, pred, out = []) {
  if (!node || typeof node !== 'object') return out
  if (Array.isArray(node)) { node.forEach((c) => findAll(c, pred, out)); return out }
  if (typeof node.type === 'function') {
    const saved = localIdx
    stack.push(node.type.name + (node.props?.key ? ':' + node.props.key : ''))
    localIdx = 0
    const r = node.type(node.props)
    stack.pop()
    localIdx = saved
    return findAll(r, pred, out)
  }
  if (pred(node)) out.push(node)
  findAll(node.children, pred, out)
  return out
}
const byClass = (cls) => (n) => typeof n.props?.className === 'string' && n.props.className.split(' ').includes(cls)
const one = (tree, cls) => { const r = findAll(tree, byClass(cls)); if (r.length !== 1) throw new Error(`期望恰好 1 个 .${cls}，实际 ${r.length}`); return r[0] }
const click = (n) => n.props.onClick?.({ preventDefault() {}, stopPropagation() {}, target: {} })
const text = (n) => (n.children || []).map((c) => (typeof c === 'string' ? c : '')).join('')
const tick = (ms = 15) => new Promise((r) => setTimeout(r, ms))
const textareas = (tree) => findAll(tree, (n) => n.type === 'textarea')
const srcTA = (tree) => textareas(tree)[0]
const dstTA = (tree) => textareas(tree)[1]

/* ----------------------------- 1. 注册 ----------------------------- */
section('注册')
check('module id = dsh-quick-translate', loaded.id === 'dsh-quick-translate')
check('exports { apply, inject }', typeof mod.apply === 'function' && Array.isArray(mod.inject))
const main = registrations.find((r) => r.o.name === 'main')
const side = registrations.find((r) => r.o.name === 'sidebar.panellist')
check('main 以 key=quick-translate 注册', main?.o.key === 'quick-translate')
check('sidebar.panellist 以 id=quick-translate 注册，label 是函数', side?.o.id === 'quick-translate' && typeof side.o.label === 'function')
check('sidebar label() = 快速翻译', side.o.label() === '快速翻译')

/* ----------------------------- 2. 渲染 ----------------------------- */
section('渲染')
let tree = render()
const components = new Set()
;(function seen(node) { if (!node || typeof node !== 'object') return; if (Array.isArray(node)) return node.forEach(seen); if (typeof node.type === 'function') { components.add(node.type.name); const s = localIdx; stack.push(node.type.name); localIdx = 0; const r = node.type(node.props); stack.pop(); localIdx = s; return seen(r) } seen(node.children) })(tree)
check(`TranslatePanel 全部组件渲染通过（${[...components].join(', ')}）`, components.size > 0)
check('SidebarIcon 渲染通过', (() => { stack = []; localIdx = 0; const el = side.c({ size: 18 }); const inner = typeof el.type === 'function' ? el.type(el.props) : el; return inner.type === 'svg' })())
localeListeners['locale/change']?.()

/* ----------------------------- 3. 文案 ----------------------------- */
section('文案')
const m = src.match(/const STR = \{[\s\S]*?\n    \}\n/)
const STR = vm.runInThisContext('(' + m[0].replace('const STR = ', '') + ')')
const zhKeys = Object.keys(STR.zh)
const enKeys = Object.keys(STR.en)
const diff = zhKeys.filter((k) => !enKeys.includes(k)).concat(enKeys.filter((k) => !zhKeys.includes(k)))
check(`zh / en key 一致（${zhKeys.length} 个）`, diff.length === 0)
if (diff.length) console.log('    不一致：', diff)
check('CSS 只引用 --dsw-alias-* / --dsh-* 变量（没有其它硬编码 CSS 变量）', !/var\(--(?!dsw-|dsh-|qt-)[a-z]/.test(src))

/* ----------------------------- 4. 交互 ----------------------------- */
section('交互')
const pressed = (t) => findAll(t, (n) => n.type === 'button' && n.props['aria-pressed'] === 'true').map(text).filter((s) => !['历史', '纸本', '色场'].includes(s))
const refreshBtn = (t) => findAll(t, (n) => n.type === 'button' && n.props.title === '刷新模型')[0]

click(refreshBtn(tree)); await tick(); tree = render()
// 历史默认收起（小票会盖住硫酸纸右侧），先打开它
click(findAll(tree, (n) => n.type === 'button' && text(n) === '历史')[0]); tree = render()
check('打开历史', findAll(tree, byClass('qt-history')).length === 1)
check('加载模型后出现翻译按钮', findAll(tree, byClass('qt-btn-primary')).length === 1)

srcTA(tree).props.onChange({ target: { value: 'Hello, world.' } }); tree = render()
click(one(tree, 'qt-btn-primary')); await tick(); tree = render()
check('翻译 → 译文流式到达', dstTA(tree).props.value === '你好，世界')
check('fetch /translate 只调了一次', translateCalls === 1)
check('历史 1 条', findAll(tree, byClass('qt-hitem')).length === 1)
check('头部历史徽标 = 1', text(one(tree, 'qt-badge')) === '1')
check('状态芯片 = 完成', /完成/.test(text(one(tree, 'qt-chip-ok'))))
check('历史条目标记为 current', one(tree, 'qt-hitem').props['aria-current'] === 'true')

check('初始方向 = 自动', JSON.stringify(pressed(tree)) === JSON.stringify(['自动']))
click(one(tree, 'qt-swap')); tree = render()
check('⇄ 第 1 次：原文 = 译文', srcTA(tree).props.value === '你好，世界')
check('⇄ 第 1 次：译文 = 原文', dstTA(tree).props.value === 'Hello, world.')
click(one(tree, 'qt-swap')); tree = render()
check('⇄ 第 2 次：原文复原', srcTA(tree).props.value === 'Hello, world.')
check('⇄ 第 2 次：译文复原', dstTA(tree).props.value === '你好，世界')
check('自动模式交换后仍是自动', JSON.stringify(pressed(tree)) === JSON.stringify(['自动']))
check('交换不动历史', findAll(tree, byClass('qt-hitem')).length === 1)

findAll(tree, (n) => n.type === 'button' && text(n) === '英 → 中')[0].props.onClick(); tree = render()
click(one(tree, 'qt-swap')); tree = render()
check('显式 英→中 → 交换 → 中→英', JSON.stringify(pressed(tree)) === JSON.stringify(['中 → 英']))
click(one(tree, 'qt-swap')); tree = render()
check('再交换 → 英→中', JSON.stringify(pressed(tree)) === JSON.stringify(['英 → 中']))

click(findAll(tree, (n) => n.type === 'button' && text(n) === '清空')[0]); tree = render()
check('清空 → 两栏为空', srcTA(tree).props.value === '' && dstTA(tree).props.value === '')
check('清空不动历史', findAll(tree, byClass('qt-hitem')).length === 1)
click(one(tree, 'qt-hitem')); tree = render()
check('回看 → 原文回来', srcTA(tree).props.value === 'Hello, world.')
check('回看 → 译文回来', dstTA(tree).props.value === '你好，世界')
check('回看 → 方向保持 英→中（条目目标就是中文，不矛盾）', JSON.stringify(pressed(tree)) === JSON.stringify(['英 → 中']))

click(one(tree, 'qt-hitem-del')); tree = render()
check('删除 → 历史为空', findAll(tree, byClass('qt-hitem')).length === 0)
check('删除 → 两栏内容保留', srcTA(tree).props.value === 'Hello, world.')
check('删除 → 显示空提示', /还没有翻译记录/.test(text(one(tree, 'qt-empty-sm'))))

click(one(tree, 'qt-btn-primary')); await tick(); tree = render()
check('再翻译 → 历史 1 条', findAll(tree, byClass('qt-hitem')).length === 1)
const clearHistoryBtn = (t) => findAll(t, (n) => n.type === 'button' && /清空历史|确认清空/.test(text(n)))[0]
click(clearHistoryBtn(tree)); tree = render()
check('清空历史 → 第 1 次进入确认态', /确认清空/.test(text(clearHistoryBtn(tree))))
check('清空历史 → 确认前仍有 1 条', findAll(tree, byClass('qt-hitem')).length === 1)
click(clearHistoryBtn(tree)); tree = render()
check('清空历史 → 第 2 次真的清空', findAll(tree, byClass('qt-hitem')).length === 0)

click(findAll(tree, (n) => n.type === 'button' && text(n).includes('历史'))[0]); tree = render()
check('折叠历史', findAll(tree, byClass('qt-history')).length === 0)

/* ----------------------------- 5. 风格切换 ----------------------------- */
section('风格切换')
const rootOf = (t) => findAll(t, (n) => typeof n.props?.className === 'string' && n.props.className.split(' ').includes('qt-root'))[0]
const isField = (t) => rootOf(t).props.className.split(' ').includes('qt-skin-field')
const btnText = (t, label) => findAll(t, (n) => n.type === 'button' && text(n) === label)[0]
const prefsNow = () => JSON.parse(storage.get('dsh-quick-translate:prefs') || '{}')
check('默认是纸本风格', !isField(tree) && findAll(tree, byClass('qt-note')).length === 1)
check('纸本头部有风格切换，当前 = 纸本', btnText(tree, '纸本')?.props['aria-pressed'] === 'true' && btnText(tree, '色场')?.props['aria-pressed'] === 'false')
click(btnText(tree, '色场')); tree = render()
check('点「色场」→ 换成色场风格', isField(tree) && findAll(tree, byClass('qt-ffield')).length === 1 && findAll(tree, byClass('qt-note')).length === 0)
check('色场头部的风格切换，当前 = 色场', btnText(tree, '色场')?.props['aria-pressed'] === 'true')
// 偏好写入靠 effect（垫片里不跑），这里按组件写偏好的那一行直接核对源码 + 模拟一次写入
check('风格写进偏好（prefs.skin）', /writeJson\(PREFS_KEY, \{[^}]*\bskin\b[^}]*\}\)/.test(src))
storage.set('dsh-quick-translate:prefs', JSON.stringify({ ...prefsNow(), skin: 'field' }))
stateStore.clear(); tree = render()
check('刷新后仍是色场', isField(tree))
click(refreshBtn(tree)); await tick(); tree = render()
check('色场：加载模型后出现翻译按钮', findAll(tree, byClass('qt-fgo-primary')).length === 1)
check('色场：初始历史为空（上一段已清空）', text(one(tree, 'qt-fcnt')) === '0')

translateCalls = 0
srcTA(tree).props.onChange({ target: { value: 'Hello, world.' } }); tree = render()
click(one(tree, 'qt-fgo-primary')); await tick(); tree = render()
check('色场：翻译 → 译文流式到达', dstTA(tree).props.value === '你好，世界' && translateCalls === 1)
check('色场：状态 = 完成', /完成/.test(text(one(tree, 'qt-fchip-ok'))))
check('色场：头部历史计数 = 1', text(one(tree, 'qt-fcnt')) === '1')
check('色场：初始方向 = 自动', JSON.stringify(pressed(tree)) === JSON.stringify(['自动']))
click(one(tree, 'qt-fswap')); tree = render()
check('色场：⇄ 第 1 次互换', srcTA(tree).props.value === '你好，世界' && dstTA(tree).props.value === 'Hello, world.')
click(one(tree, 'qt-fswap')); tree = render()
check('色场：⇄ 第 2 次复原', srcTA(tree).props.value === 'Hello, world.' && dstTA(tree).props.value === '你好，世界')
btnText(tree, '英 → 中').props.onClick(); tree = render()
click(one(tree, 'qt-fswap')); tree = render()
check('色场：显式 英→中 → 交换 → 中→英', JSON.stringify(pressed(tree)) === JSON.stringify(['中 → 英']))
click(one(tree, 'qt-fswap')); tree = render()
check('色场：再交换 → 英→中', JSON.stringify(pressed(tree)) === JSON.stringify(['英 → 中']))

click(btnText(tree, '历史')); tree = render()
check('色场：打开历史卡，盖在译文位置上', findAll(tree, byClass('qt-fhist')).length === 1 && findAll(tree, byClass('qt-ffield')).length === 1)
check('色场：历史 1 条', findAll(tree, byClass('qt-fhi')).length === 1)
click(btnText(tree, '清空')); tree = render()
check('色场：清空 → 两栏为空', srcTA(tree).props.value === '' && dstTA(tree).props.value === '')
click(one(tree, 'qt-fhi')); tree = render()
check('色场：回看 → 两栏回来', srcTA(tree).props.value === 'Hello, world.' && dstTA(tree).props.value === '你好，世界')
check('色场：回看后历史卡收起，露出译文', findAll(tree, byClass('qt-fhist')).length === 0)
click(one(tree, 'qt-share-btn')); tree = render()
check('色场：分享图片 → 打开分享浮层（色场卡片）', findAll(tree, byClass('qt-share')).length === 1 && findAll(tree, byClass('qt-fsbtn-primary')).length === 1)
click(btnText(tree, '关闭')); tree = render()
check('色场：关闭分享浮层', findAll(tree, byClass('qt-share')).length === 0)
click(btnText(tree, '历史')); tree = render()
check('色场：回看的那条标记为 current', one(tree, 'qt-fhi').props['aria-current'] === 'true')
click(one(tree, 'qt-fhi-del')); tree = render()
check('色场：删除 → 历史为空、显示空提示', findAll(tree, byClass('qt-fhi')).length === 0 && /还没有翻译记录/.test(text(one(tree, 'qt-fempty'))))
click(findAll(tree, (n) => n.type === 'button' && n.props['aria-label'] === '收起历史')[0]); tree = render()
check('色场：收起历史', findAll(tree, byClass('qt-fhist')).length === 0)

click(btnText(tree, '纸本')); tree = render()
check('切回纸本 → 方格本、硫酸纸回来，内容不丢', !isField(tree) && findAll(tree, byClass('qt-note')).length === 1 && srcTA(tree).props.value === 'Hello, world.')
check('切回纸本后照常翻译', (click(one(tree, 'qt-btn-primary')), true))
await tick(); tree = render()
check('纸本：再翻译 → 译文到达', dstTA(tree).props.value === '你好，世界')

console.log(failures ? `\nFAILED: ${failures} 项未通过\n` : '\nALL PASSED\n')
process.exit(failures ? 1 : 0)
