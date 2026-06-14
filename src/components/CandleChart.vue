<template>
  <div class="chart-wrap">
    <!-- 顶部工具栏 -->
    <div class="chart-top-bar">
      <div class="bar-tabs">
      <span v-for="b in bars" :key="b.value" class="bar-tab" :class="{ active: activeBar === b.value }" @click="changeBar(b.value)">{{ b.label }}</span>
    </div>

      <button class="fullscreen-btn" @click="enterFullscreen">⛶ 全屏</button>
    </div>
    <!-- 指标切换 -->
    <div class="ind-tabs">
      <span v-for="ind in indicators" :key="ind.value" class="ind-tab" :class="{ active: activeIndicator === ind.value }" @click="switchIndicator(ind.value)">{{ ind.label }}</span>
    </div>

    <!-- 悬停信息 -->
    <div class="hover-bar" v-if="hoverInfo">
      <span class="h-time">{{ hoverInfo.time }}</span>
      <span class="h-o">开<b>{{ hoverInfo.open }}</b></span>
      <span class="h-h">高<b class="up">{{ hoverInfo.high }}</b></span>
      <span class="h-l">低<b class="down">{{ hoverInfo.low }}</b></span>
      <span class="h-c">收<b>{{ hoverInfo.close }}</b></span>
      <span :class="hoverInfo.chg >= 0 ? 'up' : 'down'"><b>{{ hoverInfo.chg >= 0 ? '+' : '' }}{{ hoverInfo.chg.toFixed(2) }}%</b></span>
    </div>
    <div class="hover-bar" v-else-if="candles.length">
      <span class="h-time">最新价</span>
      <span class="h-c"><b>{{ formatPrice(candles[candles.length-1][4]) }}</b></span>
    </div>

    <!-- 主图 -->
    <div class="canvas-box main-box" ref="mainBox">
      <div v-if="loading" class="chart-loading"><div class="spinner"></div></div>
      <canvas v-show="!loading" ref="mainCvs" class="cvs"
        @touchstart.passive="onTouchStart"
        @touchmove.prevent="onTouchMove"
        @touchend="onTouchEnd"
      ></canvas>
    </div>

    <!-- 副图MACD -->
    <div v-if="activeIndicator === 'macd' || activeIndicator === 'both'" class="canvas-box sub-box" ref="macdBox">
      <div class="sub-label">MACD</div>
      <canvas ref="macdCvs" class="cvs"></canvas>
    </div>

    <!-- 副图KDJ -->
    <div v-if="activeIndicator === 'kdj' || activeIndicator === 'both'" class="canvas-box sub-box" ref="kdjBox">
      <div class="sub-label">KDJ</div>
      <canvas ref="kdjCvs" class="cvs"></canvas>
    </div>
  </div>

  <!-- 全屏模式 -->
  <teleport to="body">
    <div v-if="isFullscreen" class="fullscreen-overlay" @touchstart.passive="onTouchStart" @touchmove.prevent="onTouchMove" @touchend="onTouchEnd">
      <div class="fs-header">
        <span class="fs-title">{{ instId }}</span>
        <div class="fs-bar-tabs">
          <span v-for="b in bars" :key="b.value" class="fs-bar-tab" :class="{ active: activeBar === b.value }" @click="changeBar(b.value)">{{ b.label }}</span>
        </div>
        <button class="fs-close" @click="isFullscreen=false">✕</button>
      </div>
      <div class="fs-ind-tabs">
        <span v-for="ind in indicators" :key="ind.value" class="fs-ind-tab" :class="{ active: activeIndicator === ind.value }" @click="switchIndicator(ind.value)">{{ ind.label }}</span>
      </div>
      <div class="fs-hover" v-if="hoverInfo">
        <span>{{ hoverInfo.time }}</span>
        <span>开<b>{{ hoverInfo.open }}</b></span>
        <span>高<b class="up">{{ hoverInfo.high }}</b></span>
        <span>低<b class="down">{{ hoverInfo.low }}</b></span>
        <span>收<b>{{ hoverInfo.close }}</b></span>
      </div>
      <div class="fs-main" ref="fsMainBox">
        <canvas ref="fsMainCvs" class="cvs" @touchstart.passive="onFSTouchStart" @touchmove.prevent="onFSTouchMove" @touchend="onFSTouchEnd"></canvas>
      </div>
      <div v-if="activeIndicator==='macd'||activeIndicator==='both'" class="fs-sub" ref="fsMacdBox">
        <div class="sub-label">MACD</div>
        <canvas ref="fsMacdCvs" class="cvs"></canvas>
      </div>
      <div v-if="activeIndicator==='kdj'||activeIndicator==='both'" class="fs-sub" ref="fsKdjBox">
        <div class="sub-label">KDJ</div>
        <canvas ref="fsKdjCvs" class="cvs"></canvas>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { getCandles, formatPrice } from '@/api/okx'

const props = defineProps({ instId: { type: String, required: true } })

const bars = [
  { label: '30m', value: '30m' },
  { label: '1H',  value: '1H'  },
  { label: '4H',  value: '4H'  },
  { label: '1D',  value: '1D'  },
  { label: '1W',  value: '1W'  }
]
const indicators = [
  { label: 'BOLL', value: 'boll' },
  { label: 'MACD', value: 'macd' },
  { label: 'KDJ',  value: 'kdj'  },
  { label: 'MACD+KDJ', value: 'both' }
]

const activeBar = ref('1H')
const activeIndicator = ref('boll')
const candles = ref([])
const loading = ref(false)
const hoverInfo = ref(null)

const mainCvs = ref(null); const mainBox = ref(null)
const macdCvs = ref(null); const macdBox = ref(null)
const kdjCvs  = ref(null); const kdjBox  = ref(null)

// 滑动相关
let viewStart = ref(0)   // 当前视图起始index
const VIEW_COUNT = 60    // 可见K线数量
let isDragging = false
let lastTouchX = 0
let pinchStartDist = 0
let pinchStartView = 60

// ─── 指标计算 ────────────────────────────────────────
function calcBoll(closes, p = 20, mult = 2) {
  return closes.map((_, i) => {
    if (i < p - 1) return null
    const sl = closes.slice(i - p + 1, i + 1)
    const mid = sl.reduce((a, b) => a + b, 0) / p
    const std = Math.sqrt(sl.reduce((a, b) => a + (b - mid) ** 2, 0) / p)
    return { mid, upper: mid + mult * std, lower: mid - mult * std }
  })
}

function calcMACD(closes, fast = 12, slow = 26, sig = 9) {
  function ema(arr, n) {
    const k = 2 / (n + 1); let e = arr[0]
    return arr.map((v, i) => { if (i === 0) return e; e = v * k + e * (1 - k); return e })
  }
  const emaFast = ema(closes, fast)
  const emaSlow = ema(closes, slow)
  const dif = emaFast.map((v, i) => v - emaSlow[i])
  const dea = ema(dif, sig)
  const macd = dif.map((v, i) => (v - dea[i]) * 2)
  return { dif, dea, macd }
}

function calcKDJ(data, p = 9, m1 = 3, m2 = 3) {
  const highs  = data.map(c => parseFloat(c[2]))
  const lows   = data.map(c => parseFloat(c[3]))
  const closes = data.map(c => parseFloat(c[4]))
  let k = 50, d = 50
  return data.map((_, i) => {
    if (i < p - 1) return null
    const hh = Math.max(...highs.slice(i - p + 1, i + 1))
    const ll = Math.min(...lows.slice(i - p + 1, i + 1))
    const rsv = hh === ll ? 50 : (closes[i] - ll) / (hh - ll) * 100
    k = (m1 - 1) / m1 * k + rsv / m1
    d = (m2 - 1) / m2 * d + k / m2
    return { k, d, j: 3 * k - 2 * d }
  })
}

// ─── 获取视图数据 ────────────────────────────────────
function getViewData() {
  const all = candles.value
  const n = all.length
  const vc = Math.min(VIEW_COUNT, n)
  const start = Math.max(0, Math.min(viewStart.value, n - vc))
  return { data: all.slice(start, start + vc), startIdx: start }
}

// ─── 绘制主图（K线+BOLL）────────────────────────────
function drawMain() {
  const el = mainCvs.value; const box = mainBox.value
  if (!el || !box || box.clientWidth === 0) return
  const { data } = getViewData()
  if (!data.length) return

  const dpr = window.devicePixelRatio || 1
  const W = box.clientWidth, H = box.clientHeight || 260
  el.width = W * dpr; el.height = H * dpr
  el.style.width = W + 'px'; el.style.height = H + 'px'
  const ctx = el.getContext('2d'); ctx.scale(dpr, dpr)
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
  ctx.fillStyle = isDark ? '#1e293b' : '#ffffff'
  ctx.fillRect(0, 0, W, H)

  const closes = data.map(c => parseFloat(c[4]))
  const highs  = data.map(c => parseFloat(c[2]))
  const lows   = data.map(c => parseFloat(c[3]))
  const boll = activeIndicator.value === 'boll' ? calcBoll(closes) : null

  let maxP = Math.max(...highs)
  let minP = Math.min(...lows)
  if (boll) {
    boll.forEach(b => { if (!b) return; maxP = Math.max(maxP, b.upper); minP = Math.min(minP, b.lower) })
  }
  const pad = (maxP - minP) * 0.05
  maxP += pad; minP -= pad
  const range = maxP - minP || 1

  const padL = 4, padR = 64, padT = 8, padB = 24
  const chartW = W - padL - padR, chartH = H - padT - padB
  const n = data.length
  const cw = chartW / n
  const barW = Math.max(1, cw * 0.7)

  const xC = i => padL + (i + 0.5) * cw
  const yP = v => padT + chartH - ((v - minP) / range) * chartH

  // 背景网格
  ctx.strokeStyle = isDark ? '#334155' : '#e2e8f0'; ctx.lineWidth = 0.5
  for (let i = 0; i <= 4; i++) {
    const y = padT + (i / 4) * chartH
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke()
    const price = maxP - (i / 4) * range
    ctx.fillStyle = isDark ? '#64748b' : '#94a3b8'; ctx.font = `10px system-ui`
    ctx.textAlign = 'left'; ctx.fillText(formatPrice(price), W - padR + 4, y + 4)
  }

  // BOLL
  if (boll) {
    const drawBollLine = (vals, color, dash = []) => {
      ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.setLineDash(dash)
      let s = false
      vals.forEach((v, i) => {
        if (v === null) return
        if (!s) { ctx.moveTo(xC(i), yP(v)); s = true } else ctx.lineTo(xC(i), yP(v))
      })
      ctx.stroke(); ctx.setLineDash([])
    }
    // 填充
    ctx.beginPath()
    let s = false
    boll.forEach((b, i) => { if (!b) return; if (!s) { ctx.moveTo(xC(i), yP(b.upper)); s = true } else ctx.lineTo(xC(i), yP(b.upper)) })
    const vb = boll.map((b,i)=>b?{b,i}:null).filter(Boolean)
    for (let vi = vb.length-1; vi >= 0; vi--) ctx.lineTo(xC(vb[vi].i), yP(vb[vi].b.lower))
    ctx.closePath(); ctx.fillStyle = 'rgba(37,99,235,0.05)'; ctx.fill()
    drawBollLine(boll.map(b => b?.upper ?? null), '#94a3b8', [3, 2])
    drawBollLine(boll.map(b => b?.mid   ?? null), '#f59e0b')
    drawBollLine(boll.map(b => b?.lower ?? null), '#94a3b8', [3, 2])
  }

  // K线蜡烛
  data.forEach((c, i) => {
    const open = parseFloat(c[1]), close = parseFloat(c[4])
    const high = parseFloat(c[2]), low = parseFloat(c[3])
    const isUp = close >= open
    const color = isUp ? '#dc2626' : '#059669'
    const x = xC(i)
    // 影线
    ctx.strokeStyle = color; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(x, yP(high)); ctx.lineTo(x, yP(low)); ctx.stroke()
    // 实体
    const top = yP(Math.max(open, close))
    const bot = yP(Math.min(open, close))
    const h = Math.max(1, bot - top)
    if (isUp) {
      ctx.fillStyle = color; ctx.fillRect(x - barW/2, top, barW, h)
    } else {
      ctx.fillStyle = color; ctx.fillRect(x - barW/2, top, barW, h)
    }
  })

  // 十字线
  if (hoverInfo.value) {
    const i = hoverInfo.value._idx
    const x = xC(i), y = yP(parseFloat(data[i][4]))
    ctx.strokeStyle = 'rgba(100,116,139,0.5)'; ctx.lineWidth = 0.8; ctx.setLineDash([3, 3])
    ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, H - padB); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke()
    ctx.setLineDash([])
    // 价格标签
    ctx.fillStyle = '#334155'; ctx.fillRect(W - padR + 1, y - 9, padR - 2, 18)
    ctx.fillStyle = 'white'; ctx.font = '9px system-ui'; ctx.textAlign = 'center'
    ctx.fillText(formatPrice(data[i][4]), W - padR + (padR - 2) / 2 + 1, y + 4)
  }

  // X轴时间
  ctx.fillStyle = isDark ? '#64748b' : '#94a3b8'; ctx.font = '9px system-ui'; ctx.textAlign = 'center'; ctx.setLineDash([])
  const lblStep = Math.ceil(n / 5)
  for (let i = 0; i < n; i += lblStep) {
    const ts = parseInt(data[i][0]), d = new Date(ts)
    const isDay = activeBar.value === '1D' || activeBar.value === '1W'
    const lbl = isDay
      ? `${d.getMonth()+1}/${d.getDate()}`
      : `${(d.getMonth()+1)}/${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
    ctx.fillText(lbl, xC(i), H - 6)
  }
}

// ─── 绘制MACD副图 ────────────────────────────────────
function drawMACD() {
  const el = macdCvs.value; const box = macdBox.value
  if (!el || !box || box.clientWidth === 0) return
  const { data } = getViewData()
  if (!data.length) return

  const closes = data.map(c => parseFloat(c[4]))
  const { dif, dea, macd } = calcMACD(closes)

  const dpr = window.devicePixelRatio || 1
  const W = box.clientWidth, H = box.clientHeight || 80
  el.width = W * dpr; el.height = H * dpr
  el.style.width = W + 'px'; el.style.height = H + 'px'
  const ctx = el.getContext('2d'); ctx.scale(dpr, dpr)
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
  ctx.fillStyle = isDark ? '#1e293b' : '#ffffff'
  ctx.fillRect(0, 0, W, H)

  const padL = 4, padR = 64, padT = 4, padB = 16
  const chartW = W - padL - padR, chartH = H - padT - padB
  const n = data.length
  const cw = chartW / n
  const xC = i => padL + (i + 0.5) * cw

  const allVals = [...macd, ...dif, ...dea].filter(v => v !== null && !isNaN(v))
  if (!allVals.length) return
  const maxV = Math.max(...allVals, 0)
  const minV = Math.min(...allVals, 0)
  const range = maxV - minV || 1
  const yP = v => padT + chartH - ((v - minV) / range) * chartH
  const zero = yP(0)

  // 零轴
  ctx.strokeStyle = isDark ? '#334155' : '#e2e8f0'; ctx.lineWidth = 0.5
  ctx.beginPath(); ctx.moveTo(padL, zero); ctx.lineTo(W - padR, zero); ctx.stroke()

  // MACD柱
  macd.forEach((v, i) => {
    if (v === null || isNaN(v)) return
    const x = xC(i), y = yP(v)
    const h = Math.abs(y - zero)
    ctx.fillStyle = v >= 0 ? 'rgba(220,38,38,0.7)' : 'rgba(5,150,105,0.7)'
    ctx.fillRect(x - cw * 0.35, Math.min(y, zero), cw * 0.7, Math.max(1, h))
  })

  // DIF DEA 线
  const drawLine = (vals, color) => {
    ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 1.2
    let s = false
    vals.forEach((v, i) => {
      if (v === null || isNaN(v)) return
      if (!s) { ctx.moveTo(xC(i), yP(v)); s = true } else ctx.lineTo(xC(i), yP(v))
    })
    ctx.stroke()
  }
  drawLine(dif, '#2563eb')
  drawLine(dea, '#f59e0b')

  // 标签
  if (dif.length && dea.length) {
    const ld = dif[dif.length-1], le = dea[dea.length-1], lm = macd[macd.length-1]
    ctx.font = '9px system-ui'; ctx.textAlign = 'left'
    ctx.fillStyle = '#2563eb'; ctx.fillText(`DIF:${ld?.toFixed(1)}`, W - padR + 2, padT + 10)
    ctx.fillStyle = '#f59e0b'; ctx.fillText(`DEA:${le?.toFixed(1)}`, W - padR + 2, padT + 22)
    ctx.fillStyle = lm >= 0 ? '#dc2626' : '#059669'; ctx.fillText(`MACD:${lm?.toFixed(1)}`, W - padR + 2, padT + 34)
  }

  // X轴
  ctx.fillStyle = isDark ? '#64748b' : '#94a3b8'; ctx.font = '9px system-ui'; ctx.textAlign = 'center'
  const lblStep = Math.ceil(n / 5)
  for (let i = 0; i < n; i += lblStep) {
    const ts = parseInt(data[i][0]), d = new Date(ts)
    const isDay = activeBar.value === '1D' || activeBar.value === '1W'
    const lbl = isDay ? `${d.getMonth()+1}/${d.getDate()}` : `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
    ctx.fillText(lbl, xC(i), H - 3)
  }
}

// ─── 绘制KDJ副图 ─────────────────────────────────────
function drawKDJ() {
  const el = kdjCvs.value; const box = kdjBox.value
  if (!el || !box || box.clientWidth === 0) return
  const { data } = getViewData()
  if (!data.length) return

  const kdj = calcKDJ(data)
  const dpr = window.devicePixelRatio || 1
  const W = box.clientWidth, H = box.clientHeight || 80
  el.width = W * dpr; el.height = H * dpr
  el.style.width = W + 'px'; el.style.height = H + 'px'
  const ctx = el.getContext('2d'); ctx.scale(dpr, dpr)
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
  ctx.fillStyle = isDark ? '#1e293b' : '#ffffff'
  ctx.fillRect(0, 0, W, H)

  const padL = 4, padR = 64, padT = 4, padB = 16
  const chartW = W - padL - padR, chartH = H - padT - padB
  const n = data.length, cw = chartW / n
  const xC = i => padL + (i + 0.5) * cw
  const yP = v => padT + chartH - (Math.max(0, Math.min(100, v)) / 100) * chartH

  // 超买超卖线
  ctx.strokeStyle = isDark ? '#334155' : '#e2e8f0'; ctx.lineWidth = 0.5
  ;[20, 50, 80].forEach(v => {
    const y = yP(v)
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke()
    ctx.fillStyle = isDark ? '#64748b' : '#94a3b8'; ctx.font = '8px system-ui'; ctx.textAlign = 'left'
    ctx.fillText(v, W - padR + 2, y + 3)
  })

  const drawLine = (vals, color) => {
    ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 1.2
    let s = false
    vals.forEach((pt, i) => {
      if (!pt) return
      if (!s) { ctx.moveTo(xC(i), yP(pt)); s = true } else ctx.lineTo(xC(i), yP(pt))
    })
    ctx.stroke()
  }
  drawLine(kdj.map(p => p?.k), '#2563eb')
  drawLine(kdj.map(p => p?.d), '#f59e0b')
  drawLine(kdj.map(p => p?.j), '#dc2626')

  // 标签
  const last = kdj.filter(Boolean).pop()
  if (last) {
    ctx.font = '9px system-ui'; ctx.textAlign = 'left'
    ctx.fillStyle = '#2563eb'; ctx.fillText(`K:${last.k.toFixed(1)}`, W - padR + 2, padT + 10)
    ctx.fillStyle = '#f59e0b'; ctx.fillText(`D:${last.d.toFixed(1)}`, W - padR + 2, padT + 22)
    ctx.fillStyle = '#dc2626'; ctx.fillText(`J:${last.j.toFixed(1)}`, W - padR + 2, padT + 34)
  }

  // X轴
  ctx.fillStyle = isDark ? '#64748b' : '#94a3b8'; ctx.font = '9px system-ui'; ctx.textAlign = 'center'
  const lblStep = Math.ceil(n / 5)
  for (let i = 0; i < n; i += lblStep) {
    const ts = parseInt(data[i][0]), d = new Date(ts)
    const isDay = activeBar.value === '1D' || activeBar.value === '1W'
    const lbl = isDay ? `${d.getMonth()+1}/${d.getDate()}` : `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
    ctx.fillText(lbl, xC(i), H - 3)
  }
}

function redraw() {
  drawMain()
  if (activeIndicator.value === 'macd' || activeIndicator.value === 'both') nextTick(drawMACD)
  if (activeIndicator.value === 'kdj'  || activeIndicator.value === 'both') nextTick(drawKDJ)
}

// ─── 触摸交互 ────────────────────────────────────────
let touchStartX = 0, touchStartViewStart = 0
let lastTwoTouches = null

function getIdxFromX(x) {
  const box = mainBox.value; if (!box) return 0
  const W = box.clientWidth
  const padL = 4, padR = 64, cw = (W - padL - padR) / Math.min(VIEW_COUNT, candles.value.length)
  const { data, startIdx } = getViewData()
  const i = Math.round((x - padL - cw / 2) / cw)
  return Math.max(0, Math.min(data.length - 1, i))
}

function onTouchStart(e) {
  if (e.touches.length === 1) {
    isDragging = false
    touchStartX = e.touches[0].clientX
    touchStartViewStart = viewStart.value
    lastTouchX = touchStartX
  } else if (e.touches.length === 2) {
    pinchStartDist = Math.abs(e.touches[0].clientX - e.touches[1].clientX)
    pinchStartView = VIEW_COUNT
  }
}

function onTouchMove(e) {
  if (e.touches.length === 1) {
    const dx = e.touches[0].clientX - touchStartX
    if (Math.abs(dx) > 5) isDragging = true
    if (isDragging) {
      const box = mainBox.value; if (!box) return
      const W = box.clientWidth, padL = 4, padR = 64
      const cw = (W - padL - padR) / Math.min(VIEW_COUNT, candles.value.length)
      const shift = Math.round(-dx / cw)
      const n = candles.value.length
      viewStart.value = Math.max(0, Math.min(n - Math.min(VIEW_COUNT, n), touchStartViewStart + shift))
      hoverInfo.value = null
      redraw()
    } else {
      // 显示十字线
      const rect = mainCvs.value.getBoundingClientRect()
      const x = e.touches[0].clientX - rect.left
      const i = getIdxFromX(x)
      const { data } = getViewData()
      if (data[i]) showHover(i, data[i])
    }
    lastTouchX = e.touches[0].clientX
  }
}

function onTouchEnd() {
  if (!isDragging) {
    // tap: 清除十字线
  }
  isDragging = false
  hoverInfo.value = null
  redraw()
}

function showHover(i, c) {
  const ts = parseInt(c[0]), d = new Date(ts)
  const open = parseFloat(c[1]), close = parseFloat(c[4])
  const isDay = activeBar.value === '1D' || activeBar.value === '1W'
  const time = isDay
    ? `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`
    : `${(d.getMonth()+1)}/${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
  hoverInfo.value = {
    time, _idx: i,
    open: formatPrice(c[1]), high: formatPrice(c[2]),
    low: formatPrice(c[3]), close: formatPrice(c[4]),
    chg: ((close - open) / open) * 100
  }
  redraw()
}

// ─── 数据加载 ────────────────────────────────────────
async function loadCandles() {
  loading.value = true; hoverInfo.value = null
  try {
    const data = await getCandles(props.instId, activeBar.value, 200)
    candles.value = data
    viewStart.value = Math.max(0, data.length - VIEW_COUNT)
    await nextTick()
    setTimeout(redraw, 60)
  } finally { loading.value = false }
}

function changeBar(bar) { activeBar.value = bar; loadCandles() }
function switchIndicator(ind) { activeIndicator.value = ind; nextTick(() => setTimeout(redraw, 30)) }

const isFullscreen = ref(false)
const fsMainBox = ref(null)
const fsMainCvs = ref(null)
const fsMacdBox = ref(null)
const fsMacdCvs = ref(null)
const fsKdjBox = ref(null)
const fsKdjCvs = ref(null)

function enterFullscreen() {
  isFullscreen.value = true
  nextTick(() => setTimeout(() => {
    drawFullscreen()
  }, 100))
}

function drawFullscreen() {
  // 复用主图绘制逻辑，只是用全屏 canvas
  const origMain = mainCvs.value
  const origMainBox = mainBox.value
  const origMacd = macdCvs.value
  const origMacdBox = macdBox.value
  const origKdj = kdjCvs.value
  const origKdjBox = kdjBox.value

  // 临时替换为全屏 canvas
  if (fsMainCvs.value && fsMainBox.value) {
    mainCvs.value = fsMainCvs.value
    mainBox.value = fsMainBox.value
  }
  if (fsMacdCvs.value && fsMacdBox.value) {
    macdCvs.value = fsMacdCvs.value
    macdBox.value = fsMacdBox.value
  }
  if (fsKdjCvs.value && fsKdjBox.value) {
    kdjCvs.value = fsKdjCvs.value
    kdjBox.value = fsKdjBox.value
  }

  drawMain()
  if (activeIndicator.value === 'macd' || activeIndicator.value === 'both') nextTick(drawMACD)
  if (activeIndicator.value === 'kdj' || activeIndicator.value === 'both') nextTick(drawKDJ)

  // 还原
  mainCvs.value = origMain
  mainBox.value = origMainBox
  macdCvs.value = origMacd
  macdBox.value = origMacdBox
  kdjCvs.value = origKdj
  kdjBox.value = origKdjBox
}

function onFSTouchStart(e) {
  const orig = mainCvs.value; mainCvs.value = fsMainCvs.value
  const origBox = mainBox.value; mainBox.value = fsMainBox.value
  onTouchStart(e)
  mainCvs.value = orig; mainBox.value = origBox
  drawFullscreen()
}
function onFSTouchMove(e) {
  const orig = mainCvs.value; mainCvs.value = fsMainCvs.value
  const origBox = mainBox.value; mainBox.value = fsMainBox.value
  onTouchMove(e)
  mainCvs.value = orig; mainBox.value = origBox
  drawFullscreen()
}
function onFSTouchEnd() {
  onTouchEnd()
  drawFullscreen()
}

watch(() => props.instId, loadCandles)
onMounted(loadCandles)

let ro
onMounted(() => {
  ro = new ResizeObserver(() => { if (!loading.value) setTimeout(redraw, 30) })
  if (mainBox.value) ro.observe(mainBox.value)
})
onUnmounted(() => ro?.disconnect())
</script>

<style scoped>
.chart-wrap { display: flex; flex-direction: column; gap: 6px; }

.bar-tabs, .ind-tabs { display: flex; gap: 4px; flex-wrap: wrap; }

.bar-tab {
  padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;
  color: var(--text-secondary); background: var(--bg); cursor: pointer; transition: all 0.15s;
}
.bar-tab.active { background: var(--primary); color: white; }

.ind-tab {
  padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 500;
  color: var(--text-secondary); background: var(--bg); cursor: pointer; transition: all 0.15s;
}
.ind-tab.active { background: #f59e0b; color: white; }

.hover-bar {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  font-size: 11px; min-height: 18px; background: #f8fafc;
  padding: 4px 8px; border-radius: 6px;
}
.hover-bar b { font-weight: 700; }
.h-time { color: var(--text-muted); }
.h-o, .h-h, .h-l, .h-c { color: var(--text-secondary); }

.canvas-box { position: relative; width: 100%; background: white; }
.main-box { height: 260px; }
.sub-box { height: 88px; border-top: 1px solid var(--border); margin-top: 2px; }

.sub-label {
  position: absolute; top: 4px; left: 6px;
  font-size: 9px; font-weight: 600; color: var(--text-muted);
  z-index: 1; pointer-events: none;
}

.chart-loading { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
.cvs { display: block; width: 100%; height: 100%; touch-action: none; }

.chart-top-bar { display:flex; align-items:center; gap:8px; justify-content:space-between; }
.chart-top-bar .bar-tabs { flex:1; }
.fullscreen-btn { font-size:12px; color:var(--text-muted); background:var(--bg); border:1px solid var(--border); border-radius:6px; padding:4px 8px; cursor:pointer; white-space:nowrap; flex-shrink:0; }
.fullscreen-btn:active { background:var(--primary-light); color:var(--primary); }

.fullscreen-overlay {
  position:fixed; inset:0; background:var(--card); z-index:9999;
  display:flex; flex-direction:column;
  padding-top:env(safe-area-inset-top,0px);
}
.fs-header { display:flex; align-items:center; gap:8px; padding:10px 14px; border-bottom:1px solid var(--border); flex-shrink:0; }
.fs-title { font-size:15px; font-weight:700; }
.fs-bar-tabs { display:flex; gap:4px; flex:1; justify-content:center; }
.fs-bar-tab { padding:4px 10px; border-radius:16px; font-size:12px; font-weight:500; color:var(--text-muted); background:var(--bg); cursor:pointer; }
.fs-bar-tab.active { background:var(--primary); color:white; }
.fs-close { font-size:20px; color:var(--text-muted); background:none; border:none; padding:4px 8px; cursor:pointer; flex-shrink:0; }
.fs-ind-tabs { display:flex; gap:4px; padding:6px 14px; flex-shrink:0; }
.fs-ind-tab { padding:3px 10px; border-radius:16px; font-size:11px; font-weight:500; color:var(--text-muted); background:var(--bg); cursor:pointer; }
.fs-ind-tab.active { background:#f59e0b; color:white; }
.fs-hover { display:flex; gap:8px; padding:4px 14px; font-size:11px; flex-shrink:0; flex-wrap:wrap; }
.fs-hover b { font-weight:700; }
.fs-main { flex:1; position:relative; min-height:0; }
.fs-sub { height:80px; position:relative; border-top:1px solid var(--border); flex-shrink:0; }
</style>
