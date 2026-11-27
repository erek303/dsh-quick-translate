// 快速翻译 · 浏览器半边（界面风格：E 纸本）
//   - 侧栏加一个「快速翻译」入口，主区域是一张桌面：原文写在方格本上，译文印在叠在上面的硫酸纸上
//   - 模型选择在硫酸纸底部（点开是一张索引卡），列的是 DSH「设置 › 模型」里配好的 provider + 模型，默认跟随 DSH 默认模型
//   - 翻译走 Host 的 SSE 接口，边生成边显示；⌘/Ctrl+Enter 翻译，Esc 取消
//   - 接缝上的牛皮纸「互换」签是真正的互换：原文和译文对调、方向翻转，再点一次就换回来
//   - 每次完成的翻译自动进历史（热敏小票），点击任意一条即可回看；历史和偏好都存在 localStorage
//   - 桌面跟随 DSH 明暗主题；纸张、墨色、印章是"作品"，颜色固定；文案走 DSH 的 locale 服务
window.__ModuleLoader__.load({
  id: 'dsh-quick-translate',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useState, useEffect, useRef, useCallback, useMemo } = React

    const PANEL = 'quick-translate'
    const API = '/quick-translate/api'
    const PREFS_KEY = 'dsh-quick-translate:prefs'
    const DRAFT_KEY = 'dsh-quick-translate:draft'
    const HISTORY_KEY = 'dsh-quick-translate:history'
    const SEP = '\u001f'
    const HISTORY_MAX = 100
    const HISTORY_MAX_CHARS = 600_000
    const EMPTY_LIST = []
    const AUTHOR = 'Erek'
    const FIELD_BLUE = '#4d6bfe'
    const COMP_W = 1200 // 画板 E 的桌面尺寸（去掉标题行）
    const COMP_H = 690
    const FIELD_W = 1200 // 画板 F 色场的工作区（1200×760 去掉 64px 头部）
    const FIELD_H = 696
    const FIELD_MAX_ZOOM = 1.3 // 简洁风格放太大会显得臃肿（作者 2026-11-24 同意）

    /* ============================== 文案 ================================ */

    const STR = {
      zh: {
        title: '快速翻译',
        subtitle: '英译中 / 中译英，用 DSH 里已配置的模型',
        en2zh: '英 → 中',
        zh2en: '中 → 英',
        auto: '自动',
        model: '模型',
        direction: '方向',
        followDefault: '跟随 DSH 默认',
        refresh: '刷新模型',
        refreshing: '刷新中…',
        source: '原文',
        result: '译文',
        langZh: '中文',
        langEn: '英文',
        sourcePlaceholder: '粘贴或输入要翻译的内容…',
        resultPlaceholder: '译文会显示在这里',
        translate: '翻译',
        translating: '翻译中…',
        cancel: '取消',
        clear: '清空',
        clearTitle: '清空原文和译文',
        copy: '复制',
        copied: '已复制',
        copyFailed: '复制失败',
        copyFailedHint: '剪贴板被拒绝，已选中译文，请按 {key}+C 手动复制',
        swap: '交换原文和译文（再点一次换回来）',
        chars: '字符',
        seconds: '秒',
        noModels: 'DSH 里还没有可用的文字模型。到「设置 › 模型」里添加一个，再点下面的按钮重新加载。',
        noModelsRefresh: '重新加载模型',
        loadingModels: '正在读取模型列表…',
        loadModelsFailed: '模型列表读取失败',
        retry: '重试',
        someSkipped: (n) => `${n} 个模型服务商暂时没有响应，请稍后重试`,
        selectModel: '选择模型',
        autoHint: (t) => `译成${t === 'zh' ? '中文' : '英文'}`,
        emptySource: (key) => `输入内容后按 ${key} + Enter`,
        done: '完成',
        truncated: '输出达到模型上限，已截断',
        cancelledPartial: '已取消 · 仅为已收到的部分',
        streamBroken: '连接中断，没有收到完整结果',
        history: '历史',
        historyEmpty: '还没有翻译记录\n完成一次翻译后会自动出现在这里',
        historyEmptyFiltered: '没有匹配的记录',
        historySearch: '搜索原文、译文或模型',
        historyClear: '清空历史',
        historyConfirm: '再点一次确认清空',
        historyDelete: '删除这条',
        justNow: '刚刚',
        minutesAgo: (n) => `${n} 分钟前`,
        hoursAgo: (n) => `${n} 小时前`,
        yesterday: '昨天',
        defaultShort: '默认',
        tone: '明暗',
        toneAuto: '跟随',
        toneAutoHint: '跟随 DSH 界面的明暗',
        toneLight: '浅色',
        toneDark: '深色',
        share: '分享图片',
        shareTitle: '分享卡片',
        shareMaking: '正在生成图片…',
        shareCopy: '复制图片',
        shareCopied: '图片已复制，可以直接粘贴到聊天里',
        shareCopyFailed: '剪贴板不接受图片，请用「保存图片」',
        shareSave: '保存图片',
        shareSaved: '已保存到下载文件夹',
        shareClose: '关闭',
        today: '今天',
        deskTitle: 'Quick Translate',
        receiving: '接收中',
        standby: '待命',
        locked: '锁定 · 翻译中',
        swapShort: '互换',
        stamp: '已译',
        statSrc: '源文字符',
        statDst: '译文字符',
        statTime: '用时',
        waiting: '等待翻译',
        waitingHint: (key) => `在左边写好原文，按 ${key} ↵ 开始`,
        modelCount: (n) => `DSH 已配置 ${n} 个`,
        historyTotal: (n) => `共 ${n} 条`,
        noModelsTitle: '还没有可用的模型',
        skin: '风格',
        skinPaper: '纸本',
        skinField: '色场',
        fieldAuto: '自动识别',
        fieldAutoTo: (t) => `自动识别 · 译成${t === 'zh' ? '中文' : '英文'}`,
        fieldLocked: '翻译中，原文已锁定',
        fSrc: '源文',
        fDst: '译文',
        historyCount: (n) => `${n} 条`,
        historyHide: '收起历史',
        historyKeep: '最多保留 100 条 · 点一条即可回看',
        refreshShort: '刷新',
      },
      en: {
        title: 'Quick translate',
        subtitle: 'English ↔ Chinese with the models you already added to DSH',
        en2zh: 'EN → ZH',
        zh2en: 'ZH → EN',
        auto: 'Auto',
        model: 'Model',
        direction: 'Direction',
        followDefault: 'Use DSH default',
        refresh: 'Refresh models',
        refreshing: 'Refreshing…',
        source: 'Source',
        result: 'Translation',
        langZh: 'Chinese',
        langEn: 'English',
        sourcePlaceholder: 'Paste or type the text to translate…',
        resultPlaceholder: 'The translation appears here',
        translate: 'Translate',
        translating: 'Translating…',
        cancel: 'Cancel',
        clear: 'Clear',
        clearTitle: 'Clear source and translation',
        copy: 'Copy',
        copied: 'Copied',
        copyFailed: 'Copy failed',
        copyFailedHint: 'Clipboard blocked; text selected, press {key}+C to copy manually',
        swap: 'Swap source and translation (click again to swap back)',
        chars: 'chars',
        seconds: 's',
        noModels: 'No text model is available yet. Add one under Settings › Models, then reload below.',
        noModelsRefresh: 'Reload models',
        loadingModels: 'Loading models…',
        loadModelsFailed: 'Failed to load models',
        retry: 'Retry',
        someSkipped: (n) => `${n} provider(s) did not respond; try again shortly`,
        selectModel: 'Select a model',
        autoHint: (t) => `to ${t === 'zh' ? 'Chinese' : 'English'}`,
        emptySource: (key) => `Type, then press ${key} + Enter`,
        done: 'Done',
        truncated: 'Hit the model output limit; result may be cut off',
        cancelledPartial: 'Cancelled · partial result only',
        streamBroken: 'The connection closed before the translation finished',
        history: 'History',
        historyEmpty: 'No translations yet\nFinished translations appear here automatically',
        historyEmptyFiltered: 'No matching entries',
        historySearch: 'Search source, translation or model',
        historyClear: 'Clear history',
        historyConfirm: 'Click again to confirm',
        historyDelete: 'Delete this entry',
        justNow: 'just now',
        minutesAgo: (n) => `${n} min ago`,
        hoursAgo: (n) => `${n} h ago`,
        yesterday: 'yesterday',
        defaultShort: 'default',
        tone: 'Appearance',
        toneAuto: 'Auto',
        toneAutoHint: 'Follow the DSH appearance',
        toneLight: 'Light',
        toneDark: 'Dark',
        share: 'Share image',
        shareTitle: 'Share card',
        shareMaking: 'Rendering image…',
        shareCopy: 'Copy image',
        shareCopied: 'Image copied — paste it into any chat',
        shareCopyFailed: 'Clipboard refused the image; use Save image',
        shareSave: 'Save image',
        shareSaved: 'Saved to your Downloads folder',
        shareClose: 'Close',
        today: 'Today',
        deskTitle: 'Quick Translate',
        receiving: 'Receiving',
        standby: 'Standby',
        locked: 'Locked while translating',
        swapShort: 'Swap',
        stamp: 'DONE',
        statSrc: 'Source chars',
        statDst: 'Output chars',
        statTime: 'Time',
        waiting: 'Waiting',
        waitingHint: (key) => `Write on the left, then press ${key} ↵`,
        modelCount: (n) => `${n} in DSH`,
        historyTotal: (n) => `${n} total`,
        noModelsTitle: 'No model yet',
        skin: 'Style',
        skinPaper: 'Paper',
        skinField: 'Field',
        fieldAuto: 'Auto-detect',
        fieldAutoTo: (t) => `Auto-detect · to ${t === 'zh' ? 'Chinese' : 'English'}`,
        fieldLocked: 'Translating · source locked',
        fSrc: 'Source',
        fDst: 'Output',
        historyCount: (n) => `${n}`,
        historyHide: 'Hide history',
        historyKeep: 'Keeps the latest 100 · click one to reopen',
        refreshShort: 'Refresh',
      },
    }

    const isMac = /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent || '')
    const modKey = isMac ? '⌘' : 'Ctrl'

    const langStore = {
      lang: detectLang(),
      listeners: new Set(),
      get() {
        return this.lang
      },
      set(next) {
        if (!next || next === this.lang) return
        this.lang = next
        this.listeners.forEach((fn) => fn())
      },
      subscribe(fn) {
        this.listeners.add(fn)
        return () => this.listeners.delete(fn)
      },
    }

    function detectLang() {
      const id = String(navigator.language || 'en').toLowerCase()
      return id.startsWith('zh') ? 'zh' : 'en'
    }

    function useLang() {
      const [lang, setLang] = useState(langStore.get())
      useEffect(() => langStore.subscribe(() => setLang(langStore.get())), [])
      return lang
    }

    /* ============================== 样式 ================================ */

    // 全部走 --dsw-alias-* token；字号从 --dsh-content-font-size 派生，用户在 DSH 里调大正文时整页跟着变。
    const CSS = `
/* ============ 纸本（E）：按 Design 画板 E 的尺寸和坐标原样搭一张 1200×690 的桌面，再整体缩放到面板大小 ============ */
.qt-root{
  --qt-fs:var(--dsh-content-font-size,14px);
  --qt-mono:"IBM Plex Mono",var(--dsh-font-family-code,ui-monospace),"SF Mono",Menlo,monospace;
  --qt-grot:"Inter Tight","Helvetica Neue",Helvetica,Arial,sans-serif;
  --qt-zh-serif:"Songti SC","Noto Serif SC","Source Han Serif SC","STSong",serif;
  --qt-zh-sans:"PingFang SC","Noto Sans SC","Microsoft YaHei",sans-serif;
  --qt-en-serif:"Iowan Old Style","Newsreader","Palatino",Georgia,serif;
  --qt-desk:#1d1d1d;--qt-desk-ink:#e6e3dc;--qt-desk-faint:#3d3d3d;
  --qt-paper:#eeede7;--qt-grid:#c6d0d8;--qt-ink:#1b1b1b;--qt-ink-2:#34363d;--qt-ink-3:#77787e;
  --qt-indigo:#41468a;--qt-stamp:#3a3fa6;--qt-red:#ef4a23;--qt-redpen:#c8361a;--qt-kraft:#b88f62;--qt-receipt:#f5f5f2;--qt-masking:rgba(232,220,186,.92);
  --qt-grain:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .28 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  --qt-grain-light:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .09 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  --qt-tape-clip:polygon(0 8%,3% 0,7% 10%,11% 2%,100% 0,97% 92%,100% 100%,0 100%,2% 50%);
  --qt-ease:cubic-bezier(.2,.7,.1,1);
  position:relative;display:flex;flex-direction:column;height:100%;min-height:0;overflow:hidden;
  background:var(--qt-grain-light),radial-gradient(120% 90% at 45% 40%,transparent 50%,rgba(0,0,0,.55) 100%),var(--qt-desk);
  color:var(--qt-desk-ink);font-family:var(--qt-zh-sans);font-size:14px;line-height:1.5;
}
.qt-root *,.qt-root *::before,.qt-root *::after{box-sizing:border-box}
:where(.qt-root) :where(button,input,textarea){font:inherit;color:inherit}
:where(.qt-root) button{appearance:none;border:0;background:none;padding:0;cursor:pointer}
:where(.qt-root) button:disabled{cursor:default}
.qt-root :focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.qt-mono{font-family:var(--qt-mono);letter-spacing:.02em;text-transform:uppercase}
.qt-br::before{content:"[ "}.qt-br::after{content:" ]"}
.qt-dots{height:2px;flex:none;background-image:radial-gradient(circle,currentColor 1px,transparent 1.3px);background-size:7px 2px;opacity:.55}
.qt-spacer{flex:1}

/* 头部（窗口拖拽区）：画板左上角的标题和右上角的 History */
.qt-header{display:flex;align-items:baseline;gap:14px;flex:none;padding:22px 40px 0;padding-top:calc(22px + var(--dsh-frame-top-clearance,0px));padding-left:calc(40px + var(--dsh-frame-leading-clearance,0px))}
.qt-title{font-family:var(--qt-grot);font-weight:900;font-size:23px;letter-spacing:-.035em;white-space:nowrap}
.qt-subtitle{font-size:11px;opacity:.55;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.qt-hbtn{font-family:var(--qt-mono);font-size:12px;text-transform:uppercase;letter-spacing:.02em;display:inline-flex;align-items:center;gap:8px;white-space:nowrap;color:var(--qt-desk-ink);opacity:.85;padding:4px 0}
.qt-hbtn:hover,.qt-hbtn[aria-pressed="true"]{opacity:1}
.qt-hbtn:disabled{opacity:.4}
.qt-badge{padding:1px 6px;border:1px solid currentColor;line-height:1.4;font-variant-numeric:tabular-nums}
.qt-hbtn[aria-pressed="true"] .qt-badge{background:var(--qt-desk-ink);color:var(--qt-desk)}

/* 桌面 */
.qt-board{flex:1;min-height:0;position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden}
.qt-comp{position:relative;width:1200px;height:690px;flex:none}
.qt-deco-date{position:absolute;left:6px;bottom:72px;transform:rotate(-90deg);transform-origin:left bottom;font-family:var(--qt-grot);font-weight:800;font-size:30px;letter-spacing:-.02em;color:var(--qt-desk-faint);white-space:nowrap;pointer-events:none}
.qt-deco-side{position:absolute;right:14px;top:50px;writing-mode:vertical-rl;font-family:var(--qt-mono);font-size:11px;line-height:1.7;color:var(--qt-desk-faint);pointer-events:none}
.qt-col{position:absolute;isolation:isolate}
.qt-paper{position:absolute;inset:0;z-index:-1;pointer-events:none}
.qt-colhead{display:flex;justify-content:space-between;gap:12px;font-family:var(--qt-mono);font-size:11.5px;letter-spacing:.02em;text-transform:uppercase;white-space:nowrap;flex:none}
.qt-colhead > *{overflow:hidden;text-overflow:ellipsis}
.qt-locked{color:var(--qt-red)}
.qt-textarea{flex:1;min-height:0;width:100%;resize:none;border:0;outline:0;background:transparent;padding:0;margin:0;color:inherit;scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.22) transparent}
.qt-textarea:focus-visible{outline:0}
.qt-textarea{scrollbar-width:none}
.qt-textarea::-webkit-scrollbar{display:none}
.qt-tawrap{position:relative;flex:1;min-height:0;display:flex}
.qt-tarul{position:absolute;right:-24px;top:4px;bottom:4px;width:7px;pointer-events:none;background:repeating-linear-gradient(to bottom,currentColor 0 1px,transparent 1px 6px);opacity:0;transition:opacity .5s ease}
.qt-tarul.is-on{opacity:.55;transition-duration:.12s}
.qt-tarul i{position:absolute;left:0;right:0;background:currentColor}
.qt-note .qt-tarul{right:auto;left:-13px;color:var(--qt-ink-2)}

/* 原文：方格本（画板坐标 62,12 · 540×606 · -1.1°） */
.qt-note{left:62px;top:12px;width:540px;height:606px;transform:rotate(-1.1deg);color:var(--qt-ink)}
.qt-note .qt-paper{filter:drop-shadow(0 24px 30px rgba(0,0,0,.45))}
.qt-note .qt-paper::before{content:"";position:absolute;inset:0;
  background:var(--qt-grain),
    linear-gradient(90deg,transparent 62px,rgba(214,80,60,.45) 62px,rgba(214,80,60,.45) 63px,transparent 63px),
    linear-gradient(var(--qt-grid) 1px,transparent 1px) 0 10px/22px 22px,
    linear-gradient(90deg,var(--qt-grid) 1px,transparent 1px) 0 0/22px 22px,
    var(--qt-paper);
  clip-path:polygon(0 0,100% 0,100% 97.4%,96% 98.6%,91% 97.2%,86% 99.1%,80% 97.6%,74% 98.9%,69% 97%,63% 98.4%,57% 97.3%,51% 99.2%,45% 97.5%,39% 98.8%,33% 97.1%,27% 98.6%,21% 97.4%,15% 99%,9% 97.6%,4% 98.7%,0 97.5%)}
.qt-rings{position:absolute;left:0;top:0;bottom:18px;width:16px;background:repeating-linear-gradient(to bottom,#141414 0 11px,transparent 11px 25px);pointer-events:none}
.qt-holes{position:absolute;left:28px;top:6px;bottom:24px;width:18px;background:radial-gradient(circle,var(--qt-desk) 6.5px,transparent 7px) 0 0/18px 25px repeat-y;pointer-events:none}
.qt-note-in{position:absolute;left:82px;right:70px;top:34px;bottom:34px;display:flex;flex-direction:column}
.qt-note .qt-colhead{color:var(--qt-ink-2)}
.qt-note .qt-dots{margin:14px 0 22px;color:var(--qt-ink-2)}
.qt-src{font-family:var(--qt-mono);font-size:15.5px;line-height:1.85;color:var(--qt-ink)}
.qt-comp:not(.is-narrow) .qt-note .qt-tawrap{margin-right:30px}
.qt-src::placeholder{color:#8b8d93}
.qt-src[readonly]{cursor:default}
.qt-note-foot{display:flex;align-items:center;gap:16px;flex:none;min-height:56px;padding-right:150px}
.qt-meta{font-family:var(--qt-mono);font-size:11px;text-transform:uppercase;letter-spacing:.02em;color:var(--qt-ink-2);white-space:nowrap}

/* 文具胶带：翻译（红布胶带）· 清空 / 互换（美纹纸） */
.qt-tapebtn{position:relative;display:inline-flex;align-items:center;justify-content:center;clip-path:var(--qt-tape-clip);transition:transform .2s var(--qt-ease),opacity .15s,filter .15s}
.qt-tapebtn:disabled{opacity:.45}
.qt-tapebtn:focus-visible{outline:2px dashed currentColor;outline-offset:-7px}
.qt-actions{position:absolute;right:62px;bottom:30px;display:flex;align-items:center;gap:6px}
.qt-go{gap:16px;padding:14px 22px 14px 28px;transform:rotate(-2deg);font-family:var(--qt-zh-sans);font-weight:900;font-size:25px;letter-spacing:.06em;line-height:1.1;white-space:nowrap}
.qt-go:hover:not(:disabled){transform:rotate(-2deg) translateY(-2px)}
.qt-go kbd{font-family:var(--qt-mono);font-weight:600;font-size:11px;letter-spacing:.04em;padding:2px 5px;border:1.5px solid currentColor;line-height:1.2}
.qt-btn-primary{background:var(--qt-grain),linear-gradient(180deg,rgba(255,255,255,.14),rgba(255,255,255,0) 55%),var(--qt-red);color:#141414}
.qt-btn-stop{background:var(--qt-grain),#1b1b1b;color:var(--qt-paper)}
.qt-clear{padding:8px 20px 8px 22px;transform:rotate(-2.5deg);background:var(--qt-grain),linear-gradient(180deg,rgba(255,255,255,.22),rgba(255,255,255,0) 60%),var(--qt-masking);color:#26241f;font-family:var(--qt-zh-sans);font-weight:800;font-size:15px;letter-spacing:.24em}
.qt-clear:hover:not(:disabled){transform:rotate(-2.5deg) translateY(-2px)}

/* 互换：画板里那张牛皮纸竖签，一半压在硫酸纸下面（层级：方格本 1 → 互换 2 → 硫酸纸 3），透过磨砂纸面能看到被盖住的那半 */
.qt-note{z-index:1}
.qt-vellum{z-index:3;pointer-events:none}
.qt-vel-in,.qt-vellum .qt-picker{pointer-events:auto}
.qt-swap{position:absolute;left:512px;top:316px;z-index:2;width:78px;height:128px;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:10px;padding-left:8px;transform:rotate(-3deg);color:#171717;
  background:var(--qt-grain),var(--qt-grain),linear-gradient(180deg,rgba(0,0,0,.10),rgba(0,0,0,0) 14%,rgba(0,0,0,0) 86%,rgba(0,0,0,.12)),repeating-linear-gradient(90deg,rgba(0,0,0,.05) 0 1px,transparent 1px 4px),var(--qt-kraft);
  box-shadow:-5px 9px 16px -6px rgba(0,0,0,.5),inset 0 0 0 1px rgba(60,35,10,.18);transition:transform .25s var(--qt-ease),opacity .15s}
.qt-swap:hover:not(:disabled){transform:rotate(-3deg) translateX(-8px)}
.qt-swap:disabled{opacity:.5}
.qt-swap small,.qt-swap b{width:26px;display:flex;justify-content:center}
.qt-swap small{font-family:var(--qt-mono);font-size:11px;font-weight:600;line-height:1}
.qt-swap b{writing-mode:vertical-rl;font-family:var(--qt-zh-sans);font-weight:900;font-size:19px;letter-spacing:.12em;line-height:1}

/* 译文：硫酸纸（画板坐标 556,48 · 600×540 · 0.7°） */
.qt-vellum{left:556px;top:48px;width:600px;height:540px;transform:rotate(.7deg);color:var(--qt-indigo)}
.qt-vellum .qt-paper{background:var(--qt-grain),rgba(226,227,223,.76);-webkit-backdrop-filter:blur(2.5px) brightness(1.06);backdrop-filter:blur(2.5px) brightness(1.06);box-shadow:0 34px 60px -28px rgba(0,0,0,.65),inset 0 0 0 1px rgba(255,255,255,.35)}
.qt-vel-in{position:absolute;inset:40px 44px 36px;display:flex;flex-direction:column}
.qt-vellum .qt-colhead{font-size:12px}
.qt-vellum .qt-dots{margin:16px 0 26px}
.qt-vellum .qt-dots.qt-dots-end{margin:0 0 16px}
.qt-tape{position:absolute;height:30px;z-index:7;pointer-events:none;background:var(--qt-grain),rgba(236,231,214,.6);clip-path:var(--qt-tape-clip)}
.qt-tape-a{left:528px;top:34px;width:118px;transform:rotate(-9deg)}
.qt-tape-b{left:1070px;top:40px;width:104px;transform:rotate(7deg)}
.qt-body{flex:1;min-height:0;position:relative;display:flex;flex-direction:column}
.qt-res{font-weight:600;font-size:23px;line-height:1.8;letter-spacing:.02em;color:var(--qt-indigo)}
.qt-res[data-lang="zh"]{font-family:var(--qt-zh-serif)}
.qt-res[data-lang="en"]{font-family:var(--qt-en-serif);font-weight:500;line-height:1.6;letter-spacing:0}
.qt-res::placeholder{color:transparent}
.qt-waiting{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center;pointer-events:none;opacity:.55}
.qt-waiting b{font-family:var(--qt-zh-sans);font-weight:900;font-size:52px;letter-spacing:.08em;line-height:1.1}
.qt-waiting span{font-family:var(--qt-mono);font-size:12px}
.qt-chip-ok{font-weight:600}
.qt-chip-warn{color:var(--qt-redpen);font-weight:600}
.qt-live::after{content:" ···";animation:qt-blink 1s steps(2) infinite}
@keyframes qt-blink{50%{opacity:.2}}
.qt-error{margin:0 0 14px;padding:10px 12px;border:2px solid var(--qt-redpen);border-radius:3px 9px 4px 11px;transform:rotate(-.6deg);color:var(--qt-redpen);display:flex;gap:12px;align-items:flex-start;font-size:13px;line-height:1.5;flex:none}
.qt-error-text{flex:1;min-width:0;word-break:break-word}
.qt-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));font-family:var(--qt-mono);font-size:11.5px;line-height:1.5;flex:none}
.qt-stats b{display:block;font-weight:600;font-size:15px;font-variant-numeric:tabular-nums}
.qt-stats > :nth-child(2){text-align:center}.qt-stats > :nth-child(3){text-align:right}
.qt-bar{height:18px;margin:14px 0 16px;flex:none;position:relative;overflow:hidden;background:repeating-linear-gradient(90deg,currentColor 0 2px,transparent 2px 6px);opacity:.18}
.qt-bar[data-state="done"]{opacity:.8}
.qt-bar[data-state="streaming"]{opacity:1;background:none}
.qt-bar[data-state="streaming"]::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(90deg,currentColor 0 2px,transparent 2px 6px);opacity:.18}
.qt-bar[data-state="streaming"]::after{content:"";position:absolute;top:0;bottom:0;left:0;width:38%;background:repeating-linear-gradient(90deg,currentColor 0 2px,transparent 2px 6px);opacity:.85;animation:qt-feed 1.6s linear infinite}
@keyframes qt-feed{from{left:-38%}to{left:100%}}
.qt-vfoot{display:flex;align-items:center;gap:12px;flex:none}
.qt-link{font-family:var(--qt-mono);font-size:12px;letter-spacing:.02em;white-space:nowrap;padding:6px 0;opacity:.9}
.qt-link:hover:not(:disabled){opacity:1;text-decoration:underline;text-underline-offset:3px}
.qt-link:disabled{opacity:.35}
.qt-btn-warn{color:var(--qt-redpen);opacity:1}
.qt-sign{width:96px;height:32px;color:var(--qt-stamp);flex:none}
.qt-stamp{position:absolute;right:70px;bottom:62px;width:112px;height:112px;transform:rotate(-14deg);opacity:.6;mix-blend-mode:multiply;color:var(--qt-stamp);pointer-events:none;animation:qt-stamp .38s var(--qt-ease)}
@keyframes qt-stamp{from{opacity:0;transform:rotate(-14deg) scale(1.35)}}

/* 模型：索引卡（红页眉线 + 蓝横线，每行正好落在一条横线上） */
.qt-picker{position:relative;min-width:0}
.qt-picker-btn{display:inline-flex;align-items:baseline;gap:8px;max-width:100%;font-family:var(--qt-mono);font-size:12px;text-transform:uppercase;letter-spacing:.02em;white-space:nowrap}
.qt-picker-btn:disabled{opacity:.5}
.qt-picker-label{font-family:var(--qt-grot);font-weight:800;font-size:17px;letter-spacing:-.01em;text-transform:none;overflow:hidden;text-overflow:ellipsis;min-width:0}
.qt-picker-tag{flex:none;opacity:.7}
.qt-chev{display:inline-block;transition:transform .2s var(--qt-ease)}
.qt-picker-btn[aria-expanded="true"] .qt-chev{transform:rotate(180deg)}
.qt-picker-menu{position:absolute;left:-6px;bottom:calc(100% + 14px);z-index:30;width:352px;max-height:352px;overflow:auto;padding:22px 22px 16px;transform:rotate(-1.6deg);transform-origin:bottom left;color:var(--qt-ink);
  background:var(--qt-grain),#fbfbf8;box-shadow:0 24px 40px -12px rgba(0,0,0,.55);animation:qt-card .2s var(--qt-ease)}
@keyframes qt-card{from{opacity:0;transform:rotate(-1.6deg) translateY(8px)}}
.qt-picker-head{display:flex;justify-content:space-between;align-items:baseline;height:34px;border-bottom:1.5px solid rgba(214,80,60,.55);margin-bottom:6px}
.qt-picker-head b{font-family:var(--qt-grot);font-weight:900;font-size:20px;letter-spacing:-.03em}
.qt-picker-head span{font-family:var(--qt-mono);font-size:10.5px;color:#55575e}
.qt-picker-group-title,.qt-picker-item,.qt-picker-empty{height:28px;border-bottom:1px solid rgba(90,130,190,.28)}
.qt-picker-group-title{display:flex;align-items:flex-end;padding-bottom:4px;font-family:var(--qt-mono);font-size:10px;letter-spacing:.06em;color:#9a2d16;text-transform:uppercase}
.qt-picker-item{display:flex;align-items:center;gap:10px;width:100%;text-align:left;font-size:13px;white-space:nowrap;color:var(--qt-ink)}
.qt-picker-item:hover .qt-name{text-decoration:underline;text-underline-offset:3px}
.qt-picker-item .qt-check{width:18px;flex:none;color:var(--qt-stamp);visibility:hidden;display:inline-flex}
.qt-picker-item[aria-selected="true"] .qt-check{visibility:visible}
.qt-picker-item[aria-selected="true"] .qt-name{font-weight:700}
.qt-picker-item .qt-name{overflow:hidden;text-overflow:ellipsis;min-width:0}
.qt-picker-item .qt-id{margin-left:auto;font-family:var(--qt-mono);font-size:10px;color:var(--qt-ink-3);overflow:hidden;text-overflow:ellipsis;max-width:48%}
.qt-picker-empty{display:flex;align-items:center;font-size:12px;color:var(--qt-ink-3)}

/* 方向：牛皮纸标签（380×140 · -2°），和画板一样贴着面板右下角、露出一截被裁掉 */
.qt-tagwrap{position:absolute;right:0;bottom:0;z-index:6;pointer-events:none}
.qt-tagwrap .qt-tag{pointer-events:auto}
.qt-tag{position:relative;margin:0 -52px -22px 0;width:380px;height:140px;transform:rotate(-2deg);transform-origin:right bottom;padding:14px 22px;display:flex;flex-direction:column;gap:4px;color:#171717;
  background:var(--qt-grain),repeating-linear-gradient(90deg,rgba(0,0,0,.05) 0 1px,transparent 1px 4px),var(--qt-kraft);box-shadow:0 -10px 30px -12px rgba(0,0,0,.5)}
.qt-seg{display:flex;gap:14px;font-family:var(--qt-mono);font-size:11px}
.qt-seg button{opacity:.6;white-space:nowrap}
.qt-seg button:hover:not(:disabled){opacity:.85}
.qt-seg button[aria-pressed="true"]{opacity:1;font-weight:600}
.qt-seg button[aria-pressed="true"]::before{content:"[ "}.qt-seg button[aria-pressed="true"]::after{content:" ]"}
.qt-tag-big{font-family:var(--qt-zh-sans);font-weight:900;font-size:44px;letter-spacing:-.01em;line-height:1.15;white-space:nowrap}

/* 历史：热敏小票（画板坐标 右 34,-10 · 304×600 · 1.4°，整张连字一起倾斜） */
.qt-backdrop{position:absolute;inset:0;z-index:8}
.qt-history{right:34px;top:-10px;width:304px;height:600px;transform:rotate(1.4deg);z-index:9;display:flex;flex-direction:column;padding:26px 24px 22px;color:var(--qt-ink);filter:drop-shadow(0 26px 30px rgba(0,0,0,.5))}
.qt-history .qt-paper{background:var(--qt-grain),var(--qt-receipt);
  clip-path:polygon(0 1.2%,4% 0,8% 1.2%,12% 0,16% 1.2%,20% 0,24% 1.2%,28% 0,32% 1.2%,36% 0,40% 1.2%,44% 0,48% 1.2%,52% 0,56% 1.2%,60% 0,64% 1.2%,68% 0,72% 1.2%,76% 0,80% 1.2%,84% 0,88% 1.2%,92% 0,96% 1.2%,100% 0,100% 100%,96% 98.8%,92% 100%,88% 98.8%,84% 100%,80% 98.8%,76% 100%,72% 98.8%,68% 100%,64% 98.8%,60% 100%,56% 98.8%,52% 100%,48% 98.8%,44% 100%,40% 98.8%,36% 100%,32% 98.8%,28% 100%,24% 98.8%,20% 100%,16% 98.8%,12% 100%,8% 98.8%,4% 100%,0 98.8%)}
.qt-history-head{display:flex;justify-content:space-between;align-items:baseline;flex:none}
.qt-history-head b{font-family:var(--qt-grot);font-weight:900;font-size:20px;letter-spacing:-.03em}
.qt-history-head span{font-family:var(--qt-mono);font-size:11px}
.qt-history-search{display:flex;gap:8px;align-items:center;margin-top:12px;padding-bottom:6px;font-family:var(--qt-mono);font-size:11px;text-transform:uppercase;flex:none}
.qt-history-search input{flex:1;min-width:0;border:0;outline:0;background:none;font-family:var(--qt-zh-sans);font-size:12px;text-transform:none;color:var(--qt-ink)}
.qt-history-search input::placeholder{color:var(--qt-ink-3)}
.qt-perf{height:6px;margin:0 -24px;flex:none;background:radial-gradient(circle at 3px 3px,var(--qt-desk) 2.2px,transparent 2.6px) 0 0/9px 6px repeat-x}
.qt-history-scroll{flex:1;min-height:0;position:relative;margin-right:-10px}
.qt-history-list{position:absolute;inset:0;overflow-y:auto;padding:0 22px 8px 0;scrollbar-width:none}
.qt-history-list::-webkit-scrollbar{display:none}
.qt-ruler{position:absolute;right:0;top:34px;bottom:6px;width:8px;pointer-events:none;background:repeating-linear-gradient(to bottom,rgba(28,28,28,.35) 0 1px,transparent 1px 6px)}
.qt-ruler i{position:absolute;left:0;right:0;background:#1c1c1c}
.qt-hday{position:sticky;top:0;z-index:2;background:var(--qt-receipt);padding:10px 0 6px;font-family:var(--qt-mono);font-size:10.5px;color:#9a2d16;box-shadow:0 6px 6px -6px rgba(0,0,0,.22)}
.qt-hitem-wrap{position:relative}
.qt-hitem-wrap + .qt-hitem-wrap{border-top:1px dotted rgba(28,28,28,.3)}
.qt-hitem{display:block;text-align:left;padding:9px 8px 10px;margin:0 -8px;width:calc(100% + 16px);color:var(--qt-ink)}
.qt-hitem[aria-current="true"]{background:linear-gradient(transparent 8%,rgba(239,74,35,.2) 8%,rgba(239,74,35,.2) 92%,transparent 92%)}
.qt-hitem-meta{display:flex;gap:10px;font-family:var(--qt-mono);font-size:10.5px;text-transform:uppercase;letter-spacing:.02em;color:#55575e;white-space:nowrap;overflow:hidden;padding-right:20px}
.qt-hitem-meta .qt-model{overflow:hidden;text-overflow:ellipsis;min-width:0}
.qt-hitem-dst{margin-top:4px;font-size:13.5px;line-height:1.55;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word;white-space:pre-line}
.qt-hitem-dst[data-lang="zh"]{font-family:var(--qt-zh-serif)}
.qt-hitem-dst[data-lang="en"]{font-family:var(--qt-en-serif)}
.qt-hitem-src{margin-top:2px;font-size:11px;color:var(--qt-ink-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.qt-hitem-del{position:absolute;top:8px;right:0;width:20px;height:20px;font-family:var(--qt-mono);font-size:13px;color:var(--qt-ink-3);opacity:0;pointer-events:none}
.qt-hitem-wrap:hover .qt-hitem-del,.qt-hitem-del:focus-visible{opacity:1;pointer-events:auto}
.qt-hitem-del:hover{color:var(--qt-redpen)}
.qt-empty-sm{padding:28px 4px;font-family:var(--qt-mono);font-size:11px;color:var(--qt-ink-3);white-space:pre-line;line-height:1.7;text-align:center}
.qt-history-foot{display:flex;justify-content:space-between;align-items:center;padding-top:10px;flex:none;font-family:var(--qt-mono);font-size:11px}
.qt-history-foot .qt-link{font-size:11px;padding:0}
.qt-history-foot .qt-danger{color:var(--qt-redpen);opacity:1}
.qt-barcode{height:30px;margin-top:12px;flex:none;background:repeating-linear-gradient(90deg,#1c1c1c 0 1px,transparent 1px 3px,#1c1c1c 3px 6px,transparent 6px 8px,#1c1c1c 8px 9px,transparent 9px 13px)}

/* 没有模型 */
.qt-empty-card{position:relative;isolation:isolate;max-width:460px;margin:24px;padding:30px 34px 26px;color:var(--qt-ink);display:flex;flex-direction:column;align-items:flex-start;gap:16px;transform:rotate(-1deg)}
.qt-empty-card .qt-paper{background:var(--qt-grain),var(--qt-receipt);box-shadow:0 24px 40px -16px rgba(0,0,0,.5)}
.qt-empty-card b{font-family:var(--qt-grot);font-weight:900;font-size:22px;letter-spacing:-.03em}
.qt-empty-card p{margin:0;font-size:13px;line-height:1.7;white-space:pre-line}
.qt-empty-card .qt-go{position:relative;right:auto;bottom:auto}

/* 分享 */
.qt-share{position:absolute;inset:0;z-index:60;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:24px;background:rgba(10,10,10,.62);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);animation:qt-fade .2s ease}
@keyframes qt-fade{from{opacity:0}}
.qt-share-card{flex:1 1 0;min-height:0;width:100%;display:flex;align-items:center;justify-content:center}
.qt-share-card img{display:block;max-width:min(560px,100%);max-height:100%;width:auto;height:auto;object-fit:contain;box-shadow:0 30px 60px -20px rgba(0,0,0,.7);animation:qt-card .3s var(--qt-ease)}
.qt-share-wait{font-family:var(--qt-mono);font-size:12px;color:#e6e3dc}
.qt-share-bar{display:flex;align-items:center;gap:22px;flex-wrap:wrap;justify-content:center;color:#e6e3dc}
.qt-share-bar .qt-go,.qt-share-bar .qt-clear{position:relative;right:auto;bottom:auto;transform:none;font-size:20px;letter-spacing:.08em;padding:12px 26px}
.qt-share-bar .qt-go:hover:not(:disabled),.qt-share-bar .qt-clear:hover:not(:disabled){transform:translateY(-2px)}
.qt-share-bar .qt-hbtn{font-size:14px}
.qt-share-msg{font-family:var(--qt-mono);font-size:11px;opacity:.8;width:100%;text-align:center}

/* 窄面板：两张纸上下叠放，不缩放 */
.qt-board.is-narrow{align-items:flex-start;overflow-y:auto}
.qt-comp.is-narrow{width:100%;height:auto;padding:14px 16px 40px 20px;display:flex;flex-direction:column}
.qt-comp.is-narrow .qt-deco-date,.qt-comp.is-narrow .qt-deco-side,.qt-comp.is-narrow .qt-tape{display:none}
.qt-comp.is-narrow .qt-note{position:relative;left:auto;top:auto;width:auto;height:420px;transform:rotate(-.8deg)}
.qt-comp.is-narrow .qt-note-in{left:66px;right:22px;top:28px;bottom:28px}
.qt-comp.is-narrow .qt-note-foot{padding-right:0;flex-wrap:wrap;row-gap:8px}
.qt-comp.is-narrow .qt-actions{position:relative;right:auto;bottom:auto;margin-left:auto}
.qt-comp.is-narrow .qt-vellum{position:relative;left:auto;top:auto;width:auto;height:480px;margin-top:30px;transform:rotate(.6deg)}
.qt-comp.is-narrow .qt-vel-in{inset:30px 24px 26px}
.qt-comp.is-narrow .qt-swap{position:relative;left:auto;top:auto;align-self:flex-end;margin:-46px 26px -40px 0;width:132px;height:42px;flex-direction:row;transform:rotate(3deg);
}
.qt-comp.is-narrow .qt-swap b{writing-mode:horizontal-tb}
.qt-comp.is-narrow .qt-stamp{right:22px}
.qt-comp.is-narrow .qt-tag{position:relative;left:auto;top:auto;width:auto;height:auto;margin:18px -24px 0 30px;padding-bottom:22px}
.qt-comp.is-narrow .qt-history{position:absolute;right:6px;top:4px;width:min(304px,92%)}
.qt-title{-webkit-text-stroke:.5px currentColor}
.qt-go,.qt-clear,.qt-swap b,.qt-picker-head b,.qt-history-head b,.qt-empty-card b{-webkit-text-stroke:.6px currentColor}
.qt-tag-big,.qt-waiting b{-webkit-text-stroke:1.1px currentColor}
/* 纸本头部的风格切换：打字机字「风格: [ 纸本 ] / 色场」 */
.qt-skinsw{display:inline-flex;align-items:center;gap:10px;font-size:12px;margin-right:10px;white-space:nowrap}
.qt-skinsw-k{opacity:.55}
.qt-skinsw-sep{opacity:.4}
.qt-skinsw .qt-hbtn[aria-pressed="true"]{font-weight:600}
.qt-skinsw .qt-hbtn[aria-pressed="true"]::before{content:"[ "}.qt-skinsw .qt-hbtn[aria-pressed="true"]::after{content:" ]"}
.qt-skinsw .qt-hbtn[aria-pressed="false"]{opacity:.6}
.qt-skinsw .qt-hbtn[aria-pressed="false"]:hover{opacity:1}

/* ============ 色场（F）：画板 F 的 1200×696 工作区原样搭，再整体缩放（最多 1.3 倍）；颜色全部走 DSH 主题 token ============ */
.qt-root.qt-skin-field{
  --qt-f-base:#ffffff;--qt-f-l1:#f5f6f8;--qt-f-l2:#ebecf0;--qt-f-ov:#ffffff;
  --qt-f-b1:#e7e8ec;--qt-f-b2:#d6d7dd;--qt-f-brand:#4d6bfe;
  --qt-f-ink:#1d1d22;--qt-f-mute:#6c6c75;--qt-f-idle:#a7a7ae;
  --qt-f-err:#d14343;
  --qt-f-field:var(--qt-f-brand);--qt-f-on:#fff;--qt-f-on2:rgba(255,255,255,.86);--qt-f-on3:rgba(255,255,255,.16);--qt-f-wm:rgba(255,255,255,.08);
  --qt-f-ui:-apple-system,BlinkMacSystemFont,"PingFang SC","Helvetica Neue",var(--qt-zh-sans);
  --qt-f-mono:"SF Mono",Menlo,var(--qt-mono);
  background:var(--qt-f-base);color:var(--qt-f-ink);font-family:var(--qt-f-ui)}
.qt-root.qt-skin-field[data-tone="dark"]{--qt-f-base:#16171b;--qt-f-l1:#1f2025;--qt-f-l2:#2a2b31;--qt-f-ov:#24252b;--qt-f-b1:#2c2d33;--qt-f-b2:#3a3b42;
  --qt-f-ink:#ececef;--qt-f-mute:#9a9ba4;--qt-f-idle:#5e5f68;--qt-f-err:#f06b6b;
  --qt-f-field:#304298;--qt-f-on2:rgba(255,255,255,.84);--qt-f-on3:rgba(255,255,255,.14);--qt-f-wm:rgba(255,255,255,.07)}
.qt-ftone{display:flex;gap:2px;padding:3px;border-radius:11px;background:var(--qt-f-l2);flex:none}
.qt-ftone button{height:28px;padding:0 10px;border-radius:8px;font-size:12.5px;color:var(--qt-f-mute);white-space:nowrap;transition:background .15s,color .15s}
.qt-ftone button:hover{color:var(--qt-f-ink)}
.qt-ftone button[aria-pressed="true"]{background:var(--qt-f-base);color:var(--qt-f-ink);font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,.08),0 0 0 .5px rgba(0,0,0,.04)}
.qt-skin-field :focus-visible{outline:2px solid var(--qt-f-brand);outline-offset:2px}
/* 色场的蓝固定为 DeepSeek 蓝：作者实机里读 DSH 的 --dsw-alias-brand-primary 得到的是黑色，整块色场被画成了黑的 */
.qt-ffield :focus-visible{outline-color:#fff}

/* 头部 */
.qt-fhead{display:flex;align-items:center;gap:12px;flex:none;height:calc(64px + var(--dsh-frame-top-clearance,0px));padding:var(--dsh-frame-top-clearance,0px) 32px 0 calc(32px + var(--dsh-frame-leading-clearance,0px))}
.qt-ftitle{font-size:17px;font-weight:700;letter-spacing:-.01em;white-space:nowrap}
.qt-fsub{font-size:12px;color:var(--qt-f-mute);margin-right:auto;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.qt-ftrack{display:flex;gap:2px;padding:3px;border-radius:11px;background:var(--qt-f-l2);flex:none}
.qt-ftrack button{height:28px;padding:0 12px;border-radius:8px;font-size:12.5px;color:var(--qt-f-mute);display:inline-flex;align-items:center;gap:7px;white-space:nowrap;transition:background .15s,color .15s}
.qt-ftrack button:hover:not(:disabled){color:var(--qt-f-ink)}
.qt-ftrack button[aria-pressed="true"]{background:var(--qt-f-base);color:var(--qt-f-ink);font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,.08),0 0 0 .5px rgba(0,0,0,.04)}
.qt-ftrack button:disabled{opacity:.45}
.qt-fsw{width:10px;height:10px;border-radius:3px;flex:none}
.qt-fsw-paper{background:#eeede7;box-shadow:inset 0 0 0 1px rgba(0,0,0,.18),inset -4px 0 0 #b88f62}
.qt-fsw-field{background:var(--qt-f-brand)}
.qt-fhb{height:32px;padding:0 12px;border-radius:10px;display:inline-flex;align-items:center;gap:8px;font-size:13px;color:var(--qt-f-mute);white-space:nowrap;flex:none;transition:background .15s,color .15s}
.qt-fhb:hover:not(:disabled),.qt-fhb[aria-pressed="true"]{background:var(--qt-f-l2);color:var(--qt-f-ink)}
.qt-fhb:disabled{opacity:.5}
.qt-fcnt{min-width:20px;height:18px;padding:0 6px;border-radius:9px;background:var(--qt-f-l2);color:var(--qt-f-ink);font-size:11px;font-weight:600;display:inline-grid;place-items:center;font-variant-numeric:tabular-nums}
.qt-fhb[aria-pressed="true"] .qt-fcnt,.qt-fhb:hover .qt-fcnt{background:var(--qt-f-base)}

/* 工作区 */
.qt-fboard{flex:1;min-height:0;position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden}
.qt-fcomp{position:relative;width:1200px;height:696px;flex:none}
.qt-fbox{position:absolute;top:8px;height:664px;border-radius:28px;display:flex;flex-direction:column;min-width:0}
.qt-fsrc{left:24px;width:556px;padding:32px 36px 28px 40px;background:var(--qt-f-l1);box-shadow:inset 0 0 0 1px var(--qt-f-b1)}
.qt-ffield{left:596px;width:580px;padding:32px 36px 28px 48px;background:var(--qt-f-field);color:var(--qt-f-on);overflow:hidden}
.qt-frow{position:relative;display:flex;align-items:center;gap:12px;height:40px;flex:none;min-width:0}
.qt-flang{font-size:28px;line-height:1;white-space:nowrap;flex:none}
.qt-flang[data-lang="en"]{font-family:var(--qt-en-serif);font-style:italic}
.qt-flang[data-lang="zh"]{font-family:var(--qt-zh-serif);font-weight:600}
.qt-fhint{font-size:12.5px;color:var(--qt-f-mute);margin-right:auto;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.qt-fhint.is-locked{color:var(--qt-f-brand)}
.qt-ffield .qt-fhint{color:var(--qt-f-on2)}
.qt-fchip-warn{color:var(--qt-f-on);font-weight:600;padding:3px 8px;border-radius:8px;background:var(--qt-f-on3)}
.qt-fbody{position:relative;flex:1;min-height:0;display:flex;flex-direction:column}
.qt-fta{flex:1;min-height:0;width:100%;resize:none;border:0;outline:0;background:transparent;padding:0;margin:28px 0 0;color:inherit;scrollbar-width:thin;scrollbar-color:var(--qt-f-b2) transparent}
.qt-fta:focus-visible{outline:0}
.qt-fsrc .qt-fta{font-family:var(--qt-f-ui);font-size:18px;line-height:1.75}
.qt-fsrc .qt-fta::placeholder{color:var(--qt-f-idle)}
.qt-fsrc .qt-fta[readonly]{color:var(--qt-f-mute);cursor:default}
.qt-ffield .qt-fta{scrollbar-color:rgba(255,255,255,.35) transparent}
.qt-fres{font-family:var(--qt-zh-serif);font-size:25px;font-weight:600;line-height:1.8;letter-spacing:.02em}
.qt-fres[data-lang="en"]{font-family:var(--qt-en-serif);font-weight:500;line-height:1.6;letter-spacing:0}
.qt-fres::placeholder{color:transparent}
.qt-fwait{position:absolute;inset:28px 0 0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding-bottom:40px;text-align:center;pointer-events:none}
.qt-fwait b{font-family:var(--qt-zh-serif);font-size:44px;font-weight:600;letter-spacing:.08em;line-height:1.2}
.qt-fwait span{font-size:13px;color:var(--qt-f-on2)}
.qt-ffoot{position:relative;display:flex;align-items:center;gap:8px;height:48px;flex:none;min-width:0}
.qt-fcount{font-size:12.5px;color:var(--qt-f-mute);margin-right:auto;font-variant-numeric:tabular-nums;white-space:nowrap}
.qt-fclear{height:40px;padding:0 16px;border-radius:12px;font-size:13.5px;color:var(--qt-f-mute);white-space:nowrap}
.qt-fclear:hover:not(:disabled){background:var(--qt-f-l2);color:var(--qt-f-ink)}
.qt-fclear:disabled{opacity:.4}
.qt-fgo{height:44px;padding:0 8px 0 20px;border-radius:14px;background:var(--qt-f-ink);color:var(--qt-f-base);font-size:14.5px;font-weight:600;display:inline-flex;align-items:center;gap:12px;white-space:nowrap;flex:none;transition:transform .15s,opacity .15s}
.qt-fgo:hover:not(:disabled){transform:translateY(-1px)}
.qt-fgo:disabled{opacity:.32}
.qt-fgo kbd{font:inherit;font-size:11.5px;font-weight:500;height:26px;padding:0 8px;border-radius:8px;display:inline-grid;place-items:center;background:color-mix(in srgb,currentColor 16%,transparent)}
.qt-fgo.is-stop{background:var(--qt-f-base);color:var(--qt-f-ink);box-shadow:inset 0 0 0 1px var(--qt-f-b2)}
.qt-fgo.is-stop kbd{background:var(--qt-f-l2)}
.qt-fswap{position:absolute;left:562px;top:38px;z-index:5;width:52px;height:52px;border-radius:50%;background:var(--qt-f-base);color:var(--qt-f-ink);display:grid;place-items:center;box-shadow:0 0 0 6px var(--qt-f-base),0 8px 22px -6px rgba(0,0,0,.28);transition:transform .3s var(--qt-ease),opacity .15s}
.qt-fswap:hover:not(:disabled){transform:rotate(180deg)}
.qt-fswap:disabled{opacity:.45}
.qt-fcomp.is-hist .qt-fswap{visibility:hidden}
.qt-fwm{position:absolute;right:-44px;bottom:-132px;font-family:var(--qt-zh-serif);font-weight:600;font-size:480px;line-height:1;color:var(--qt-f-wm);pointer-events:none;user-select:none}
.qt-fwm[data-lang="en"]{font-family:var(--qt-en-serif);font-weight:500;right:-20px;bottom:-150px}
.qt-fstats{position:relative;display:flex;gap:20px;font-size:12px;color:var(--qt-f-on2);padding-bottom:14px;flex:none;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden}
.qt-fprog{position:absolute;left:0;right:0;top:0;height:3px;background:var(--qt-f-on3);overflow:hidden}
.qt-fprog::after{content:"";position:absolute;top:0;bottom:0;left:-36%;width:36%;border-radius:2px;background:rgba(255,255,255,.75);animation:qt-fprog 1.4s ease-in-out infinite}
@keyframes qt-fprog{from{left:-36%}to{left:100%}}
.qt-ferror{position:relative;margin:20px 0 0;padding:10px 10px 10px 16px;border-radius:14px;background:var(--qt-f-on3);display:flex;gap:12px;align-items:center;font-size:13px;line-height:1.55;flex:none}
.qt-ferror .qt-error-text{flex:1;min-width:0;word-break:break-word}
.qt-ferror button,.qt-fcopy{height:40px;padding:0 18px;border-radius:12px;background:#fff;color:color-mix(in srgb,var(--qt-f-field) 82%,#000);font-size:13.5px;font-weight:600;white-space:nowrap;flex:none}
.qt-ferror button{height:32px;padding:0 14px;border-radius:10px}
.qt-fcopy.is-warn{color:var(--qt-f-err)}
.qt-fcopy:disabled,.qt-flink:disabled{opacity:.4}
.qt-flink{height:40px;padding:0 14px;border-radius:12px;font-size:13.5px;color:var(--qt-f-on);white-space:nowrap;flex:none}
.qt-flink:hover:not(:disabled){background:var(--qt-f-on3)}

/* 色场的模型选择：白字按钮 + 往上弹的圆角菜单 */
.qt-fpick{position:relative;min-width:0;flex:0 1 auto}
.qt-fpick-btn{height:40px;padding:0 14px;border-radius:12px;background:var(--qt-f-on3);color:var(--qt-f-on);display:inline-flex;align-items:center;gap:8px;font-size:13.5px;white-space:nowrap;max-width:100%;transition:background .15s}
.qt-fpick-btn:hover:not(:disabled),.qt-fpick-btn[aria-expanded="true"]{background:rgba(255,255,255,.28)}
.qt-fpick-btn:disabled{opacity:.5}
.qt-fpick-k,.qt-fpick-tag{color:var(--qt-f-on2);flex:none}
.qt-fpick-label{font-weight:600;overflow:hidden;text-overflow:ellipsis;min-width:0}
.qt-fpick-btn svg{flex:none;transition:transform .2s var(--qt-ease)}
.qt-fpick-btn[aria-expanded="true"] svg{transform:rotate(180deg)}
.qt-fmenu{position:absolute;left:0;bottom:calc(100% + 10px);z-index:30;width:336px;max-height:420px;overflow:auto;padding:16px 8px 8px;background:var(--qt-f-ov);color:var(--qt-f-ink);border:1px solid var(--qt-f-b1);border-radius:20px;box-shadow:0 24px 60px -16px rgba(0,0,0,.28),0 2px 8px rgba(0,0,0,.06);animation:qt-fade .15s ease}
.qt-fmenu-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:0 12px 8px}
.qt-fmenu-head b{font-size:15px;font-weight:600}
.qt-fmenu-head span{font-size:12px;color:var(--qt-f-mute)}
.qt-fmi{display:flex;align-items:center;gap:10px;width:100%;height:40px;padding:0 12px;border-radius:10px;font-size:13.5px;text-align:left;white-space:nowrap;color:var(--qt-f-ink)}
.qt-fmi:hover{background:var(--qt-f-l1)}
.qt-fmi[aria-selected="true"]{background:var(--qt-f-l2);font-weight:600}
.qt-fmi .qt-check{width:16px;flex:none;color:var(--qt-f-brand);visibility:hidden;display:inline-flex}
.qt-fmi[aria-selected="true"] .qt-check{visibility:visible}
.qt-fmi .qt-name{overflow:hidden;text-overflow:ellipsis;min-width:0}
.qt-fmi .qt-id{margin-left:auto;font-family:var(--qt-f-mono);font-size:11px;font-weight:400;color:var(--qt-f-mute);overflow:hidden;text-overflow:ellipsis;max-width:46%}
.qt-fmg{padding:12px 12px 4px;font-size:11.5px;font-weight:600;color:var(--qt-f-mute)}
.qt-fmenu-empty{padding:10px 12px;font-size:12.5px;color:var(--qt-f-mute)}

/* 色场的历史：一张和译文容器同样大的卡，盖在译文的位置上；头尾固定，中间单独滚动 */
.qt-fhist{position:absolute;left:596px;top:8px;width:580px;height:664px;border-radius:28px;background:var(--qt-f-ov);color:var(--qt-f-ink);box-shadow:inset 0 0 0 1px var(--qt-f-b1),0 24px 60px -24px rgba(0,0,0,.22);display:flex;flex-direction:column;overflow:hidden;z-index:6;animation:qt-fade .18s ease}
.qt-fhist-head{display:flex;align-items:center;gap:12px;height:68px;padding:28px 28px 0 36px;flex:none;min-width:0}
.qt-fhist-head b{font-size:20px;font-weight:600;white-space:nowrap}
.qt-fhist-head > span{font-size:12.5px;color:var(--qt-f-mute);margin-right:auto;white-space:nowrap}
.qt-fhist-search{width:240px;min-width:0;height:36px;border-radius:10px;background:var(--qt-f-l1);box-shadow:inset 0 0 0 1px var(--qt-f-b1);display:flex;align-items:center;gap:8px;padding:0 12px;color:var(--qt-f-mute)}
.qt-fhist-search svg{flex:none}
.qt-fhist-search input{flex:1;min-width:0;border:0;outline:0;background:none;font-size:13px;color:var(--qt-f-ink)}
.qt-fhist-search input::placeholder{color:var(--qt-f-mute)}
.qt-fhist-search:focus-within{box-shadow:inset 0 0 0 1.5px var(--qt-f-brand)}
.qt-ficon{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;color:var(--qt-f-mute);flex:none}
.qt-ficon:hover{background:var(--qt-f-l2);color:var(--qt-f-ink)}
.qt-fhist-rule{height:1px;background:var(--qt-f-b1);margin-top:20px;flex:none}
.qt-fhist-scroll{flex:1;min-height:0;position:relative}
.qt-fhist-list{position:absolute;inset:0;overflow-y:auto;padding:0 24px 24px 20px;scrollbar-width:none}
.qt-fhist-list::-webkit-scrollbar{display:none}
.qt-fhday{position:sticky;top:0;z-index:2;background:var(--qt-f-ov);padding:16px 12px 6px;font-size:12px;font-weight:600;color:var(--qt-f-mute)}
.qt-fhi-wrap{position:relative;margin-bottom:2px}
.qt-fhi{display:grid;grid-template-columns:44px minmax(0,1fr) 112px;column-gap:14px;align-items:start;width:100%;text-align:left;padding:14px 14px 14px 12px;border-radius:14px;color:var(--qt-f-ink);transition:background .12s}
.qt-fhi-wrap:hover .qt-fhi{background:var(--qt-f-l2)}
.qt-fhi[aria-current="true"],.qt-fhi-wrap:hover .qt-fhi[aria-current="true"]{background:color-mix(in srgb,var(--qt-f-brand) 10%,transparent)}
.qt-fhi-time{font-size:12px;color:var(--qt-f-mute);padding-top:3px;font-variant-numeric:tabular-nums}
.qt-fhi-main{display:flex;flex-direction:column;gap:4px;min-width:0}
.qt-fhi-dst{font-family:var(--qt-zh-serif);font-size:15px;line-height:1.55;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word;white-space:pre-line}
.qt-fhi-dst[data-lang="en"]{font-family:var(--qt-en-serif)}
.qt-fhi-src{font-size:12.5px;color:var(--qt-f-mute);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.qt-fhi-meta{display:flex;flex-direction:column;align-items:flex-end;gap:3px;font-size:11.5px;color:var(--qt-f-mute);padding-top:3px;white-space:nowrap;overflow:hidden;min-width:0}
.qt-fhi-meta span{max-width:100%;overflow:hidden;text-overflow:ellipsis}
.qt-fhi-wrap:hover .qt-fhi-meta{visibility:hidden}
.qt-fhi-del{position:absolute;right:12px;top:14px;width:26px;height:26px;border-radius:8px;display:grid;place-items:center;color:var(--qt-f-mute);background:var(--qt-f-base);opacity:0;pointer-events:none}
.qt-fhi-wrap:hover .qt-fhi-del,.qt-fhi-del:focus-visible{opacity:1;pointer-events:auto}
.qt-fhi-del:hover{color:var(--qt-f-err)}
.qt-fempty{padding:56px 12px;text-align:center;font-size:13px;line-height:1.8;color:var(--qt-f-mute);white-space:pre-line}
.qt-ffade-top,.qt-ffade-bot{position:absolute;left:0;right:0;pointer-events:none;z-index:3}
.qt-ffade-top{top:38px;height:36px;background:linear-gradient(var(--qt-f-ov),transparent)}
.qt-ffade-bot{bottom:0;height:64px;background:linear-gradient(transparent,var(--qt-f-ov))}
.qt-fthumb{position:absolute;right:8px;top:10px;bottom:10px;width:4px;pointer-events:none;z-index:4}
.qt-fthumb i{position:absolute;left:0;right:0;border-radius:2px;background:var(--qt-f-b2)}
.qt-fhist-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;height:65px;padding:0 28px 4px 26px;border-top:1px solid var(--qt-f-b1);flex:none;font-size:12px;color:var(--qt-f-mute);white-space:nowrap}
.qt-fhist-foot > span{overflow:hidden;text-overflow:ellipsis;min-width:0}
.qt-fhist-clear{height:34px;padding:0 10px;border-radius:9px;font-size:13px;color:var(--qt-f-mute);flex:none}
.qt-fhist-clear:hover{background:var(--qt-f-l2);color:var(--qt-f-ink)}
.qt-fhist-clear.is-armed{color:var(--qt-f-err)}

/* 色场：没有模型 */
.qt-fempty-card{max-width:440px;margin:24px;padding:32px 36px;border-radius:28px;background:var(--qt-f-l1);box-shadow:inset 0 0 0 1px var(--qt-f-b1);display:flex;flex-direction:column;align-items:flex-start;gap:14px}
.qt-fempty-card b{font-size:18px;font-weight:600}
.qt-fempty-card p{margin:0;font-size:13.5px;line-height:1.7;color:var(--qt-f-mute);white-space:pre-line}
.qt-fempty-card .qt-fgo{padding:0 20px}

/* 分享浮层在色场下的按钮 */
.qt-fsbtn{height:44px;padding:0 22px;border-radius:14px;font-size:14.5px;font-weight:600;white-space:nowrap}
.qt-fsbtn-primary{background:var(--qt-f-brand);color:#fff}
.qt-fsbtn-secondary{background:#fff;color:#1d1d22}
.qt-fsbtn:disabled{opacity:.45}
.qt-share-bar .qt-fhb{color:#e6e3dc}
.qt-share-bar .qt-fhb:hover{background:rgba(255,255,255,.12);color:#fff}

/* 色场窄面板（< 760）：上下叠放、不缩放，尺寸照画板「F 色场 · 窄面板 440」 */
.qt-fhead.is-narrow{height:auto;min-height:calc(56px + var(--dsh-frame-top-clearance,0px));flex-wrap:wrap;row-gap:8px;gap:6px;padding-top:calc(10px + var(--dsh-frame-top-clearance,0px));padding-bottom:8px;padding-right:12px;padding-left:calc(16px + var(--dsh-frame-leading-clearance,0px))}
.qt-fhead.is-narrow .qt-ftone{order:5}
.qt-fhead.is-narrow .qt-ftone button{padding:0 9px}
.qt-fhead.is-narrow .qt-ftitle{font-size:15px;margin-right:auto}
.qt-fhead.is-narrow .qt-fsub{display:none}
.qt-fhead.is-narrow .qt-ftrack button{padding:0 10px;gap:6px}
.qt-fhead.is-narrow .qt-fhb{padding:0 10px;gap:6px}
.qt-fboard.is-narrow{align-items:flex-start;overflow-y:auto}
.qt-fcomp.is-narrow{width:100%;height:auto;padding:0 16px 16px;display:flex;flex-direction:column}
.qt-fcomp.is-narrow .qt-fbox,.qt-fcomp.is-narrow .qt-fhist{position:relative;left:auto;top:auto;width:auto;flex:none;border-radius:24px}
.qt-fcomp.is-narrow .qt-fsrc{height:360px;padding:22px 22px 18px 24px}
.qt-fcomp.is-narrow .qt-ffield{height:452px;padding:30px 22px 18px 24px}
.qt-fcomp.is-narrow .qt-fhist{height:452px}
.qt-fcomp.is-narrow .qt-frow{height:34px;gap:10px}
.qt-fcomp.is-narrow .qt-flang{font-size:24px}
.qt-fcomp.is-narrow .qt-fsrc .qt-fhint{display:none}
.qt-fcomp.is-narrow .qt-fsrc .qt-frow .qt-ftrack{margin-left:auto}
.qt-fcomp.is-narrow .qt-ftrack button{padding:0 10px}
.qt-fcomp.is-narrow .qt-fta{margin-top:18px}
.qt-fcomp.is-narrow .qt-fsrc .qt-fta{font-size:16px;line-height:1.7}
.qt-fcomp.is-narrow .qt-fres{font-size:21px}
.qt-fcomp.is-narrow .qt-fwait{inset:18px 0 0}
.qt-fcomp.is-narrow .qt-fwait b{font-size:36px}
.qt-fcomp.is-narrow .qt-fwm{font-size:340px;right:-40px;bottom:-96px}
.qt-fcomp.is-narrow .qt-fstats{gap:14px;padding-bottom:10px}
.qt-fcomp.is-narrow .qt-ffoot{height:44px;gap:4px}
.qt-fcomp.is-narrow .qt-fclear{padding:0 14px}
.qt-fcomp.is-narrow .qt-fgo{padding-left:18px;gap:10px}
.qt-fcomp.is-narrow .qt-fpick-btn{padding:0 12px;gap:6px;font-size:13px}
.qt-fcomp.is-narrow .qt-fpick-k{display:none}
.qt-fcomp.is-narrow .qt-flink{padding:0 10px;font-size:13px}
.qt-fcomp.is-narrow .qt-fcopy{padding:0 16px;font-size:13px}
.qt-fcomp.is-narrow .qt-fswap{position:relative;left:auto;top:auto;align-self:center;margin:-16px 0;width:48px;height:48px;flex:none}
.qt-fcomp.is-narrow .qt-fswap svg{transform:rotate(90deg)}
.qt-fcomp.is-narrow .qt-fmenu{width:min(336px,calc(100vw - 72px))}
.qt-fcomp.is-narrow .qt-fhist-head{height:58px;padding:22px 16px 0 20px;gap:8px}
.qt-fcomp.is-narrow .qt-fhist-head > span{display:none}
.qt-fcomp.is-narrow .qt-fhist-search{flex:1;width:auto}
.qt-fcomp.is-narrow .qt-fhist-rule{margin-top:14px}
.qt-fcomp.is-narrow .qt-fhist-list{padding:0 16px 20px 10px}
.qt-fcomp.is-narrow .qt-fhi{grid-template-columns:40px minmax(0,1fr);column-gap:10px}
.qt-fcomp.is-narrow .qt-fhi-meta{display:none}
.qt-fcomp.is-narrow .qt-fhist-foot{height:56px;padding:0 20px 2px 14px}
@media (prefers-reduced-motion:reduce){.qt-root *,.qt-root *::before,.qt-root *::after{animation:none!important;transition:none!important}}
`

    function ensureStyle() {
      const tagId = 'dsh-quick-translate/style.css'
      let tag = document.querySelector(`style[data-plugin-css="${tagId}"]`)
      if (!tag) {
        tag = document.createElement('style')
        tag.dataset.plugin = 'dsh-quick-translate'
        tag.dataset.pluginCss = tagId
        tag.textContent = CSS
        document.head.appendChild(tag)
      }
      return tag
    }

    /* ============================== 工具 ================================ */

    function readJson(key, fallback) {
      try {
        const raw = localStorage.getItem(key)
        const value = raw ? JSON.parse(raw) : fallback
        return value === undefined || value === null ? fallback : value
      } catch {
        return fallback
      }
    }

    function writeJson(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value))
      } catch {
        /* 隐私模式或配额满：忽略，不影响使用 */
      }
    }

    function modelKey(entry) {
      return `${entry.provider}${SEP}${entry.model}`
    }

    function parseKey(key) {
      if (typeof key !== 'string') return null
      const i = key.indexOf(SEP)
      return i < 0 ? null : { provider: key.slice(0, i), model: key.slice(i + 1) }
    }

    // 自动模式：汉字够多就译成英文，否则译成中文（英文句里夹几个中文词名仍译成中文）。只看前 2000 个字符
    function resolveTarget(direction, text) {
      if (direction === 'en2zh') return 'zh'
      if (direction === 'zh2en') return 'en'
      let han = 0
      let latin = 0
      let seen = 0
      for (const ch of text) {
        if (++seen > 2000) break
        if (/\p{Script=Han}/u.test(ch)) han++
        else if (/\p{Script=Latin}/u.test(ch)) latin++
      }
      return han >= 1 && han >= latin / 3 ? 'en' : 'zh'
    }

    async function fetchModels(refresh) {
      const url = new URL(`${API}/models${refresh ? '?refresh=1' : ''}`, document.baseURI)
      const response = await fetch(url, { credentials: 'same-origin' })
      let payload = null
      try {
        payload = await response.json()
      } catch {
        payload = null
      }
      if (!response.ok || !payload || payload.ok === false) {
        throw new Error((payload && (payload.message || payload.error)) || `HTTP ${response.status}`)
      }
      return payload
    }

    // 读 Host 的 SSE 流：meta → delta* → done | error
    async function streamTranslate({ text, target, provider, model, onMeta, onDelta, signal }) {
      const response = await fetch(new URL(`${API}/translate`, document.baseURI), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, target, provider, model }),
        signal,
      })
      if (!response.ok || !response.body) {
        let payload = null
        try {
          payload = await response.json()
        } catch {
          payload = null
        }
        throw new Error((payload && (payload.message || payload.error)) || `HTTP ${response.status}`)
      }
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let done = null
      const handleBlock = (block) => {
        for (const line of block.split('\n')) {
          if (!line.startsWith('data:')) continue
          let event
          try {
            event = JSON.parse(line.slice(5).trim())
          } catch {
            continue
          }
          if (event.type === 'meta') onMeta?.(event)
          else if (event.type === 'delta') onDelta?.(String(event.text || ''))
          else if (event.type === 'error') {
            const error = new Error(event.message || 'unknown')
            error.cancelled = Boolean(event.cancelled)
            throw error
          } else if (event.type === 'done') done = event
        }
      }
      for (;;) {
        const { value, done: finished } = await reader.read()
        if (finished) break
        buffer += decoder.decode(value, { stream: true })
        let idx
        while ((idx = buffer.indexOf('\n\n')) >= 0) {
          const block = buffer.slice(0, idx)
          buffer = buffer.slice(idx + 2)
          handleBlock(block)
        }
      }
      buffer += decoder.decode()
      if (buffer.trim()) handleBlock(buffer)
      if (!done) throw new Error('__stream_broken__')
      return done
    }

    // 耗时文案；不足 1 秒显示毫秒
    function fmtElapsed(ms, t) {
      if (!ms || !(ms > 0)) return `0 ${t.seconds}`
      return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} ${t.seconds}`
    }

    // 相对时间
    function relTime(ts, t) {
      const diff = Date.now() - Number(ts || 0)
      const m = Math.floor(diff / 60000)
      if (m < 1) return t.justNow
      if (m < 60) return t.minutesAgo(m)
      const hrs = Math.floor(m / 60)
      if (hrs < 24) return t.hoursAgo(hrs)
      const d = new Date(ts)
      const now = new Date()
      const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
      if (Math.round((day(now) - day(d)) / 86400000) === 1) return t.yesterday
      return `${d.getMonth() + 1}/${d.getDate()}`
    }

    // 历史只保留结构完整的条目，并限制条数和总体积
    function sanitizeHistory(list) {
      if (!Array.isArray(list)) return []
      const out = []
      let total = 0
      for (const e of list) {
        if (!e || typeof e.source !== 'string' || typeof e.result !== 'string') continue
        total += e.source.length + e.result.length
        if (out.length >= HISTORY_MAX || total > HISTORY_MAX_CHARS) break
        out.push({
          id: typeof e.id === 'string' ? e.id : `${Number(e.at) || Date.now()}-${out.length}`,
          source: e.source,
          result: e.result,
          target: e.target === 'en' ? 'en' : 'zh',
          provider: String(e.provider || ''),
          model: String(e.model || ''),
          modelName: String(e.modelName || e.model || ''),
          at: Number(e.at) || Date.now(),
          elapsedMs: Number(e.elapsedMs) || 0,
          truncated: Boolean(e.truncated),
        })
      }
      return out
    }

    // 新条目放最前；最新一条若原文、目标语言、模型都相同，就替换而不是再堆一条
    function pushHistory(list, entry) {
      const rest = list.filter((e, i) => !(i === 0 && e.source === entry.source && e.target === entry.target && e.model === entry.model))
      return sanitizeHistory([entry, ...rest])
    }

    function groupModels(list) {
      const map = new Map()
      for (const m of list) {
        const key = m.provider
        if (!map.has(key)) map.set(key, { provider: key, name: m.providerName || key, models: [] })
        map.get(key).models.push(m)
      }
      return [...map.values()]
    }

    /* ============================== 图形 ================================ */

    const svgProps = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
    const P = (...d) => d.map((dd) => h('path', { d: dd }))

    // 侧栏图标：DSH 侧栏里和其它插件并排，保持 Lucide 线条风格
    function TranslateIcon({ size = 18 }) {
      return h('svg', { ...svgProps, width: size, height: size, viewBox: '0 0 24 24' }, ...P('m5 8 6 6', 'm4 14 6-6 2-3', 'M2 5h12', 'M7 2h1', 'm22 22-5-10-5 10', 'M14 18h6'))
    }
    // 索引卡上的手写勾
    function TickMark() {
      return h('svg', { viewBox: '0 0 24 24', width: 18, height: 18, 'aria-hidden': true }, h('path', { d: 'M3 13c3 1 5 4 6 6 3-7 7-12 13-16', fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round' }))
    }
    // 模型名旁的手写签名（装饰）
    function Signature() {
      return h('svg', { className: 'qt-sign', viewBox: '0 0 120 40', 'aria-hidden': true }, h('path', { d: 'M4 30c10-2 14-22 22-20s-8 22 2 20 10-18 18-16-4 14 4 13 12-12 20-11 2 9 10 8 18-14 34-18', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' }))
    }
    // 完成时盖的「已译」章
    function Stamp({ label, arrow }) {
      return h(
        'svg',
        { className: 'qt-stamp', viewBox: '0 0 140 140', 'aria-hidden': true },
        h('defs', null, h('path', { id: 'qt-stamp-ring', d: 'M70 70 m-52 0 a52 52 0 1 1 104 0 a52 52 0 1 1 -104 0' })),
        h('circle', { cx: 70, cy: 70, r: 66, fill: 'none', stroke: 'currentColor', strokeWidth: 3, strokeDasharray: '60 2 30 3 90 1' }),
        h('circle', { cx: 70, cy: 70, r: 40, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5 }),
        h('text', { fontFamily: 'IBM Plex Mono, ui-monospace, monospace', fontSize: 11, letterSpacing: 3, fill: 'currentColor' }, h('textPath', { href: '#qt-stamp-ring' }, `TRANSLATED ✦ DSH ✦ ${arrow} ✦ QUICK ✦`)),
        h('text', { x: 70, y: 80, textAnchor: 'middle', fontFamily: 'PingFang SC, Noto Sans SC, sans-serif', fontWeight: 900, fontSize: label.length > 2 ? 22 : 28, fill: 'currentColor' }, label),
      )
    }

    // 色场风格用的几枚线条图标（纸本风格不用）
    const icon = (size, ...d) => h('svg', { ...svgProps, width: size, height: size, viewBox: '0 0 24 24', strokeWidth: 2 }, ...P(...d))
    const SwapIcon = () => icon(18, 'm16 3 4 4-4 4', 'M20 7H4', 'm8 21-4-4 4-4', 'M4 17h16')
    const RefreshIcon = () => icon(15, 'M21 12a9 9 0 1 1-3-6.7L21 8', 'M21 3v5h-5')
    const SearchIcon = () => h('svg', { ...svgProps, width: 14, height: 14, viewBox: '0 0 24 24', strokeWidth: 2 }, h('circle', { cx: 11, cy: 11, r: 7 }), h('path', { d: 'm20 20-3.5-3.5' }))
    const CloseIcon = ({ size = 14 }) => h('svg', { ...svgProps, width: size, height: size, viewBox: '0 0 24 24', strokeWidth: 2.3 }, h('path', { d: 'M6 6l12 12M18 6 6 18' }))
    const CheckIcon = () => h('svg', { ...svgProps, width: 16, height: 16, viewBox: '0 0 24 24', strokeWidth: 2.6 }, h('path', { d: 'm5 12.5 4.5 4.5L19 7' }))
    const ChevronIcon = () => h('svg', { ...svgProps, width: 12, height: 12, viewBox: '0 0 24 24', strokeWidth: 2.4 }, h('path', { d: 'm6 9 6 6 6-6' }))
    // 语言在色场里用它自己的名字写：English / 中文
    const nativeName = (code) => (code === 'en' ? 'English' : '中文')

    const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
    const pad2 = (n) => String(n).padStart(2, '0')
    const fmtClock = (ts) => { const d = new Date(ts); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}` }
    // 历史小票的日期分组：今天 / 昨天 / 11 月 21 日
    function dayLabel(ts, t, lang) {
      const d = new Date(ts)
      const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
      const diff = Math.round((day(new Date()) - day(d)) / 86400000)
      if (diff <= 0) return t.today
      if (diff === 1) return t.yesterday
      return lang === 'zh' ? `${d.getMonth() + 1} 月 ${d.getDate()} 日` : `${MONTHS[d.getMonth()]} ${d.getDate()}`
    }
    const arrowOf = (target) => (target === 'zh' ? 'EN >>> ZH' : target === 'en' ? 'ZH >>> EN' : '— >>> —')

    /* ============================== 分享卡片 ============================== */

    // 用 canvas 把这次翻译画成一张竖版拼贴卡：深色桌面、方格本（原文）、硫酸纸（译文）、美纹纸胶带、「已译」章、条码
    const SHARE_FONTS = {
      mono: '"IBM Plex Mono", "SF Mono", Menlo, monospace',
      grot: '"Inter Tight", "Helvetica Neue", Helvetica, Arial, sans-serif',
      zhSerif: '"Songti SC", "Noto Serif SC", "Source Han Serif SC", serif',
      zhSans: '"PingFang SC", "Noto Sans SC", sans-serif',
      enSerif: '"Iowan Old Style", "Newsreader", Palatino, Georgia, serif',
    }
    const CJK_RE = /[⺀-鿿豈-﫿＀-￯　-〿]/

    // 按宽度断行：中文逐字断，英文按词断；超过 maxLines 截断并补省略号
    function wrapLines(ctx, text, maxWidth, maxLines) {
      const out = []
      const paras = String(text || '').replace(/\r/g, '').split('\n')
      paras.forEach((para, pi) => {
        if (!para.trim()) {
          if (out.length && pi < paras.length - 1 && out[out.length - 1] !== '') out.push('')
          return
        }
        const tokens = para.match(new RegExp(`${CJK_RE.source}|[^\\s\\u2E80-\\u9FFF\\uF900-\\uFAFF\\uFF00-\\uFFEF\\u3000-\\u303F]+|\\s+`, 'g')) || []
        let line = ''
        for (const tok of tokens) {
          if (!line && /^\s+$/.test(tok)) continue
          if (ctx.measureText(line + tok).width <= maxWidth) {
            line += tok
            continue
          }
          if (line) out.push(line.trimEnd())
          line = ''
          if (/^\s+$/.test(tok)) continue
          let rest = tok
          while (ctx.measureText(rest).width > maxWidth && rest.length > 1) {
            let i = rest.length
            while (i > 1 && ctx.measureText(rest.slice(0, i)).width > maxWidth) i--
            out.push(rest.slice(0, i))
            rest = rest.slice(i)
          }
          line = rest
        }
        if (line) out.push(line.trimEnd())
      })
      while (out.length && out[out.length - 1] === '') out.pop()
      if (out.length <= maxLines) return { lines: out, truncated: false }
      const cut = out.slice(0, maxLines)
      let last = cut[maxLines - 1]
      while (last && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1)
      cut[maxLines - 1] = `${last}…`
      return { lines: cut, truncated: true }
    }

    function grainPattern(ctx, alpha) {
      const c = document.createElement('canvas')
      c.width = 180
      c.height = 180
      const g = c.getContext('2d')
      const img = g.createImageData(180, 180)
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() * 255
        img.data[i] = v
        img.data[i + 1] = v
        img.data[i + 2] = v
        img.data[i + 3] = Math.random() * alpha
      }
      g.putImageData(img, 0, 0)
      return ctx.createPattern(c, 'repeat')
    }

    async function renderShareCard({ source, result, target, modelName, elapsedMs, t }) {
      try {
        await document.fonts?.ready
      } catch {
        /* 字体没就绪就用回退字体画 */
      }
      const F = SHARE_FONTS
      const W = 1080
      const S = 2
      const toZh = target !== 'en'
      const measure = document.createElement('canvas').getContext('2d')

      // ---- 排版 ----
      const padX = 84
      const noteX = padX
      const noteW = W - padX * 2
      const noteY = 196
      const srcFont = `400 25px ${F.mono}`
      measure.font = srcFont
      const src = wrapLines(measure, source, noteW - 128 - 56, 7)
      const srcLH = 42
      const noteH = 52 + 24 + 34 + src.lines.length * srcLH + 64

      const velX = padX + 34
      const velW = noteW - 34
      const velY = noteY + noteH - 26
      let size = 46
      let dst = null
      for (; size >= 30; size -= 4) {
        measure.font = toZh ? `600 ${size}px ${F.zhSerif}` : `500 ${size}px ${F.enSerif}`
        dst = wrapLines(measure, result, velW - 116, 12)
        if (!dst.truncated && dst.lines.length <= 8) break
      }
      size = Math.max(size, 30)
      const dstFont = toZh ? `600 ${size}px ${F.zhSerif}` : `500 ${size}px ${F.enSerif}`
      const dstLH = Math.round(size * (toZh ? 1.72 : 1.5))
      const velH = 58 + 24 + 40 + dst.lines.length * dstLH + 36 + 34 + 56 + 34 + 60
      const H = Math.max(1180, velY + velH + 150)

      const canvas = document.createElement('canvas')
      canvas.width = W * S
      canvas.height = H * S
      const ctx = canvas.getContext('2d')
      ctx.scale(S, S)
      ctx.textBaseline = 'alphabetic'
      const shadow = (blur, y, a) => {
        ctx.shadowColor = `rgba(0,0,0,${a})`
        ctx.shadowBlur = blur
        ctx.shadowOffsetY = y
      }
      const noShadow = () => {
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        ctx.shadowOffsetY = 0
      }
      const tilt = (x, y, w, h, a) => {
        ctx.translate(x + w / 2, y + h / 2)
        ctx.rotate(a)
        ctx.translate(-(x + w / 2), -(y + h / 2))
      }
      const dots = (x1, x2, y, color) => {
        ctx.fillStyle = color
        for (let x = x1; x < x2; x += 9) {
          ctx.beginPath()
          ctx.arc(x, y, 1.3, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      const tape = (x, y, w, a) => {
        ctx.save()
        tilt(x, y, w, 34, a)
        ctx.beginPath()
        ctx.moveTo(x, y + 3)
        for (let i = 0; i <= 6; i++) ctx.lineTo(x + i * 3, y + (i % 2 ? 0 : 4))
        ctx.lineTo(x + w, y)
        for (let i = 0; i <= 6; i++) ctx.lineTo(x + w - (i % 2 ? 3 : 0), y + i * 5.6)
        ctx.lineTo(x, y + 34)
        for (let i = 6; i >= 0; i--) ctx.lineTo(x + (i % 2 ? 3 : 0), y + i * 5.6)
        ctx.closePath()
        shadow(4, 2, 0.18)
        ctx.fillStyle = 'rgba(232,220,186,0.9)'
        ctx.fill()
        noShadow()
        ctx.restore()
      }

      // ---- 桌面 ----
      ctx.fillStyle = '#1c1b1a'
      ctx.fillRect(0, 0, W, H)
      const vg = ctx.createRadialGradient(W * 0.45, H * 0.38, W * 0.15, W * 0.5, H * 0.5, W)
      vg.addColorStop(0, 'rgba(255,255,255,0.05)')
      vg.addColorStop(1, 'rgba(0,0,0,0.5)')
      ctx.fillStyle = vg
      ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = '#e8e5de'
      ctx.font = `900 54px ${F.grot}`
      ctx.fillText('Quick Translate', padX, 116)
      ctx.strokeStyle = '#e8e5de'
      ctx.lineWidth = 1.2
      ctx.strokeText('Quick Translate', padX, 116)
      ctx.font = `500 19px ${F.mono}`
      ctx.fillStyle = 'rgba(232,229,222,0.5)'
      ctx.fillText(`[ ${t.title} ]  DEEPSEEK HARNESS PLUGIN  ·  BY ${AUTHOR.toUpperCase()}`, padX, 152)
      ctx.textAlign = 'right'
      ctx.font = `600 22px ${F.mono}`
      ctx.fillStyle = 'rgba(232,229,222,0.8)'
      ctx.fillText(arrowOf(target), W - padX, 116)
      ctx.textAlign = 'left'

      // ---- 原文：方格本 ----
      ctx.save()
      tilt(noteX, noteY, noteW, noteH, -0.009)
      const torn = () => {
        ctx.beginPath()
        ctx.moveTo(noteX, noteY)
        ctx.lineTo(noteX + noteW, noteY)
        ctx.lineTo(noteX + noteW, noteY + noteH - 12)
        const n = 24
        for (let i = n; i >= 0; i--) ctx.lineTo(noteX + (noteW * i) / n, noteY + noteH - (i % 2 ? 3 : 13) - ((i * 7) % 5))
        ctx.closePath()
      }
      shadow(40, 22, 0.45)
      ctx.fillStyle = '#eeede7'
      torn()
      ctx.fill()
      noShadow()
      ctx.save()
      torn()
      ctx.clip()
      ctx.strokeStyle = '#c6d0d8'
      ctx.lineWidth = 1
      for (let gx = noteX + 8; gx < noteX + noteW; gx += 28) {
        ctx.beginPath()
        ctx.moveTo(gx + 0.5, noteY)
        ctx.lineTo(gx + 0.5, noteY + noteH)
        ctx.stroke()
      }
      for (let gy = noteY + 14; gy < noteY + noteH; gy += 28) {
        ctx.beginPath()
        ctx.moveTo(noteX, gy + 0.5)
        ctx.lineTo(noteX + noteW, gy + 0.5)
        ctx.stroke()
      }
      ctx.strokeStyle = 'rgba(214,80,60,0.5)'
      ctx.beginPath()
      ctx.moveTo(noteX + 98.5, noteY)
      ctx.lineTo(noteX + 98.5, noteY + noteH)
      ctx.stroke()
      ctx.fillStyle = '#1c1b1a'
      for (let hy = noteY + 24; hy < noteY + noteH - 24; hy += 34) {
        ctx.beginPath()
        ctx.arc(noteX + 52, hy, 8.5, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
      ctx.fillStyle = '#121212'
      for (let hy = noteY + 16; hy < noteY + noteH - 30; hy += 34) ctx.fillRect(noteX - 8, hy, 26, 15)
      const tx = noteX + 128
      ctx.fillStyle = '#34363d'
      ctx.font = `500 18px ${F.mono}`
      ctx.fillText(`${t.source} / SOURCE`, tx, noteY + 52)
      ctx.textAlign = 'right'
      ctx.fillText(toZh ? 'EN' : 'ZH', noteX + noteW - 56, noteY + 52)
      ctx.textAlign = 'left'
      dots(tx, noteX + noteW - 56, noteY + 76, 'rgba(52,54,61,0.5)')
      ctx.fillStyle = '#1b1b1b'
      ctx.font = srcFont
      src.lines.forEach((ln, i) => ctx.fillText(ln, tx, noteY + 52 + 24 + 34 + 26 + i * srcLH))
      ctx.restore()

      // ---- 译文：硫酸纸 ----
      ctx.save()
      tilt(velX, velY, velW, velH, 0.007)
      shadow(60, 30, 0.5)
      ctx.fillStyle = 'rgba(229,230,226,0.985)'
      ctx.fillRect(velX, velY, velW, velH)
      noShadow()
      const vx = velX + 58
      const vr = velX + velW - 58
      const indigo = '#41468a'
      ctx.fillStyle = indigo
      ctx.font = `500 18px ${F.mono}`
      ctx.fillText(`${t.result} / TRANSLATION`, vx, velY + 58)
      ctx.textAlign = 'right'
      ctx.fillText(elapsedMs ? `${t.done} ${fmtElapsed(elapsedMs, t)}` : t.done, vr, velY + 58)
      ctx.textAlign = 'left'
      dots(vx, vr, velY + 82, 'rgba(65,70,138,0.5)')
      ctx.font = dstFont
      ctx.fillStyle = indigo
      const dy0 = velY + 82 + 40 + size
      dst.lines.forEach((ln, i) => ctx.fillText(ln, vx, dy0 + i * dstLH))
      let y = dy0 + (dst.lines.length - 1) * dstLH + 46
      dots(vx, vr, y, 'rgba(65,70,138,0.5)')
      y += 50
      ctx.font = `500 17px ${F.mono}`
      ctx.fillText('MODEL:', vx, y)
      ctx.font = `800 27px ${F.grot}`
      ctx.fillText(modelName || '—', vx + 82, y + 1)
      y += 30
      const barY = y
      let seed = 0
      for (const ch of String(result)) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0
      ctx.fillStyle = indigo
      for (let x = vx; x < vr - 196; ) {
        seed = (seed * 1103515245 + 12345) >>> 0
        const w = 1 + (seed % 3)
        ctx.fillRect(x, y, w, 34)
        x += w + 2 + ((seed >> 4) % 4)
      }
      ctx.restore()
      tape(velX - 26, velY - 14, 126, -0.16)
      tape(velX + velW - 104, velY - 10, 116, 0.12)

      // 「已译」章
      ctx.save()
      const cx = velX + velW - 58 - 92
      const cy = barY + 2
      ctx.translate(cx, cy)
      ctx.rotate(-0.26)
      ctx.globalAlpha = 0.66
      ctx.strokeStyle = '#3a3fa6'
      ctx.fillStyle = '#3a3fa6'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.arc(0, 0, 82, 0, Math.PI * 2)
      ctx.stroke()
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(0, 0, 50, 0, Math.PI * 2)
      ctx.stroke()
      ctx.font = `900 ${t.stamp.length > 2 ? 26 : 36}px ${F.zhSans}`
      ctx.textAlign = 'center'
      ctx.fillText(t.stamp, 0, 12)
      ctx.font = `600 13px ${F.mono}`
      const ring = 'TRANSLATED ✦ DSH ✦ QUICK TRANSLATE ✦ '
      const step = (Math.PI * 2) / ring.length
      ;[...ring].forEach((ch, i) => {
        ctx.save()
        ctx.rotate(-Math.PI / 2 + i * step)
        ctx.translate(0, -62)
        ctx.fillText(ch, 0, 4)
        ctx.restore()
      })
      ctx.restore()

      // ---- 桌面底部 ----
      const now = new Date()
      ctx.fillStyle = 'rgba(232,229,222,0.2)'
      ctx.font = `800 38px ${F.grot}`
      ctx.fillText(`${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`, padX, H - 66)
      ctx.textAlign = 'right'
      ctx.font = `500 17px ${F.mono}`
      ctx.fillStyle = 'rgba(232,229,222,0.45)'
      ctx.fillText('MADE WITH DEEPSEEK HARNESS', W - padX, H - 70)
      ctx.textAlign = 'left'

      // 颗粒
      ctx.fillStyle = grainPattern(ctx, 22)
      ctx.fillRect(0, 0, W, H)

      return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'))
    }

    // 色场风格的分享卡片：白底，上面一块浅灰圆角（原文），下面一整块品牌色圆角（译文 + 超大「文」），照画板「F 色场 · 分享卡片」540 宽 ×2
    async function renderFieldShareCard({ source, result, target, modelName, elapsedMs, t, brand }) {
      try {
        await document.fonts?.ready
      } catch {
        /* 字体没就绪就用回退字体画 */
      }
      const F = { ...SHARE_FONTS, ui: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", sans-serif' }
      const W = 1080
      const S = 2
      const toZh = target !== 'en'
      const blue = brand || '#4d6bfe'
      const measure = document.createElement('canvas').getContext('2d')
      const padX = 64
      const innerW = W - padX * 2

      // 原文卡
      const srcFont = `400 29px ${F.ui}`
      measure.font = srcFont
      const src = wrapLines(measure, source, innerW - 96, 7)
      const srcLH = 49
      const srcY = 160
      const srcH = 44 + 40 + 24 + src.lines.length * srcLH + 40

      // 译文卡：字号随长度在 42 → 32 之间收
      let size = 42
      let dst = null
      for (; size >= 32; size -= 2) {
        measure.font = toZh ? `600 ${size}px ${F.zhSerif}` : `500 ${size}px ${F.enSerif}`
        dst = wrapLines(measure, result, innerW - 104, 12)
        if (!dst.truncated && dst.lines.length <= 9) break
      }
      size = Math.max(size, 32)
      const dstFont = toZh ? `600 ${size}px ${F.zhSerif}` : `500 ${size}px ${F.enSerif}`
      const dstLH = Math.round(size * (toZh ? 1.8 : 1.55))
      const fieldY = srcY + srcH + 28
      const fieldH = Math.max(520, 48 + 40 + 28 + dst.lines.length * dstLH + 44 + 52 + 44)
      const H = fieldY + fieldH + 28 + 22 + 52

      const canvas = document.createElement('canvas')
      canvas.width = W * S
      canvas.height = H * S
      const ctx = canvas.getContext('2d')
      ctx.scale(S, S)
      ctx.textBaseline = 'alphabetic'
      const round = (x, y, w, hh, r) => {
        ctx.beginPath()
        ctx.moveTo(x + r, y)
        ctx.arcTo(x + w, y, x + w, y + hh, r)
        ctx.arcTo(x + w, y + hh, x, y + hh, r)
        ctx.arcTo(x, y + hh, x, y, r)
        ctx.arcTo(x, y, x + w, y, r)
        ctx.closePath()
      }

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, W, H)

      // 头部
      ctx.fillStyle = '#1d1d22'
      ctx.font = `700 38px ${F.ui}`
      ctx.fillText('Quick Translate', padX + 8, 112)
      const titleW = ctx.measureText('Quick Translate').width
      ctx.font = `400 22px ${F.ui}`
      ctx.fillStyle = '#6c6c75'
      ctx.fillText(`${t.title} · DSH Plugin · by ${AUTHOR}`, padX + 8 + titleW + 20, 112)
      ctx.textAlign = 'right'
      ctx.font = `400 24px ${F.ui}`
      ctx.fillText(toZh ? t.en2zh : t.zh2en, W - padX - 8, 112)
      ctx.textAlign = 'left'

      // 原文卡
      round(padX, srcY, innerW, srcH, 40)
      ctx.fillStyle = '#f6f6f8'
      ctx.fill()
      ctx.strokeStyle = '#e9e9ee'
      ctx.lineWidth = 2
      ctx.stroke()
      const sx = padX + 48
      ctx.fillStyle = '#1d1d22'
      ctx.font = toZh ? `italic 400 40px ${F.enSerif}` : `600 40px ${F.zhSerif}`
      ctx.fillText(nativeName(toZh ? 'en' : 'zh'), sx, srcY + 44 + 32)
      ctx.font = srcFont
      src.lines.forEach((ln, i) => ctx.fillText(ln, sx, srcY + 44 + 40 + 24 + 22 + i * srcLH))

      // 译文卡
      ctx.save()
      round(padX, fieldY, innerW, fieldH, 40)
      ctx.fillStyle = blue
      ctx.fill()
      ctx.clip()
      ctx.fillStyle = 'rgba(255,255,255,0.08)'
      ctx.textAlign = 'right'
      ctx.font = toZh ? `600 600px ${F.zhSerif}` : `500 640px ${F.enSerif}`
      ctx.fillText(toZh ? '文' : 'A', padX + innerW + 68, fieldY + fieldH + 120)
      ctx.textAlign = 'left'
      const fx = padX + 52
      ctx.fillStyle = '#ffffff'
      ctx.font = toZh ? `600 40px ${F.zhSerif}` : `italic 400 40px ${F.enSerif}`
      const lname = nativeName(toZh ? 'zh' : 'en')
      ctx.fillText(lname, fx, fieldY + 48 + 32)
      const lw = ctx.measureText(lname).width
      ctx.font = `400 23px ${F.ui}`
      ctx.fillStyle = 'rgba(255,255,255,0.86)'
      ctx.fillText(elapsedMs ? `${t.done} · ${fmtElapsed(elapsedMs, t)}` : t.done, fx + lw + 20, fieldY + 48 + 30)
      ctx.fillStyle = '#ffffff'
      ctx.font = dstFont
      const dy0 = fieldY + 48 + 40 + 28 + size
      dst.lines.forEach((ln, i) => ctx.fillText(ln, fx, dy0 + i * dstLH))
      // 底部：模型胶囊 + 日期
      const by = fieldY + fieldH - 44 - 52
      ctx.font = `600 24px ${F.ui}`
      const mn = modelName || '—'
      const mw = Math.min(ctx.measureText(mn).width, innerW - 104 - 260)
      round(fx, by, mw + 40, 52, 18)
      ctx.fillStyle = 'rgba(255,255,255,0.16)'
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.fillText(mn, fx + 20, by + 34, mw)
      const now = new Date()
      ctx.textAlign = 'right'
      ctx.font = `400 24px ${F.ui}`
      ctx.fillStyle = 'rgba(255,255,255,0.86)'
      ctx.fillText(`${now.getFullYear()}.${pad2(now.getMonth() + 1)}.${pad2(now.getDate())}`, padX + innerW - 52, by + 34)
      ctx.textAlign = 'left'
      ctx.restore()

      // 页脚
      ctx.fillStyle = '#9a9aa4'
      ctx.font = `400 22px ${F.ui}`
      ctx.fillText('Made with DeepSeek Harness', padX + 8, H - 52)
      ctx.textAlign = 'right'
      ctx.fillText('dsh-quick-translate', W - padX - 8, H - 52)
      ctx.textAlign = 'left'

      return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'))
    }

    /** 分享：生成卡片 → 预览 → 复制图片 / 保存图片。浮层画在面板自己里面，不往 body 挂东西。 */
    function ShareSheet({ data, t, onClose }) {
      const [url, setUrl] = useState('')
      const [blob, setBlob] = useState(null)
      const [msg, setMsg] = useState('')
      const field = data.skin === 'field'
      useEffect(() => {
        let alive = true
        let made = ''
        ;(data.skin === 'field' ? renderFieldShareCard : renderShareCard)(data)
          .then((b) => {
            if (!alive || !b) return
            made = URL.createObjectURL(b)
            setBlob(b)
            setUrl(made)
          })
          .catch((err) => alive && setMsg(String(err?.message || err)))
        return () => {
          alive = false
          if (made) URL.revokeObjectURL(made)
        }
      }, [data])
      useEffect(() => {
        const onKey = (e) => {
          if (e.key !== 'Escape') return
          e.stopPropagation()
          onClose()
        }
        document.addEventListener('keydown', onKey, true)
        return () => document.removeEventListener('keydown', onKey, true)
      }, [onClose])
      const copy = async () => {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
          setMsg(t.shareCopied)
        } catch {
          setMsg(t.shareCopyFailed)
        }
      }
      const save = () => {
        const a = document.createElement('a')
        a.href = url
        a.download = `quick-translate-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`
        a.click()
        setMsg(t.shareSaved)
      }
      return h(
        'div',
        { className: 'qt-share', role: 'dialog', 'aria-modal': 'true', 'aria-label': t.shareTitle, onClick: (e) => e.target === e.currentTarget && onClose() },
        h('div', { className: 'qt-share-card' }, url ? h('img', { src: url, alt: t.shareTitle }) : h('span', { className: 'qt-share-wait' }, msg || t.shareMaking)),
        h(
          'div',
          { className: 'qt-share-bar' },
          h('button', { type: 'button', className: field ? 'qt-fsbtn qt-fsbtn-primary' : 'qt-tapebtn qt-go qt-btn-primary', onClick: copy, disabled: !blob }, t.shareCopy),
          h('button', { type: 'button', className: field ? 'qt-fsbtn qt-fsbtn-secondary' : 'qt-tapebtn qt-clear', onClick: save, disabled: !url }, t.shareSave),
          h('button', { type: 'button', className: field ? 'qt-fhb' : 'qt-hbtn', onClick: onClose }, t.shareClose),
          url && msg ? h('span', { className: 'qt-share-msg', role: 'status' }, msg) : null,
        ),
      )
    }

    // 自动明暗：从插件外面一层开始往上找第一个不透明的背景色（就是用户眼睛看到的 DSH 底色），
    // 找不到再读 DSH 的 --dsw-alias-bg-base，都解析不了就看系统偏好
    function detectDark(el) {
      for (let n = el?.parentElement; n && n !== document.documentElement; n = n.parentElement) {
        const bg = getComputedStyle(n).backgroundColor
        const m = String(bg).match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?/i)
        if (!m) continue
        const a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4])
        if (a < 0.5) continue
        return isDarkColor(`rgb(${m[1]}, ${m[2]}, ${m[3]})`)
      }
      return isDarkColor(el ? getComputedStyle(el).getPropertyValue('--dsw-alias-bg-base') : '')
    }

    // 解析主题 token 的颜色值（#rgb / #rrggbb / rgb()），算相对亮度判断明暗；解析不了就看系统偏好
    function isDarkColor(value) {
      const v = String(value || '').trim()
      let rgb = null
      const hex = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
      if (hex) {
        const x = hex[1].length === 3 ? hex[1].replace(/./g, '$&$&') : hex[1]
        rgb = [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16))
      } else {
        const m = v.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i)
        if (m) rgb = [m[1], m[2], m[3]].map(Number)
      }
      if (!rgb) return Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches)
      const [r, g, b] = rgb.map((c) => {
        const k = c / 255
        return k <= 0.03928 ? k / 12.92 : ((k + 0.055) / 1.055) ** 2.4
      })
      return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.3
    }

    // 文本框的刻度尺：内容超出时才出现，实心段表示当前位置
    function thumbOf(el) {
      if (!el || !el.scrollHeight) return null
      const sh = el.scrollHeight
      const ch = el.clientHeight
      if (sh <= ch + 2) return null
      const size = Math.max(8, (ch / sh) * 100)
      return { top: (el.scrollTop / (sh - ch)) * (100 - size), size }
    }
    const rulerOf = (thumb) => (thumb ? h('div', { className: `qt-tarul ${thumb.on ? 'is-on' : ''}`, 'aria-hidden': 'true' }, h('i', { style: { top: `${thumb.top}%`, height: `${thumb.size}%` } })) : null)

    /* ============================== 组件 ================================ */

    /** 模型选择：硫酸纸底部的一行字，点开是一张索引卡（absolute 锚在按钮上方，不受祖先 transform 影响）。 */
    // 两种风格共用一套逻辑，只换类名和图形
    const PICKER_CLS = {
      paper: { root: 'qt-picker', btn: 'qt-picker-btn', label: 'qt-picker-label', tag: 'qt-picker-tag', menu: 'qt-picker-menu', head: 'qt-picker-head', group: 'qt-picker-group-title', item: 'qt-picker-item', empty: 'qt-picker-empty' },
      field: { root: 'qt-fpick', btn: 'qt-fpick-btn', label: 'qt-fpick-label', tag: 'qt-fpick-tag', menu: 'qt-fmenu', head: 'qt-fmenu-head', group: 'qt-fmg', item: 'qt-fmi', empty: 'qt-fmenu-empty' },
    }
    function ModelPicker({ groups, defaultRoute, value, onChange, loading, disabled, t, skin }) {
      const field = skin === 'field'
      const C = PICKER_CLS[field ? 'field' : 'paper']
      const [open, setOpen] = useState(false)
      const btnRef = useRef(null)
      const menuRef = useRef(null)
      const parsed = parseKey(value)
      const selected = parsed ? groups.flatMap((g) => g.models).find((m) => m.provider === parsed.provider && m.model === parsed.model) || null : null
      const label = selected
        ? selected.name || selected.model
        : defaultRoute
          ? defaultRoute.model
          : loading
            ? t.loadingModels
            : t.selectModel
      const total = groups.reduce((n, g) => n + g.models.length, 0)

      useEffect(() => {
        if (!open) return undefined
        const onDown = (e) => {
          if (btnRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return
          setOpen(false)
        }
        const onKey = (e) => {
          if (e.key !== 'Escape') return
          // 只关菜单，别让同一下 Esc 穿透到面板的「取消翻译」
          e.stopPropagation()
          setOpen(false)
        }
        document.addEventListener('mousedown', onDown)
        document.addEventListener('keydown', onKey)
        return () => {
          document.removeEventListener('mousedown', onDown)
          document.removeEventListener('keydown', onKey)
        }
      }, [open])

      const toggle = () => {
        if (disabled) return
        setOpen((v) => !v)
      }

      const pick = (key) => {
        onChange(key)
        setOpen(false)
        btnRef.current?.focus()
      }

      const item = (key, name, id) =>
        h(
          'button',
          { type: 'button', key: key || '__default', className: C.item, role: 'option', 'aria-selected': value === key ? 'true' : 'false', onClick: () => pick(key) },
          h('span', { className: 'qt-check' }, field ? h(CheckIcon) : h(TickMark)),
          h('span', { className: 'qt-name' }, name),
          id && id !== name ? h('span', { className: 'qt-id' }, id) : null,
        )

      return h(
        'div',
        { className: C.root },
        h(
          'button',
          { ref: btnRef, type: 'button', className: C.btn, onClick: toggle, disabled: disabled || loading, 'aria-haspopup': 'listbox', 'aria-expanded': open ? 'true' : 'false', title: !selected && defaultRoute ? `${t.followDefault} · ${label}` : label },
          h('span', { className: field ? 'qt-fpick-k' : undefined }, field ? t.model : `${t.model}:`),
          h('span', { className: C.label }, label),
          !selected && defaultRoute ? h('span', { className: C.tag }, field ? `(${t.defaultShort})` : `[${t.defaultShort}]`) : null,
          field ? h(ChevronIcon) : h('span', { className: 'qt-chev', 'aria-hidden': true }, '▾'),
        ),
        open
          ? h(
              'div',
              { ref: menuRef, className: C.menu, role: 'listbox', 'aria-label': t.selectModel },
              h('div', { className: C.head }, h('b', null, field ? t.selectModel : t.model), h('span', null, t.modelCount(total))),
              defaultRoute ? item('', `${t.followDefault}`, defaultRoute.model) : null,
              groups.map((g) =>
                h(
                  'div',
                  { key: g.provider },
                  h('div', { className: C.group }, g.name),
                  g.models.map((m) => item(modelKey(m), m.name || m.model, m.model)),
                ),
              ),
              loading ? h('div', { className: C.empty }, t.loadingModels) : null,
              !loading && groups.length === 0 && !defaultRoute ? h('div', { className: C.empty }, t.selectModel) : null,
            )
          : null,
      )
    }

    /** 历史：一张热敏小票。头尾固定，中间单独滚动；日期标签吸顶；右边缘的刻度尺代替滚动条。 */
    function HistoryPanel({ history, currentId, query, onQuery, onPick, onDelete, onClear, clearArmed, t, lang }) {
      const [thumb, setThumb] = useState({ top: 0, size: 100 })
      const q = query.trim().toLowerCase()
      const shown = q
        ? history.filter((e) => e.source.toLowerCase().includes(q) || e.result.toLowerCase().includes(q) || e.modelName.toLowerCase().includes(q))
        : history
      const onScroll = (event) => {
        const el = event.currentTarget
        const size = el.scrollHeight > 0 ? Math.min(100, (el.clientHeight / el.scrollHeight) * 100) : 100
        const room = el.scrollHeight - el.clientHeight
        setThumb({ top: room > 0 ? (el.scrollTop / room) * (100 - size) : 0, size })
      }
      const rows = []
      let lastDay = ''
      for (const e of shown) {
        const d = dayLabel(e.at, t, lang)
        if (d !== lastDay) {
          rows.push(h('div', { key: `d-${e.id}`, className: 'qt-hday' }, `— ${d} —`))
          lastDay = d
        }
        rows.push(
          h(
            'div',
            { key: e.id, role: 'listitem', className: 'qt-hitem-wrap' },
            h(
              'button',
              { type: 'button', className: 'qt-hitem', 'aria-current': e.id === currentId ? 'true' : 'false', onClick: () => onPick(e), title: e.source.slice(0, 200) },
              h(
                'div',
                { className: 'qt-hitem-meta' },
                h('span', null, fmtClock(e.at)),
                h('span', null, e.target === 'zh' ? 'EN>ZH' : 'ZH>EN'),
                e.modelName ? h('span', { className: 'qt-model' }, e.modelName) : null,
              ),
              h('div', { className: 'qt-hitem-dst', 'data-lang': e.target }, e.result),
              h('div', { className: 'qt-hitem-src' }, e.source),
            ),
            h(
              'button',
              { type: 'button', className: 'qt-hitem-del', title: t.historyDelete, 'aria-label': t.historyDelete, onClick: (ev) => { ev.stopPropagation(); onDelete(e.id) } },
              '×',
            ),
          ),
        )
      }
      return h(
        'aside',
        { className: 'qt-history qt-col', 'aria-label': t.history },
        h('div', { className: 'qt-paper', 'aria-hidden': 'true' }),
        h('div', { className: 'qt-history-head' }, h('b', null, t.history), h('span', null, `No. ${pad2(history.length)}`)),
        h(
          'label',
          { className: 'qt-history-search' },
          h('span', null, 'Find:'),
          h('input', { type: 'search', value: query, placeholder: t.historySearch, onChange: (e) => onQuery(e.target.value), 'aria-label': t.historySearch, disabled: history.length === 0 }),
        ),
        h('div', { className: 'qt-perf', 'aria-hidden': 'true' }),
        h(
          'div',
          { className: 'qt-history-scroll' },
          h(
            'div',
            { className: 'qt-history-list', role: 'list', onScroll },
            history.length === 0
              ? h('div', { className: 'qt-empty-sm' }, t.historyEmpty)
              : shown.length === 0
                ? h('div', { className: 'qt-empty-sm' }, t.historyEmptyFiltered)
                : rows,
          ),
          thumb.size < 100
            ? h('div', { className: 'qt-ruler', 'aria-hidden': 'true' }, h('i', { style: { top: `${thumb.top}%`, height: `${thumb.size}%` } }))
            : null,
        ),
        h('div', { className: 'qt-perf', 'aria-hidden': 'true' }),
        h(
          'div',
          { className: 'qt-history-foot' },
          history.length
            ? h(
                'button',
                { type: 'button', className: `qt-link qt-br ${clearArmed ? 'qt-danger' : ''}`, onClick: onClear },
                clearArmed ? t.historyConfirm : t.historyClear,
              )
            : h('span'),
          h('span', null, t.historyTotal(history.length)),
        ),
        h('div', { className: 'qt-barcode', 'aria-hidden': 'true' }),
      )
    }

    /** 色场的历史：和译文容器一样大的一张卡，盖在译文的位置上。头尾固定，中间单独滚动；日期吸顶，上下渐隐，右侧细滚动条。 */
    function FieldHistory({ history, currentId, query, onQuery, onPick, onDelete, onClear, onClose, clearArmed, t, lang }) {
      const [scroll, setScroll] = useState({ top: 0, size: 100, atTop: true, atEnd: true })
      const listRef = useRef(null)
      const q = query.trim().toLowerCase()
      const shown = q
        ? history.filter((e) => e.source.toLowerCase().includes(q) || e.result.toLowerCase().includes(q) || e.modelName.toLowerCase().includes(q))
        : history
      const measure = (el) => {
        if (!el) return
        const room = el.scrollHeight - el.clientHeight
        const size = el.scrollHeight > 0 ? Math.min(100, (el.clientHeight / el.scrollHeight) * 100) : 100
        setScroll({ top: room > 0 ? (el.scrollTop / room) * (100 - size) : 0, size, atTop: el.scrollTop <= 2, atEnd: room - el.scrollTop <= 2 })
      }
      useEffect(() => measure(listRef.current), [shown.length])
      const rows = []
      let lastDay = ''
      for (const e of shown) {
        const d = dayLabel(e.at, t, lang)
        if (d !== lastDay) {
          rows.push(h('div', { key: `d-${e.id}`, className: 'qt-fhday' }, d))
          lastDay = d
        }
        rows.push(
          h(
            'div',
            { key: e.id, role: 'listitem', className: 'qt-fhi-wrap' },
            h(
              'button',
              { type: 'button', className: 'qt-fhi', 'aria-current': e.id === currentId ? 'true' : 'false', onClick: () => onPick(e), title: e.source.slice(0, 200) },
              h('span', { className: 'qt-fhi-time' }, fmtClock(e.at)),
              h('span', { className: 'qt-fhi-main' }, h('span', { className: 'qt-fhi-dst', 'data-lang': e.target }, e.result), h('span', { className: 'qt-fhi-src' }, e.source)),
              h('span', { className: 'qt-fhi-meta' }, h('span', null, e.target === 'zh' ? t.en2zh : t.zh2en), e.modelName ? h('span', null, e.modelName) : null),
            ),
            h(
              'button',
              { type: 'button', className: 'qt-fhi-del', title: t.historyDelete, 'aria-label': t.historyDelete, onClick: (ev) => { ev.stopPropagation(); onDelete(e.id) } },
              h(CloseIcon, { size: 12 }),
            ),
          ),
        )
      }
      return h(
        'aside',
        { className: 'qt-fhist', 'aria-label': t.history },
        h(
          'div',
          { className: 'qt-fhist-head' },
          h('b', null, t.history),
          h('span', null, t.historyCount(history.length)),
          h(
            'label',
            { className: 'qt-fhist-search' },
            h(SearchIcon),
            h('input', { type: 'search', value: query, placeholder: t.historySearch, onChange: (e) => onQuery(e.target.value), 'aria-label': t.historySearch, disabled: history.length === 0 }),
          ),
          h('button', { type: 'button', className: 'qt-ficon', title: t.historyHide, 'aria-label': t.historyHide, onClick: onClose }, h(CloseIcon, { size: 15 })),
        ),
        h('div', { className: 'qt-fhist-rule', 'aria-hidden': 'true' }),
        h(
          'div',
          { className: 'qt-fhist-scroll' },
          h(
            'div',
            { ref: listRef, className: 'qt-fhist-list', role: 'list', onScroll: (ev) => measure(ev.currentTarget) },
            history.length === 0
              ? h('div', { className: 'qt-fempty' }, t.historyEmpty)
              : shown.length === 0
                ? h('div', { className: 'qt-fempty' }, t.historyEmptyFiltered)
                : rows,
          ),
          !scroll.atTop ? h('div', { className: 'qt-ffade-top', 'aria-hidden': 'true' }) : null,
          !scroll.atEnd ? h('div', { className: 'qt-ffade-bot', 'aria-hidden': 'true' }) : null,
          scroll.size < 100 ? h('div', { className: 'qt-fthumb', 'aria-hidden': 'true' }, h('i', { style: { top: `${scroll.top}%`, height: `${scroll.size}%` } })) : null,
        ),
        h(
          'div',
          { className: 'qt-fhist-foot' },
          history.length
            ? h('button', { type: 'button', className: `qt-fhist-clear ${clearArmed ? 'is-armed' : ''}`, onClick: onClear }, clearArmed ? t.historyConfirm : t.historyClear)
            : h('span'),
          h('span', null, t.historyKeep),
        ),
      )
    }

    function TranslatePanel() {
      const lang = useLang()
      const t = STR[lang] || STR.en
      const langName = (code) => (code === 'zh' ? t.langZh : t.langEn)

      const prefs = useMemo(() => readJson(PREFS_KEY, {}), [])
      const draft = useMemo(() => readJson(DRAFT_KEY, {}), [])
      const [source, setSource] = useState(typeof draft.source === 'string' ? draft.source : '')
      const [result, setResult] = useState(typeof draft.result === 'string' ? draft.result : '')
      const [direction, setDirection] = useState(['en2zh', 'zh2en', 'auto'].includes(prefs.direction) ? prefs.direction : 'auto')
      // 窄屏下历史是盖住内容的小票，默认不展开，免得一打开面板先看到的是「还没有翻译记录」
      const [historyOpen, setHistoryOpen] = useState(prefs.historyOpen === true && window.innerWidth > 720)
      const [history, setHistory] = useState(() => sanitizeHistory(readJson(HISTORY_KEY, [])))
      const [historyQuery, setHistoryQuery] = useState('')
      const [clearArmed, setClearArmed] = useState(false)
      const [currentId, setCurrentId] = useState(null)
      const [models, setModels] = useState(null)
      const [skipped, setSkipped] = useState(0)
      const [defaultRoute, setDefaultRoute] = useState(null)
      const [modelKeyState, setModelKeyState] = useState(typeof prefs.modelKey === 'string' ? prefs.modelKey : '')
      const [modelsLoading, setModelsLoading] = useState(false)
      const [modelsError, setModelsError] = useState('')
      const [status, setStatus] = useState('idle') // idle | streaming | done | error
      const [error, setError] = useState('')
      const [elapsed, setElapsed] = useState(0)
      const [usedRoute, setUsedRoute] = useState(null)
      const [usedTarget, setUsedTarget] = useState(null)
      const [truncated, setTruncated] = useState(false)
      const [cancelled, setCancelled] = useState(false)
      const [copied, setCopied] = useState(false)
      const [copyFailed, setCopyFailed] = useState(false)
      const [shareData, setShareData] = useState(null)
      // 界面风格：paper = E 纸本（默认），field = F 色场（简洁版）；记在偏好里
      const [skin, setSkin] = useState(prefs.skin === 'field' ? 'field' : 'paper')
      const [autoTone, setTone] = useState('light')
      // 色场明暗：auto 跟随 DSH 实际底色；light / dark 由用户在头部手动指定
      const [toneMode, setToneMode] = useState(['auto', 'light', 'dark'].includes(prefs.toneMode) ? prefs.toneMode : 'auto')
      const tone = toneMode === 'auto' ? autoTone : toneMode
      const rootRef = useRef(null)
      const boardRef = useRef(null)
      // 桌面按画板 E 的 1200×690 原样搭好，再整体缩放到面板大小；面板窄于 760 时改成上下叠放、不缩放
      const [fit, setFit] = useState({ scale: 1, narrow: window.innerWidth < 760 })
      useEffect(() => {
        const el = boardRef.current
        if (!el || typeof ResizeObserver === 'undefined') return undefined
        const measure = () => {
          const w = el.clientWidth
          const hh = el.clientHeight
          const narrow = w < 760
          const scale = narrow
            ? 1
            : skin === 'field'
              ? Math.max(0.55, Math.min(FIELD_MAX_ZOOM, w / FIELD_W, hh / FIELD_H))
              : Math.max(0.55, Math.min(1.6, (w - 16) / COMP_W, (hh - 8) / COMP_H))
          setFit((p) => (p.narrow === narrow && Math.abs(p.scale - scale) < 0.004 ? p : { scale, narrow }))
        }
        const ro = new ResizeObserver(measure)
        ro.observe(el)
        measure()
        return () => ro.disconnect()
      }, [skin])
      // 色场的颜色跟 DSH 主题走：读 --dsw-alias-bg-base 判断明暗，暗色下品牌色场压暗一些，白字才清楚
      useEffect(() => {
        if (skin !== 'field') return undefined
        const el = rootRef.current
        if (!el || typeof getComputedStyle !== 'function') return undefined
        const read = () => setTone(detectDark(el) ? 'dark' : 'light')
        read()
        const mo = typeof MutationObserver === 'function' ? new MutationObserver(read) : null
        mo?.observe(document.documentElement, { attributes: true })
        if (document.body) mo?.observe(document.body, { attributes: true })
        const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
        mq?.addEventListener?.('change', read)
        return () => {
          mo?.disconnect()
          mq?.removeEventListener?.('change', read)
        }
      }, [skin])
      const [srcThumb, setSrcThumb] = useState(null)
      const [resThumb, setResThumb] = useState(null)
      const rulerTimers = useRef({})
      // 滚动时亮出刻度尺，停下 900ms 后淡出
      const flashRuler = (key, setter, el) => {
        const th = thumbOf(el)
        setter(th ? { ...th, on: true } : null)
        clearTimeout(rulerTimers.current[key])
        rulerTimers.current[key] = setTimeout(() => setter((p) => (p ? { ...p, on: false } : p)), 900)
      }
      useEffect(() => setSrcThumb(thumbOf(sourceRef.current)), [source, fit])
      useEffect(() => {
        const el = resultRef.current
        // 流式输出时跟着最新一行往下走
        if (el && status === 'streaming') el.scrollTop = el.scrollHeight
        setResThumb(thumbOf(el))
      }, [result, fit, status])
      const abortRef = useRef(null)
      const resultRef = useRef(null)
      const sourceRef = useRef(null)

      // 草稿和偏好落 localStorage：切到别的面板再回来不丢。流式输出时 delta 很密，草稿写入做 400ms 去抖
      useEffect(() => {
        const id = setTimeout(() => writeJson(DRAFT_KEY, { source, result }), 400)
        return () => clearTimeout(id)
      }, [source, result])
      useEffect(() => writeJson(PREFS_KEY, { modelKey: modelKeyState, direction, historyOpen, skin, toneMode }), [modelKeyState, direction, historyOpen, skin, toneMode])
      useEffect(() => writeJson(HISTORY_KEY, history), [history])

      // 「确认清空」3 秒后自动撤回
      useEffect(() => {
        if (!clearArmed) return undefined
        const id = setTimeout(() => setClearArmed(false), 3000)
        return () => clearTimeout(id)
      }, [clearArmed])

      const loadModels = useCallback(
        async (refresh) => {
          setModelsLoading(true)
          setModelsError('')
          try {
            const payload = await fetchModels(refresh)
            const list = Array.isArray(payload.models) ? payload.models : []
            setModels(list)
            setSkipped(Array.isArray(payload.skipped) ? payload.skipped.length : 0)
            setDefaultRoute(payload.default && payload.default.provider && payload.default.model ? payload.default : null)
            // 上次选的模型已经被用户从 DSH 里删掉 → 退回跟随默认
            setModelKeyState((prev) => {
              const parsed = parseKey(prev)
              if (!parsed) return prev
              return list.some((m) => m.provider === parsed.provider && m.model === parsed.model) ? prev : ''
            })
          } catch (err) {
            setModelsError(String(err?.message || err))
          } finally {
            setModelsLoading(false)
          }
        },
        [],
      )

      useEffect(() => {
        loadModels(false)
      }, [loadModels])

      const list = models ?? EMPTY_LIST
      const groups = useMemo(() => groupModels(list), [list])
      // 当前生效的模型：用户选了就用选的（必须在当前列表里），否则跟随 DSH 默认
      const selected = useMemo(() => {
        const parsed = parseKey(modelKeyState)
        if (!parsed) return null
        return list.find((m) => m.provider === parsed.provider && m.model === parsed.model) || null
      }, [modelKeyState, list])
      const effective = selected || defaultRoute

      const canTranslate = source.trim().length > 0 && Boolean(effective) && status !== 'streaming'
      const hasText = Boolean(source.trim())
      // 译文栏的语言标签：有结果时显示这次实际译成的语言，没结果时才显示「如果现在翻会译成什么」
      const target = hasText ? resolveTarget(direction, source) : null
      const shownTarget = status === 'done' ? usedTarget : target

      const cancel = useCallback(() => {
        abortRef.current?.abort()
      }, [])

      const runTranslate = useCallback(async () => {
        const text = source.trim()
        if (!text) return
        const to = resolveTarget(direction, source)
        const route = selected || defaultRoute
        if (!route) {
          setStatus('error')
          setError(t.noModels)
          return
        }
        abortRef.current?.abort()
        const controller = new AbortController()
        abortRef.current = controller
        const started = performance.now()
        setStatus('streaming')
        setError('')
        setResult('')
        setTruncated(false)
        setCancelled(false)
        setElapsed(0)
        setUsedRoute({ provider: route.provider, model: route.model, name: route.name || route.model })
        setUsedTarget(to)
        setCurrentId(null)
        // 色场的历史卡盖在译文位置上，开始翻译就收起它，免得挡住译文
        if (skin === 'field') setHistoryOpen(false)
        let acc = ''
        try {
          const done = await streamTranslate({
            text,
            target: to,
            provider: route.provider,
            model: route.model,
            signal: controller.signal,
            onMeta: (meta) => meta?.model && setUsedRoute({ provider: meta.provider, model: meta.model, name: route.name || meta.model }),
            onDelta: (delta) => {
              acc += delta
              setResult((prev) => prev + delta)
            },
          })
          if (typeof done.text === 'string') {
            acc = done.text
            setResult(done.text)
          }
          const ms = Number(done.elapsedMs) || performance.now() - started
          setElapsed(ms)
          setTruncated(Boolean(done.truncated))
          const used = { provider: done.provider || route.provider, model: done.model || route.model }
          setUsedRoute({ ...used, name: route.name || used.model })
          setStatus('done')
          // 完成的翻译进历史
          const entry = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            source: text,
            result: acc,
            target: to,
            provider: used.provider,
            model: used.model,
            modelName: route.name || used.model,
            at: Date.now(),
            elapsedMs: ms,
            truncated: Boolean(done.truncated),
          }
          setHistory((prev) => pushHistory(prev, entry))
          setCurrentId(entry.id)
        } catch (err) {
          if (controller.signal.aborted || err?.cancelled) {
            if (abortRef.current !== controller) return
            // 取消后已经收到的那部分留着给用户看，但要明确标成「已取消的部分结果」
            const partial = acc.trim().length > 0
            setCancelled(partial)
            setElapsed(partial ? performance.now() - started : 0)
            setStatus(partial ? 'done' : 'idle')
            return
          }
          const message = String(err?.message || err)
          setStatus('error')
          setError(message === '__stream_broken__' ? t.streamBroken : message)
        } finally {
          if (abortRef.current === controller) abortRef.current = null
        }
      }, [source, direction, selected, defaultRoute, t, skin])

      const onSourceKey = (event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
          event.preventDefault()
          if (canTranslate) runTranslate()
        }
      }

      useEffect(() => {
        const onKey = (event) => {
          // 输入法组合中按 Esc 是在取消候选词，不是取消翻译；焦点在历史搜索框时也别响应
          if (event.key !== 'Escape' || event.isComposing || event.keyCode === 229) return
          if (event.target?.closest?.('.qt-history-search, .qt-fhist-search')) return
          if (!abortRef.current) return
          event.preventDefault()
          abortRef.current.abort()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [])

      useEffect(() => () => abortRef.current?.abort(), [])

      const copyResult = async () => {
        if (!result) return
        try {
          await navigator.clipboard.writeText(result)
          setCopied(true)
          setCopyFailed(false)
          setTimeout(() => setCopied(false), 1500)
        } catch {
          resultRef.current?.select()
          setCopyFailed(true)
          setTimeout(() => setCopyFailed(false), 3000)
        }
      }

      const resetOutcome = () => {
        setStatus('idle')
        setError('')
        setElapsed(0)
        setTruncated(false)
        setCancelled(false)
        setUsedRoute(null)
        setUsedTarget(null)
        setCurrentId(null)
      }

      // 真正的互换：原文 ⇄ 译文，方向翻转；再点一次就换回来
      const swap = () => {
        if (!result || status === 'streaming') return
        const s = source
        const r = result
        setSource(r)
        setResult(s)
        resetOutcome()
        if (direction === 'en2zh') setDirection('zh2en')
        else if (direction === 'zh2en') setDirection('en2zh')
        sourceRef.current?.focus()
      }

      const clearAll = () => {
        abortRef.current?.abort()
        abortRef.current = null
        setSource('')
        setResult('')
        resetOutcome()
        sourceRef.current?.focus()
      }

      // 回看一条历史：填回两栏，方向若与之矛盾就顺手改过来；窄屏下顺手收起抽屉，别挡着译文
      const pickHistory = (e) => {
        abortRef.current?.abort()
        abortRef.current = null
        setSource(e.source)
        setResult(e.result)
        setStatus('done')
        setError('')
        setElapsed(e.elapsedMs || 0)
        setTruncated(Boolean(e.truncated))
        setCancelled(false)
        setUsedRoute({ provider: e.provider, model: e.model, name: e.modelName })
        setUsedTarget(e.target)
        setCurrentId(e.id)
        if (direction === 'en2zh' && e.target === 'en') setDirection('zh2en')
        else if (direction === 'zh2en' && e.target === 'zh') setDirection('en2zh')
        // 窄屏下顺手收起抽屉；色场的历史卡盖在译文上，回看时一律收起
        if (window.innerWidth <= 720 || skin === 'field') setHistoryOpen(false)
      }

      const deleteHistory = (id) => {
        setHistory((prev) => prev.filter((e) => e.id !== id))
        if (id === currentId) setCurrentId(null)
      }

      const clearHistory = () => {
        if (!clearArmed) return setClearArmed(true)
        setHistory([])
        setHistoryQuery('')
        setCurrentId(null)
        setClearArmed(false)
      }

      // 没有任何可用路由时整个面板换成空状态：区分「真没有模型」「服务商没响应」「列表读取失败」
      const modelsMissing = !modelsLoading && !defaultRoute && list.length === 0 && (models !== null || Boolean(modelsError))
      const emptyMessage = modelsError
        ? `${t.loadModelsFailed}：${modelsError}`
        : skipped > 0
          ? t.someSkipped(skipped)
          : t.noModels

      const streaming = status === 'streaming'
      const shownArrow = arrowOf(shownTarget || (status === 'done' ? usedTarget : null))
      const cleanDone = status === 'done' && !cancelled && !truncated && Boolean(result)
      const today = new Date()
      const deskDate = `${today.getDate()} ${MONTHS[today.getMonth()]} ${today.getFullYear()}`
      const noDrag = { WebkitAppRegion: 'no-drag' }
      const kbdLabel = `${modKey === 'Ctrl' ? 'Ctrl' : '⌘'} ↵`

      const segButton = (value, label) =>
        h('button', { type: 'button', 'aria-pressed': direction === value ? 'true' : 'false', onClick: () => setDirection(value), disabled: streaming }, label)

      // 硫酸纸右上角：这次翻译的状态
      const statusChip = () => {
        if (streaming) return h('span', { className: 'qt-chip qt-live' }, t.receiving)
        if (status !== 'done') return h('span', { className: 'qt-chip' }, t.standby)
        if (cancelled) return h('span', { className: 'qt-chip qt-chip-warn', title: t.cancelledPartial }, t.cancelledPartial)
        if (truncated) return h('span', { className: 'qt-chip qt-chip-warn', title: t.truncated }, t.truncated)
        return h('span', { className: 'qt-chip qt-chip-ok' }, `${t.done} ${fmtElapsed(elapsed, t)}`)
      }

      // 方格本右上角：这一页会译成什么（预测值）；翻译中显示「锁定」
      const sourceHint = streaming
        ? h('span', { className: 'qt-locked' }, `[ ${t.locked} ]`)
        : hasText
          ? h('span', null, direction === 'auto' ? `${t.auto} → ${langName(target)}` : `→ ${langName(target)}`)
          : h('span', null, direction === 'auto' ? `[ ${t.auto} ]` : '')

      // 牛皮纸标签上的大字：手动方向优先；只有「自动」时才看上次实际译成的方向
      const bigTarget = direction === 'en2zh' ? 'zh' : direction === 'zh2en' ? 'en' : streaming || status === 'done' ? usedTarget || target : target
      const bigLabel = bigTarget === 'en' ? t.zh2en : bigTarget === 'zh' ? t.en2zh : t.auto

      const narrow = fit.narrow
      const compStyle = narrow ? undefined : { zoom: fit.scale }
      // 分享卡片的数据：两种风格共用，色场多带一个品牌色
      const openShare = () => {
        // 分享卡片的蓝和界面一致，固定 DeepSeek 蓝（不读 DSH 的品牌色 token，作者实机里它是黑色）
        const brand = FIELD_BLUE
        setShareData({
          source,
          result,
          target: usedTarget || shownTarget || resolveTarget(direction, source),
          modelName: usedRoute?.name || usedRoute?.model || selected?.name || defaultRoute?.model || '',
          elapsedMs: status === 'done' ? elapsed : 0,
          t,
          skin,
          brand,
        })
      }

      if (skin === 'field') return fieldView()

      /** F 色场：两块大圆角容器（素色原文 + 品牌色译文），坐标照画板 F（1200×696 工作区）。 */
      function fieldView() {
        // 原文那块写成哪种语言：有字或手动方向时按预测；空白自动时按画板写 English
        const srcLang = target ? (target === 'zh' ? 'en' : 'zh') : direction === 'zh2en' ? 'zh' : 'en'
        const dstLang = shownTarget || (direction === 'zh2en' ? 'en' : 'zh')
        const srcHint = streaming
          ? h('span', { className: 'qt-fhint is-locked' }, t.fieldLocked)
          : h('span', { className: 'qt-fhint' }, direction === 'auto' ? (hasText ? t.fieldAutoTo(target) : t.fieldAuto) : hasText ? t.autoHint(target) : '')
        const fieldStatus = streaming
          ? h('span', { className: 'qt-fhint' }, t.translating)
          : status !== 'done'
            ? h('span', { className: 'qt-fhint' }, status === 'error' ? '' : t.standby)
            : cancelled
              ? h('span', { className: 'qt-fhint' }, h('span', { className: 'qt-fchip-warn', title: t.cancelledPartial }, t.cancelledPartial))
              : truncated
                ? h('span', { className: 'qt-fhint' }, h('span', { className: 'qt-fchip-warn', title: t.truncated }, t.truncated))
                : h('span', { className: 'qt-fhint qt-fchip-ok' }, `${t.done} · ${fmtElapsed(elapsed, t)}`)
        const histOpen = historyOpen && !modelsMissing
        const fhb = (props, ...kids) => h('button', { type: 'button', className: 'qt-fhb', style: noDrag, ...props }, ...kids)

        const srcBox = h(
          'section',
          { className: 'qt-fbox qt-fsrc', 'aria-label': t.source },
          h(
            'div',
            { className: 'qt-frow' },
            h('span', { className: 'qt-flang', 'data-lang': srcLang }, nativeName(srcLang)),
            srcHint,
            h('div', { className: 'qt-ftrack', role: 'group', 'aria-label': t.direction }, segButton('en2zh', t.en2zh), segButton('zh2en', t.zh2en), segButton('auto', t.auto)),
          ),
          h('textarea', {
            ref: sourceRef,
            className: 'qt-fta',
            value: source,
            placeholder: t.sourcePlaceholder,
            spellCheck: false,
            autoFocus: true,
            readOnly: streaming,
            onKeyDown: onSourceKey,
            onChange: (event) => setSource(event.target.value),
          }),
          h(
            'div',
            { className: 'qt-ffoot' },
            h('span', { className: 'qt-fcount' }, `${source.length} ${t.chars}`),
            h('button', { type: 'button', className: 'qt-fclear', onClick: clearAll, title: t.clearTitle, disabled: streaming || (!source && !result) }, t.clear),
            streaming
              ? h('button', { type: 'button', className: 'qt-fgo is-stop', onClick: cancel, title: 'Esc' }, t.cancel, h('kbd', null, 'Esc'))
              : h('button', { type: 'button', className: 'qt-fgo qt-fgo-primary', disabled: !canTranslate, onClick: runTranslate, title: `${modKey} + Enter` }, t.translate, h('kbd', null, kbdLabel)),
          ),
        )

        const swapBtn = h('button', { type: 'button', className: 'qt-fswap', title: t.swap, 'aria-label': t.swap, disabled: !result || streaming, onClick: swap }, h(SwapIcon))

        const fieldBox = h(
          'section',
          { className: 'qt-fbox qt-ffield', 'aria-label': t.result },
          h('span', { className: 'qt-fwm', 'data-lang': dstLang, 'aria-hidden': 'true' }, dstLang === 'en' ? 'A' : '文'),
          streaming ? h('div', { className: 'qt-fprog', 'aria-hidden': 'true' }) : null,
          h('div', { className: 'qt-frow' }, h('span', { className: 'qt-flang', 'data-lang': dstLang }, nativeName(dstLang)), fieldStatus),
          status === 'error' && error
            ? h('div', { className: 'qt-ferror', role: 'alert' }, h('span', { className: 'qt-error-text' }, error), h('button', { type: 'button', onClick: runTranslate }, t.retry))
            : null,
          h(
            'div',
            { className: 'qt-fbody' },
            h('textarea', {
              ref: resultRef,
              className: 'qt-fta qt-fres',
              'data-lang': dstLang,
              value: result,
              placeholder: t.resultPlaceholder,
              readOnly: true,
              spellCheck: false,
            }),
            !result && !streaming && status !== 'error'
              ? h('div', { className: 'qt-fwait', 'aria-hidden': 'true' }, h('b', null, t.waiting), h('span', null, t.waitingHint(modKey === 'Ctrl' ? 'Ctrl' : '⌘')))
              : null,
          ),
          h(
            'div',
            { className: 'qt-fstats' },
            h('span', null, `${t.fSrc} ${source.length} ${t.chars}`),
            h('span', null, `${t.fDst} ${result ? result.length : '—'} ${t.chars}`),
            h('span', null, `${t.statTime} ${status === 'done' && elapsed ? fmtElapsed(elapsed, t) : '—'}`),
          ),
          h(
            'div',
            { className: 'qt-ffoot' },
            h(ModelPicker, { groups, defaultRoute, value: modelKeyState, onChange: setModelKeyState, loading: modelsLoading, disabled: modelsMissing, t, skin: 'field' }),
            h('span', { className: 'qt-spacer' }),
            h('button', { type: 'button', className: 'qt-flink qt-share-btn', disabled: !result || streaming, onClick: openShare }, t.share),
            h(
              'button',
              { type: 'button', className: `qt-fcopy ${copyFailed ? 'is-warn' : ''}`, onClick: copyResult, disabled: !result, title: copyFailed ? t.copyFailedHint.replace('{key}', modKey) : '' },
              copyFailed ? t.copyFailed : copied ? t.copied : t.copy,
            ),
          ),
        )

        const hist = histOpen
          ? h(FieldHistory, {
              history,
              currentId,
              query: historyQuery,
              onQuery: setHistoryQuery,
              onPick: pickHistory,
              onDelete: deleteHistory,
              onClear: clearHistory,
              onClose: () => setHistoryOpen(false),
              clearArmed,
              t,
              lang,
            })
          : null

        return h(
          'div',
          { ref: rootRef, className: 'qt-root qt-skin-field', 'data-state': status, 'data-tone': tone },
          h(
            'header',
            { className: `qt-fhead ${narrow ? 'is-narrow' : ''}`, 'data-window-drag': '' },
            h('span', { className: 'qt-ftitle' }, t.deskTitle),
            h('span', { className: 'qt-fsub' }, `${t.title} · DSH Plugin · by ${AUTHOR}`),
            h(
              'div',
              { className: 'qt-ftrack', role: 'group', 'aria-label': t.skin, style: noDrag },
              h('button', { type: 'button', 'aria-pressed': 'false', onClick: () => setSkin('paper') }, h('span', { className: 'qt-fsw qt-fsw-paper', 'aria-hidden': 'true' }), t.skinPaper),
              h('button', { type: 'button', 'aria-pressed': 'true', onClick: () => setSkin('field') }, h('span', { className: 'qt-fsw qt-fsw-field', 'aria-hidden': 'true' }), t.skinField),
            ),
            h(
              'div',
              { className: 'qt-ftone', role: 'group', 'aria-label': t.tone, style: noDrag },
              ['auto', 'light', 'dark'].map((m) =>
                h('button', { key: m, type: 'button', 'aria-pressed': toneMode === m ? 'true' : 'false', title: m === 'auto' ? t.toneAutoHint : '', onClick: () => setToneMode(m) }, m === 'auto' ? t.toneAuto : m === 'light' ? t.toneLight : t.toneDark),
              ),
            ),
            fhb({ 'aria-pressed': historyOpen ? 'true' : 'false', onClick: () => setHistoryOpen((v) => !v) }, t.history, h('span', { className: 'qt-fcnt' }, `${history.length}`)),
            fhb({ title: modelsError || t.refresh, 'aria-label': t.refresh, disabled: modelsLoading, onClick: () => loadModels(true) }, h(RefreshIcon), modelsLoading ? t.refreshing : narrow ? t.refreshShort : t.refresh),
          ),
          h(
            'div',
            { ref: boardRef, className: `qt-fboard ${narrow ? 'is-narrow' : ''}` },
            modelsMissing
              ? h(
                  'div',
                  { className: 'qt-fempty-card' },
                  h('b', null, t.noModelsTitle),
                  h('p', null, emptyMessage),
                  h('button', { type: 'button', className: 'qt-fgo', onClick: () => loadModels(true), disabled: modelsLoading }, t.noModelsRefresh),
                )
              : h(
                  'div',
                  { className: `qt-fcomp ${narrow ? 'is-narrow' : ''} ${histOpen ? 'is-hist' : ''}`, style: compStyle },
                  srcBox,
                  swapBtn,
                  narrow && hist ? hist : fieldBox,
                  narrow ? null : hist,
                ),
          ),
          shareData ? h(ShareSheet, { data: shareData, t, onClose: () => setShareData(null) }) : null,
        )
      }


      const note = h(
        'section',
        { className: 'qt-col qt-note', 'aria-label': t.source },
        h('div', { className: 'qt-paper', 'aria-hidden': 'true' }),
        h('div', { className: 'qt-rings', 'aria-hidden': 'true' }),
        h('div', { className: 'qt-holes', 'aria-hidden': 'true' }),
        h(
          'div',
          { className: 'qt-note-in' },
          h('div', { className: 'qt-colhead' }, h('span', null, `${t.source} / Source`), sourceHint),
          h('div', { className: 'qt-dots', 'aria-hidden': 'true' }),
          h(
            'div',
            { className: 'qt-tawrap' },
            h('textarea', {
              ref: sourceRef,
              className: 'qt-textarea qt-src',
              value: source,
              placeholder: t.sourcePlaceholder,
              spellCheck: false,
              autoFocus: true,
              // 流式输出期间锁住原文，避免译完了原文却和译文/历史条目对不上
              readOnly: streaming,
              onKeyDown: onSourceKey,
              onChange: (event) => setSource(event.target.value),
              onScroll: (event) => flashRuler('src', setSrcThumb, event.currentTarget),
            }),
            rulerOf(srcThumb),
          ),
          h(
            'div',
            { className: 'qt-note-foot' },
            h('span', { className: 'qt-meta' }, `${source.length} ${t.chars}`),
            h('button', { type: 'button', className: 'qt-tapebtn qt-clear', onClick: clearAll, title: t.clearTitle, disabled: streaming || (!source && !result) }, t.clear),
            narrow ? actions() : null,
          ),
        ),
        narrow ? null : actions(),
      )

      function actions() {
        return h('div', { className: 'qt-actions' }, goButton())
      }

      function goButton() {
        return streaming
          ? h('button', { type: 'button', className: 'qt-tapebtn qt-go qt-btn-stop', onClick: cancel, title: 'Esc' }, t.cancel, h('kbd', null, 'Esc'))
          : h('button', { type: 'button', className: 'qt-tapebtn qt-go qt-btn-primary', disabled: !canTranslate, onClick: runTranslate, title: `${modKey} + Enter` }, t.translate, h('kbd', null, kbdLabel))
      }

      const swapTape = h(
        'button',
        { type: 'button', className: 'qt-swap', title: t.swap, 'aria-label': t.swap, disabled: !result || streaming, onClick: swap },
        h('small', { 'aria-hidden': 'true' }, '<>'),
        h('b', { 'aria-hidden': 'true' }, t.swapShort),
      )

      const vellum = h(
        'section',
        { className: 'qt-col qt-vellum', 'aria-label': t.result },
        h('div', { className: 'qt-paper', 'aria-hidden': 'true' }),
        h(
          'div',
          { className: 'qt-vel-in' },
          h('div', { className: 'qt-colhead' }, h('span', null, `${t.result} / Translation`), h('span', null, shownArrow), statusChip()),
          h('div', { className: 'qt-dots', 'aria-hidden': 'true' }),
          status === 'error' && error
            ? h(
                'div',
                { className: 'qt-error', role: 'alert' },
                h('span', { className: 'qt-error-text' }, error),
                h('button', { type: 'button', className: 'qt-link qt-br', onClick: runTranslate }, t.retry),
              )
            : null,
          h(
            'div',
            { className: 'qt-body' },
            h('textarea', {
              ref: resultRef,
              className: 'qt-textarea qt-res',
              'data-lang': shownTarget || 'zh',
              value: result,
              placeholder: t.resultPlaceholder,
              readOnly: true,
              spellCheck: false,
              onScroll: (event) => flashRuler('res', setResThumb, event.currentTarget),
            }),
            rulerOf(resThumb),
            !result && !streaming && status !== 'error'
              ? h('div', { className: 'qt-waiting', 'aria-hidden': 'true' }, h('b', null, t.waiting), h('span', null, t.waitingHint(modKey === 'Ctrl' ? 'Ctrl' : '⌘')))
              : null,
          ),
          h('div', { className: 'qt-dots qt-dots-end', 'aria-hidden': 'true' }),
          h(
            'div',
            { className: 'qt-stats' },
            h('div', null, t.statSrc, h('b', null, hasText ? `${source.length}` : '—')),
            h('div', null, t.statDst, h('b', null, result ? `${result.length}` : '—')),
            h('div', null, t.statTime, h('b', null, status === 'done' && elapsed ? fmtElapsed(elapsed, t) : '—')),
          ),
          h('div', { className: 'qt-bar', 'data-state': streaming ? 'streaming' : result ? 'done' : 'idle', 'aria-hidden': 'true' }),
          h(
            'div',
            { className: 'qt-vfoot' },
            h(ModelPicker, {
              groups,
              defaultRoute,
              value: modelKeyState,
              onChange: setModelKeyState,
              loading: modelsLoading,
              disabled: modelsMissing,
              t,
            }),
            cleanDone && !narrow ? h(Signature) : null,
            h('span', { className: 'qt-spacer' }),
            h(
              'button',
              {
                type: 'button',
                className: `qt-link qt-br ${copyFailed ? 'qt-btn-warn' : ''}`,
                onClick: copyResult,
                disabled: !result,
                title: copyFailed ? t.copyFailedHint.replace('{key}', modKey) : '',
              },
              copyFailed ? t.copyFailed : copied ? t.copied : t.copy,
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'qt-link qt-br qt-share-btn',
                disabled: !result || streaming,
                onClick: openShare,
              },
              t.share,
            ),
          ),
        ),
        cleanDone ? h(Stamp, { key: currentId || 'stamp', label: t.stamp, arrow: shownArrow.replace(/ >>> /, '>') }) : null,
      )

      const tag = h(
        'div',
        { className: 'qt-tag' },
        h('div', { className: 'qt-seg', role: 'group', 'aria-label': t.direction }, segButton('en2zh', t.en2zh), segButton('zh2en', t.zh2en), segButton('auto', t.auto)),
        h('div', { className: 'qt-tag-big', 'aria-hidden': 'true' }, bigLabel),
      )

      return h(
        'div',
        { ref: rootRef, className: 'qt-root', 'data-state': status },
        h(
          'header',
          { className: 'qt-header', 'data-window-drag': '' },
          h('span', { className: 'qt-title' }, t.deskTitle),
          h('span', { className: 'qt-subtitle qt-mono' }, `[ ${t.title} ] DSH Plugin · by ${AUTHOR}`),
          h('span', { className: 'qt-spacer' }),
          h(
            'div',
            { className: 'qt-skinsw qt-mono', role: 'group', 'aria-label': t.skin, style: noDrag },
            h('span', { className: 'qt-skinsw-k' }, `${t.skin}:`),
            h('button', { type: 'button', className: 'qt-hbtn', 'aria-pressed': 'true', onClick: () => setSkin('paper') }, t.skinPaper),
            h('span', { className: 'qt-skinsw-sep', 'aria-hidden': 'true' }, '/'),
            h('button', { type: 'button', className: 'qt-hbtn', 'aria-pressed': 'false', onClick: () => setSkin('field') }, t.skinField),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'qt-hbtn',
              'aria-pressed': historyOpen ? 'true' : 'false',
              style: noDrag,
              onClick: () => setHistoryOpen((v) => !v),
            },
            t.history,
            h('span', { className: 'qt-badge' }, `${history.length}`),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'qt-hbtn',
              title: modelsError || t.refresh,
              'aria-label': t.refresh,
              disabled: modelsLoading,
              style: noDrag,
              onClick: () => loadModels(true),
            },
            modelsLoading ? t.refreshing : t.refresh,
          ),
        ),
        h(
          'div',
          { ref: boardRef, className: `qt-board ${narrow ? 'is-narrow' : ''}` },
          modelsMissing
            ? h(
                'div',
                { className: 'qt-empty-card' },
                h('div', { className: 'qt-paper', 'aria-hidden': 'true' }),
                h('b', null, t.noModelsTitle),
                h('p', null, emptyMessage),
                h('button', { type: 'button', className: 'qt-tapebtn qt-go qt-btn-primary', onClick: () => loadModels(true), disabled: modelsLoading }, t.noModelsRefresh),
              )
            : h(
                'div',
                { className: `qt-comp ${narrow ? 'is-narrow' : ''}`, style: compStyle },
                h('span', { className: 'qt-deco-date', 'aria-hidden': 'true' }, deskDate),
                h(
                  'span',
                  { className: 'qt-deco-side', 'aria-hidden': 'true' },
                  'DSH-QT / V0.3',
                  h('br'),
                  shownArrow,
                  modelsError ? h('br') : null,
                  modelsError ? t.loadModelsFailed : skipped > 0 ? t.someSkipped(skipped) : null,
                ),
                note,
                h('span', { className: 'qt-tape qt-tape-a', 'aria-hidden': 'true' }),
                h('span', { className: 'qt-tape qt-tape-b', 'aria-hidden': 'true' }),
                vellum,
                swapTape,
                narrow ? tag : null,
                historyOpen && narrow ? h('div', { className: 'qt-backdrop', onClick: () => setHistoryOpen(false), 'aria-hidden': 'true' }) : null,
                historyOpen
                  ? h(HistoryPanel, {
                      history,
                      currentId,
                      query: historyQuery,
                      onQuery: setHistoryQuery,
                      onPick: pickHistory,
                      onDelete: deleteHistory,
                      onClear: clearHistory,
                      clearArmed,
                      t,
                      lang,
                    })
                  : null,
              ),
          !narrow && !modelsMissing ? h('div', { className: 'qt-tagwrap', style: { zoom: fit.scale } }, tag) : null,
        ),
        shareData ? h(ShareSheet, { data: shareData, t, onClose: () => setShareData(null) }) : null,
      )
    }

    function SidebarIcon({ size }) {
      return h(TranslateIcon, { size: size || 18 })
    }

    /* ============================== 入口 ================================ */

    function apply(ctx) {
      ensureStyle()

      // 语言跟随 DSH：有 locale 服务就用它，没有就跟随浏览器
      ctx.inject(['locale'], (c) => {
        const push = () => langStore.set(String(c.locale.getSnapshot()?.active || '').slice(0, 2).toLowerCase())
        push()
        c.on('locale/change', push)
      })

      ctx.slots.inject('sidebar.panellist', () =>
        ctx.slots.register(
          { name: 'sidebar.panellist', id: PANEL, order: 7, label: () => STR[langStore.get()]?.title || STR.en.title },
          SidebarIcon,
        ),
      )
      ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: PANEL }, TranslatePanel))
    }

    return { apply, inject: ['slots'] }
  },
})
