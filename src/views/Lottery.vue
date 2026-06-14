<template>
  <div class="lottery-page">

    <!-- 最新开奖 -->
    <div class="latest-card gradient-card">
      <div class="lc-header">
        <div>
          <div class="lc-label">澳門六合彩</div>
          <div class="lc-expect">第 <span class="lc-num">{{ latest.expect }}</span> 期</div>
        </div>
        <div class="lc-time">{{ latest.openTime }}</div>
      </div>
      <div class="balls-row" v-if="latest.balls.length">
        <div v-for="(ball, i) in latest.balls.slice(0,6)" :key="i"
          class="ball" :class="`ball-${latest.waves[i]}`"
          @click="openTemaInfo(ball, latest.waves[i], latest.zodiacs[i])">
          {{ ball }}<span class="ball-zodiac">{{ latest.zodiacs[i] }}</span>
        </div>
        <div class="ball-plus">+</div>
        <div class="ball special-ball" :class="`ball-${latest.waves[6]}`"
          @click="openTemaInfo(latest.balls[6], latest.waves[6], latest.zodiacs[6])">
          {{ latest.balls[6] }}<span class="ball-zodiac">{{ latest.zodiacs[6] }}</span>
        </div>
      </div>
      <div v-else class="balls-loading">开奖数据加载中...</div>
    </div>

    <!-- 直播入口 -->
    <div class="live-card card" @click="showLive=true">
      <div class="live-left">
        <span class="live-dot"></span>
        <span class="live-text">直播开奖</span>
        <span class="live-sub">点击观看实时直播</span>
      </div>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
    </div>

    <!-- 开奖类型 -->
    <div class="type-tabs">
      <span class="type-tab" :class="{active: lotteryType==='macaujc2'}" @click="switchType('macaujc2')">澳門彩</span>
      <span class="type-tab" :class="{active: lotteryType==='macaujc'}" @click="switchType('macaujc')">老澳門彩</span>
    </div>

    <!-- 功能 Tab -->
    <div class="func-tabs">
      <span class="func-tab" :class="{active: funcTab==='history'}" @click="funcTab='history'">历史开奖</span>
      <span class="func-tab" :class="{active: funcTab==='tema'}" @click="funcTab='tema'">特码资料</span>
      <span class="func-tab" :class="{active: funcTab==='stats'}" @click="funcTab='stats'">号码统计</span>
      <span class="func-tab" :class="{active: funcTab==='zodiac'}" @click="funcTab='zodiac'">生肖分析</span>
    </div>

    <!-- 历史开奖 -->
    <div v-if="funcTab==='history'" class="section-card card">
      <div class="section-head">
        <span class="section-title">历史开奖记录</span>
        <div class="year-tabs">
          <span v-for="y in years" :key="y" class="year-tab" :class="{active:selectedYear===y}" @click="selectedYear=y; loadHistory()">{{ y }}</span>
        </div>
      </div>
      <div v-if="loadingHistory" class="mini-loading"><div class="spinner"></div></div>
      <div v-else class="history-list">
        <div v-for="item in historyList" :key="item.expect" class="history-item">
          <div class="hi-header">
            <span class="hi-expect">第{{ item.expect }}期</span>
            <span class="hi-time">{{ item.openTime?.slice(0,10) }}</span>
          </div>
          <div class="hi-balls">
            <div v-for="(ball, i) in item.balls.slice(0,6)" :key="i"
              class="hi-ball" :class="`ball-${item.waves[i]}`"
              @click="openTemaInfo(ball, item.waves[i], item.zodiacs[i])">{{ ball }}</div>
            <span class="hi-plus">+</span>
            <div class="hi-ball special" :class="`ball-${item.waves[6]}`"
              @click="openTemaInfo(item.balls[6], item.waves[6], item.zodiacs[6])">{{ item.balls[6] }}</div>
          </div>
          <div class="hi-zodiacs">
            <span v-for="(z,i) in item.zodiacs" :key="i" class="hi-zodiac">{{ z }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 特码资料 -->
    <div v-if="funcTab==='tema'" class="section-card card">
      <div class="section-head">
        <span class="section-title">特码资料</span>
        <span class="section-sub">点击号码查看详情</span>
      </div>
      <div class="tema-grid">
        <div v-for="n in 49" :key="n" class="tema-cell"
          :class="`ball-${getTemaWave(n)}`"
          @click="openTemaInfo(String(n).padStart(2,'0'), getTemaWave(n), getTemaZodiac(n))">
          <span class="tema-num">{{ String(n).padStart(2,'0') }}</span>
          <span class="tema-z">{{ getTemaZodiac(n) }}</span>
        </div>
      </div>
    </div>

    <!-- 号码统计 -->
    <div v-if="funcTab==='stats'" class="section-card card">
      <div class="section-head">
        <span class="section-title">号码出现频率</span>
        <span class="section-sub">近{{ historyList.length }}期</span>
      </div>
      <div v-if="!historyList.length" class="mini-empty">请先加载历史数据</div>
      <div v-else class="stats-grid">
        <div v-for="item in numStats" :key="item.num" class="stat-ball-item">
          <div class="stat-ball" :class="`ball-${item.wave}`">{{ item.num }}</div>
          <div class="stat-bar-wrap">
            <div class="stat-bar" :style="{width: item.pct+'%', background: waveColor(item.wave)}"></div>
          </div>
          <span class="stat-count">{{ item.count }}</span>
        </div>
      </div>
    </div>

    <!-- 生肖分析 -->
    <div v-if="funcTab==='zodiac'" class="section-card card">
      <div class="section-head">
        <span class="section-title">生肖出现次数</span>
        <span class="section-sub">近{{ historyList.length }}期</span>
      </div>
      <div v-if="!historyList.length" class="mini-empty">请先加载历史数据</div>
      <div v-else class="zodiac-list">
        <div v-for="item in zodiacStats" :key="item.name" class="zodiac-item">
          <span class="zodiac-name">{{ item.name }}</span>
          <div class="zodiac-bar-wrap">
            <div class="zodiac-bar" :style="{width: item.pct+'%'}"></div>
          </div>
          <span class="zodiac-count">{{ item.count }}次</span>
        </div>
      </div>
    </div>

    <!-- 特码资料弹窗 -->
    <div v-if="temaDetail" class="modal-mask" @click.self="temaDetail=null">
      <div class="modal-box">
        <div class="modal-header">
          <div class="tema-big-ball" :class="`ball-${temaDetail.wave}`">
            {{ temaDetail.num }}<span class="ball-zodiac">{{ temaDetail.zodiac }}</span>
          </div>
          <div class="tema-title">
            <div class="tema-main">{{ temaDetail.num }} 号特码资料</div>
            <div class="tema-sub">{{ waveLabel(temaDetail.wave) }} · {{ temaDetail.zodiac }}</div>
          </div>
          <button class="modal-close" @click="temaDetail=null">✕</button>
        </div>
        <div class="tema-info-grid">
          <div class="ti-item"><span class="ti-label">波色</span><span class="ti-val" :class="temaDetail.wave">{{ waveLabel(temaDetail.wave) }}</span></div>
          <div class="ti-item"><span class="ti-label">生肖</span><span class="ti-val">{{ temaDetail.zodiac }}</span></div>
          <div class="ti-item"><span class="ti-label">大小</span><span class="ti-val">{{ parseInt(temaDetail.num) >= 25 ? '大' : '小' }}</span></div>
          <div class="ti-item"><span class="ti-label">单双</span><span class="ti-val">{{ parseInt(temaDetail.num) % 2 === 0 ? '双' : '单' }}</span></div>
          <div class="ti-item"><span class="ti-label">五行</span><span class="ti-val">{{ getTemaElement(parseInt(temaDetail.num)) }}</span></div>
          <div class="ti-item"><span class="ti-label">合数</span><span class="ti-val">{{ getHeSum(parseInt(temaDetail.num)) }}</span></div>
          <div class="ti-item"><span class="ti-label">合单双</span><span class="ti-val">{{ getHeSum(parseInt(temaDetail.num)) % 2 === 0 ? '合双' : '合单' }}</span></div>
          <div class="ti-item"><span class="ti-label">合大小</span><span class="ti-val">{{ getHeSum(parseInt(temaDetail.num)) >= 7 ? '合大' : '合小' }}</span></div>
        </div>
        <div class="tema-history-title">近期开奖记录</div>
        <div class="tema-history-list">
          <div v-for="item in temaHistory" :key="item.expect" class="th-item">
            <span class="th-expect">第{{ item.expect }}期</span>
            <span class="th-date">{{ item.openTime?.slice(0,10) }}</span>
            <span class="th-pos">{{ item.pos }}</span>
          </div>
          <div v-if="!temaHistory.length" class="mini-empty" style="padding:10px 0">近期未出现</div>
        </div>
      </div>
    </div>

    <!-- 直播弹窗 -->
    <div v-if="showLive" class="live-overlay">
      <div class="live-header">
        <span class="live-title">🔴 澳門六合彩直播</span>
        <button class="live-close" @click="showLive=false">✕</button>
      </div>
      <div class="live-tabs">
        <span v-for="s in liveStreams" :key="s.label" class="live-tab"
          :class="{active: currentStream===s.url}" @click="currentStream=s.url; videoError=false">{{ s.label }}</span>
      </div>
      <div class="live-player">
        <video ref="videoRef" class="live-video" autoplay controls playsinline
          :src="currentStream" @error="videoError=true"></video>
        <div v-if="videoError" class="video-error">
          <div>⚠️ 当前线路无法播放</div>
          <div style="font-size:12px;margin-top:6px">请尝试切换其他线路</div>
        </div>
      </div>
      <div class="live-info">
        <span>当前期号：第 {{ latest.expect }} 期</span>
        <span>开奖时间：21:30</span>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const API_BASE = 'https://macaumarksix.com'
const HISTORY_BASE = 'https://history.macaumarksix.com'

const lotteryType = ref('macaujc2')
const funcTab = ref('history')
const selectedYear = ref(new Date().getFullYear())
const years = [2026, 2025, 2024, 2023]
const loadingHistory = ref(false)
const historyList = ref([])
const temaDetail = ref(null)
const showLive = ref(false)
const videoError = ref(false)
const videoRef = ref(null)
const currentStream = ref('https://live-macaujc.com/live/livestream/new.m3u8')
const latest = ref({ expect:'--', openTime:'--', balls:[], waves:[], zodiacs:[] })

const liveStreams = [
  { label: '线路1', url: 'https://live-macaujc.com/live/livestream/new.m3u8' },
  { label: '线路2', url: 'https://play666.macau-lhc.live/live/mosixmark.flv' },
  { label: '线路3', url: 'https://play8888.88888lhc.com/live/mosixmark.flv' },
]

const WAVE_TABLE = {
  red:   [1,2,7,8,12,13,18,19,23,24,29,30,34,35,40,45,46],
  blue:  [3,4,9,10,14,15,20,25,26,31,36,37,41,42,47,48],
  green: [5,6,11,16,17,21,22,27,28,32,33,38,39,43,44,49],
}
const ZODIAC_TABLE = [
  {z:'兔',nums:[1,13,25,37,49]},{z:'虎',nums:[2,14,26,38]},{z:'牛',nums:[3,15,27,39]},
  {z:'鼠',nums:[4,16,28,40]},{z:'猪',nums:[5,17,29,41]},{z:'狗',nums:[6,18,30,42]},
  {z:'雞',nums:[7,19,31,43]},{z:'猴',nums:[8,20,32,44]},{z:'羊',nums:[9,21,33,45]},
  {z:'馬',nums:[10,22,34,46]},{z:'蛇',nums:[11,23,35,47]},{z:'龍',nums:[12,24,36,48]},
]
const ELEMENT_TABLE = {
  '金':[2,3,10,11,24,25,32,33,40,41],'木':[6,7,14,15,22,23,36,37,44,45],
  '水':[12,13,20,21,28,29,42,43],'火':[4,5,16,17,30,31,38,39,46,47],
  '土':[1,8,9,18,19,26,27,34,35,48,49],
}

function getTemaWave(n) {
  if (WAVE_TABLE.red.includes(n)) return 'red'
  if (WAVE_TABLE.blue.includes(n)) return 'blue'
  return 'green'
}
function getTemaZodiac(n) {
  for (const z of ZODIAC_TABLE) { if (z.nums.includes(n)) return z.z }
  return ''
}
function getTemaElement(n) {
  for (const [el, nums] of Object.entries(ELEMENT_TABLE)) { if (nums.includes(n)) return el }
  return ''
}
function getHeSum(n) {
  const s = String(n < 10 ? '0'+n : n)
  return parseInt(s[0]) + parseInt(s[1])
}
function waveLabel(w) { return w==='red'?'红波':w==='blue'?'蓝波':'绿波' }
function waveColor(w) { return w==='red'?'#dc2626':w==='blue'?'#2563eb':'#059669' }

const temaHistory = computed(() => {
  if (!temaDetail.value || !historyList.value.length) return []
  const num = temaDetail.value.num
  const result = []
  historyList.value.forEach(item => {
    item.balls.forEach((b, i) => {
      if (b === num) {
        result.push({ expect:item.expect, openTime:item.openTime, pos: i<6?`第${i+1}位`:'特码' })
      }
    })
  })
  return result.slice(0, 10)
})

function openTemaInfo(num, wave, zodiac) {
  temaDetail.value = { num: String(num).padStart(2,'0'), wave, zodiac }
}

function parseRecord(item) {
  const balls = (item.openCode||'').split(',').map(s => s.trim().padStart(2,'0'))
  const waves = (item.wave||'').split(',').map(s => s.trim())
  const zodiacs = (item.zodiac||'').split(',').map(s => s.trim())
  return { ...item, balls, waves, zodiacs }
}

async function loadLatest() {
  try {
    const typeMap = { macaujc2:'macaujc2.com', macaujc:'macaujc.com' }
    const res = await fetch(`${API_BASE}/api/${typeMap[lotteryType.value]}`)
    const data = await res.json()
    if (data?.[0]) latest.value = parseRecord(data[0])
  } catch(e) { console.error(e) }
}

async function loadHistory() {
  loadingHistory.value = true
  try {
    const res = await fetch(`${HISTORY_BASE}/history/${lotteryType.value}/y/${selectedYear.value}`)
    const data = await res.json()
    historyList.value = (data.data||[]).map(parseRecord)
  } catch(e) { console.error(e) } finally { loadingHistory.value = false }
}

function switchType(type) { lotteryType.value = type; loadLatest(); loadHistory() }

const numStats = computed(() => {
  const countMap={}, waveMap={}
  historyList.value.forEach(item => {
    item.balls.forEach((b,i) => {
      const n=parseInt(b); if(isNaN(n)||n<1||n>49) return
      countMap[n]=(countMap[n]||0)+1; waveMap[n]=item.waves[i]||'red'
    })
  })
  const max=Math.max(...Object.values(countMap),1)
  return Array.from({length:49},(_,i)=>i+1).map(n=>({
    num:n<10?'0'+n:String(n), count:countMap[n]||0,
    wave:waveMap[n]||getTemaWave(n), pct:Math.round((countMap[n]||0)/max*100)
  })).sort((a,b)=>b.count-a.count)
})

const zodiacStats = computed(() => {
  const ZODIACS=['鼠','牛','虎','兔','龍','蛇','馬','羊','猴','雞','狗','豬']
  const countMap={}
  historyList.value.forEach(item => {
    item.zodiacs.forEach(z => { const c=z.trim(); if(ZODIACS.includes(c)) countMap[c]=(countMap[c]||0)+1 })
  })
  const max=Math.max(...Object.values(countMap),1)
  return ZODIACS.map(z=>({ name:z, count:countMap[z]||0, pct:Math.round((countMap[z]||0)/max*100) }))
    .sort((a,b)=>b.count-a.count)
})

onMounted(() => { loadLatest(); loadHistory() })
</script>

<style scoped>
.lottery-page { padding:14px; display:flex; flex-direction:column; gap:12px; padding-bottom:24px; }
.latest-card { padding:18px 20px; }
.lc-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px; }
.lc-label { font-size:11px; opacity:0.75; color:white; margin-bottom:4px; }
.lc-expect { font-size:16px; font-weight:700; color:white; }
.lc-num { font-size:22px; font-weight:900; }
.lc-time { font-size:11px; opacity:0.75; color:white; text-align:right; }
.balls-row { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
.ball { width:44px; height:44px; border-radius:50%; display:flex; flex-direction:column; align-items:center; justify-content:center; font-size:15px; font-weight:800; color:white; box-shadow:0 2px 8px rgba(0,0,0,0.3); cursor:pointer; }
.ball:active { opacity:0.8; }
.ball-zodiac { font-size:8px; opacity:0.9; line-height:1; margin-top:1px; }
.ball-red { background:linear-gradient(135deg,#dc2626,#b91c1c); }
.ball-blue { background:linear-gradient(135deg,#2563eb,#1d4ed8); }
.ball-green { background:linear-gradient(135deg,#059669,#047857); }
.ball-plus { color:rgba(255,255,255,0.7); font-size:18px; font-weight:700; }
.special-ball { width:48px; height:48px; box-shadow:0 0 0 3px rgba(255,255,255,0.4),0 2px 8px rgba(0,0,0,0.3); }
.balls-loading { color:rgba(255,255,255,0.7); font-size:13px; padding:10px 0; }
.live-card { display:flex; align-items:center; padding:14px 16px; cursor:pointer; gap:12px; }
.live-card:active { background:var(--bg); }
.live-left { display:flex; align-items:center; gap:8px; flex:1; }
.live-dot { width:8px; height:8px; border-radius:50%; background:#dc2626; animation:pulse 1.5s infinite; flex-shrink:0; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
.live-text { font-size:15px; font-weight:700; }
.live-sub { font-size:12px; color:var(--text-muted); }
.type-tabs,.func-tabs { display:flex; gap:6px; }
.type-tab,.func-tab { flex:1; padding:8px; text-align:center; border-radius:10px; font-size:12px; font-weight:600; border:1.5px solid var(--border); color:var(--text-muted); background:var(--card); cursor:pointer; }
.type-tab.active { background:var(--primary); color:white; border-color:var(--primary); }
.func-tab.active { background:var(--primary-light); color:var(--primary); border-color:var(--primary); }
.section-card { padding:16px; }
.section-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
.section-title { font-size:15px; font-weight:700; }
.section-sub { font-size:11px; color:var(--text-muted); }
.mini-loading { display:flex; justify-content:center; padding:20px; }
.mini-empty { text-align:center; color:var(--text-muted); font-size:13px; padding:16px 0; }
.year-tabs { display:flex; gap:4px; }
.year-tab { padding:3px 8px; border-radius:6px; font-size:11px; font-weight:600; color:var(--text-muted); background:var(--bg); cursor:pointer; }
.year-tab.active { background:var(--primary); color:white; }
.history-list { display:flex; flex-direction:column; gap:10px; }
.history-item { padding:10px; background:var(--bg); border-radius:10px; }
.hi-header { display:flex; justify-content:space-between; margin-bottom:8px; }
.hi-expect { font-size:12px; font-weight:700; }
.hi-time { font-size:11px; color:var(--text-muted); }
.hi-balls { display:flex; align-items:center; gap:4px; margin-bottom:6px; }
.hi-ball { width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; color:white; cursor:pointer; }
.hi-plus { color:var(--text-muted); font-size:12px; margin:0 2px; }
.hi-ball.special { width:34px; height:34px; }
.hi-zodiacs { display:flex; gap:4px; flex-wrap:wrap; }
.hi-zodiac { font-size:10px; color:var(--text-muted); background:var(--card); padding:2px 5px; border-radius:4px; }
.tema-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:6px; }
.tema-cell { border-radius:50%; aspect-ratio:1; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; }
.tema-cell:active { opacity:0.7; }
.tema-num { font-size:12px; font-weight:800; color:white; line-height:1; }
.tema-z { font-size:8px; color:rgba(255,255,255,0.85); margin-top:1px; }
.stats-grid { display:flex; flex-direction:column; gap:6px; }
.stat-ball-item { display:flex; align-items:center; gap:8px; }
.stat-ball { width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; color:white; flex-shrink:0; }
.stat-bar-wrap { flex:1; height:6px; background:var(--border); border-radius:3px; overflow:hidden; }
.stat-bar { height:100%; border-radius:3px; }
.stat-count { font-size:12px; font-weight:600; width:24px; text-align:right; flex-shrink:0; }
.zodiac-list { display:flex; flex-direction:column; gap:8px; }
.zodiac-item { display:flex; align-items:center; gap:10px; }
.zodiac-name { font-size:14px; font-weight:700; width:24px; flex-shrink:0; }
.zodiac-bar-wrap { flex:1; height:8px; background:var(--border); border-radius:4px; overflow:hidden; }
.zodiac-bar { height:100%; background:linear-gradient(90deg,var(--primary),#818cf8); border-radius:4px; }
.zodiac-count { font-size:12px; font-weight:600; width:40px; text-align:right; color:var(--text-muted); flex-shrink:0; }
.modal-mask { position:fixed; inset:0; background:rgba(0,0,0,0.6); display:flex; align-items:flex-end; z-index:200; }
.modal-box { width:100%; background:var(--card); border-radius:20px 20px 0 0; max-height:80vh; overflow-y:auto; padding-bottom:20px; }
.modal-header { display:flex; align-items:center; gap:14px; padding:18px 18px 14px; border-bottom:1px solid var(--border); }
.tema-big-ball { width:56px; height:56px; border-radius:50%; display:flex; flex-direction:column; align-items:center; justify-content:center; font-size:18px; font-weight:900; color:white; flex-shrink:0; }
.tema-title { flex:1; }
.tema-main { font-size:17px; font-weight:700; }
.tema-sub { font-size:13px; color:var(--text-muted); margin-top:3px; }
.modal-close { font-size:18px; color:var(--text-muted); background:none; border:none; padding:6px; cursor:pointer; }
.tema-info-grid { display:grid; grid-template-columns:1fr 1fr; padding:14px 18px; }
.ti-item { padding:10px 0; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; }
.ti-item:nth-child(odd) { padding-right:16px; border-right:1px solid var(--border); }
.ti-item:nth-child(even) { padding-left:16px; }
.ti-label { font-size:13px; color:var(--text-muted); }
.ti-val { font-size:13px; font-weight:700; }
.ti-val.red { color:#dc2626; }
.ti-val.blue { color:#2563eb; }
.ti-val.green { color:#059669; }
.tema-history-title { font-size:14px; font-weight:700; padding:12px 18px 8px; }
.tema-history-list { padding:0 18px 20px; display:flex; flex-direction:column; gap:8px; }
.th-item { display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid var(--border); }
.th-item:last-child { border-bottom:none; }
.th-expect { font-size:13px; font-weight:600; flex:1; }
.th-date { font-size:11px; color:var(--text-muted); }
.th-pos { font-size:12px; font-weight:600; color:var(--primary); background:var(--primary-light); padding:2px 8px; border-radius:10px; }
.live-overlay { position:fixed; inset:0; background:#000; z-index:9999; display:flex; flex-direction:column; padding-top:env(safe-area-inset-top,0px); }
.live-header { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; background:#111; flex-shrink:0; }
.live-title { font-size:16px; font-weight:700; color:white; }
.live-close { font-size:20px; color:white; background:none; border:none; padding:4px 8px; cursor:pointer; }
.live-tabs { display:flex; gap:6px; padding:10px 16px; background:#111; flex-shrink:0; }
.live-tab { padding:6px 16px; border-radius:20px; font-size:13px; font-weight:500; color:#aaa; background:#222; cursor:pointer; }
.live-tab.active { background:#dc2626; color:white; }
.live-player { flex:1; background:#000; position:relative; min-height:0; }
.live-video { width:100%; height:100%; object-fit:contain; }
.video-error { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; color:white; font-size:14px; }
.live-info { display:flex; justify-content:space-around; padding:12px 16px; background:#111; color:#aaa; font-size:13px; flex-shrink:0; }
</style>
