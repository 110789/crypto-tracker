<template>
  <div class="overview-page">

    <!-- 恐惧贪婪 -->
    <div class="fng-card gradient-card">
      <div class="fng-top">
        <div class="fng-left">
          <div class="fng-label">市场情绪指数</div>
          <div class="fng-title">恐惧 / 贪婪</div>
          <div class="fng-desc">{{ fng.desc }}</div>
        </div>
        <div class="fng-gauge">
          <svg viewBox="0 0 140 90" class="gauge-svg">
            <path d="M15,75 A55,55 0 0,1 125,75" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="12" stroke-linecap="round"/>
            <path d="M15,75 A55,55 0 0,1 125,75" fill="none" stroke="url(#grad)" stroke-width="12" stroke-linecap="round" :stroke-dasharray="`${fngDash} 200`"/>
            <defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#dc2626"/><stop offset="50%" stop-color="#eab308"/><stop offset="100%" stop-color="#16a34a"/></linearGradient></defs>
            <line :x1="70" :y1="75" :x2="needleX" :y2="needleY" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
            <circle cx="70" cy="75" r="4" fill="white"/>
            <text x="70" y="62" text-anchor="middle" font-size="26" font-weight="900" fill="white">{{ fng.value }}</text>
          </svg>
          <div class="fng-status" :style="{color:fngColor}">{{ fng.label }}</div>
        </div>
      </div>
      <div class="fng-history" v-if="fngHistory.length">
        <span v-for="h in fngHistory" :key="h.label" class="fh-item">
          <span class="fh-label">{{ h.label }}</span>
          <span class="fh-val" :style="{color:fngColorFor(h.value)}">{{ h.value }}</span>
        </span>
      </div>
    </div>

    <!-- 全网数据 -->
    <div class="global-grid">
      <div class="g-card card">
        <div class="g-icon" style="background:rgba(247,147,26,0.15);color:#f7931a;font-weight:900;font-size:18px">₿</div>
        <div class="g-info"><div class="g-label">BTC 市占率</div><div class="g-val">{{ globalData.btcDominance }}</div></div>
      </div>
      <div class="g-card card">
        <div class="g-icon" style="background:rgba(37,99,235,0.1)">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#2563eb" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        </div>
        <div class="g-info"><div class="g-label">加密总市值</div><div class="g-val">{{ globalData.totalMktCap }}</div></div>
      </div>
      <div class="g-card card">
        <div class="g-icon" style="background:rgba(99,102,241,0.1)">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#6366f1" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <div class="g-info"><div class="g-label">24H成交量</div><div class="g-val">{{ globalData.totalVol }}</div></div>
      </div>
      <div class="g-card card">
        <div class="g-icon" style="background:rgba(239,68,68,0.1)">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#ef4444" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        </div>
        <div class="g-info"><div class="g-label">24H涨跌</div><div class="g-val" :class="parseFloat(globalData.mktChange)>=0?'up':'down'">{{ globalData.mktChange }}</div></div>
      </div>
    </div>

    <!-- 涨跌榜 -->
    <div class="section-card card">
      <div class="section-head">
        <span class="section-title">市场排行</span>
        <div class="rank-tabs">
          <span class="rtab" :class="{active:rankTab==='gainer'}" @click="rankTab='gainer'">涨幅</span>
          <span class="rtab" :class="{active:rankTab==='loser'}" @click="rankTab='loser'">跌幅</span>
          <span class="rtab" :class="{active:rankTab==='vol'}" @click="rankTab='vol'">成交</span>
        </div>
      </div>
      <div v-if="loadingRank" class="mini-loading"><div class="spinner"></div></div>
      <div v-else-if="!rankList.length" class="mini-empty">加载中...</div>
      <div v-else class="rank-list">
        <div v-for="(item,i) in rankList" :key="item.instId" class="rank-item" @click="openDetail(item)">
          <span class="rank-num" :class="i<3?'rank-top':''">{{ i+1 }}</span>
          <div class="rank-logo">
            <img v-if="getCoinIcon(item.instId.replace('-USDT',''))" :src="getCoinIcon(item.instId.replace('-USDT',''))" @error="e=>e.target.style.display='none'" />
            <span v-else class="logo-fb" :style="{background:getCoinColor(item.instId.replace('-USDT',''))}">{{ item.instId.replace('-USDT','').slice(0,2) }}</span>
          </div>
          <div class="rank-info">
            <span class="rank-sym">{{ item.instId.replace('-USDT','') }}</span>
            <span class="rank-price">{{ formatPrice(item.last) }}</span>
          </div>
          <div class="rank-right">
            <span class="rank-badge" :class="parseFloat(item.change24h||0)>=0?'badge-up':'badge-down'">{{ formatChange(item.change24h) }}</span>
            <span class="rank-vol">${{ formatVol(item.volCcy24h) }}</span>
          </div>
          <svg class="rank-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>
    </div>



    <!-- 设置 -->
    <div class="section-card card">
      <div class="section-head"><span class="section-title">设置</span></div>
      <div class="settings-item" @click="settings.toggleDark()">
        <div class="si-left">
          <div class="si-icon" style="background:rgba(99,102,241,0.1);color:#6366f1">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          </div>
          <div><div class="si-label">暗色模式</div><div class="si-sub">深色护眼主题</div></div>
        </div>
        <div class="toggle" :class="{on:settings.darkMode}"><div class="toggle-thumb"></div></div>
      </div>
    </div>

    <!-- K线详情弹窗 -->
    <div v-if="detailCoin" class="detail-mask" @click.self="detailCoin=null">
      <div class="detail-box">
        <div class="detail-header">
          <div class="rank-logo">
            <img v-if="getCoinIcon(detailCoin.instId.replace('-USDT',''))" :src="getCoinIcon(detailCoin.instId.replace('-USDT',''))" @error="e=>e.target.style.display='none'" />
            <span v-else class="logo-fb" :style="{background:getCoinColor(detailCoin.instId.replace('-USDT',''))}">{{ detailCoin.instId.replace('-USDT','').slice(0,2) }}</span>
          </div>
          <div class="detail-title">
            <span class="detail-sym">{{ detailCoin.instId.replace('-USDT','') }}/USDT</span>
            <span class="detail-price">{{ formatPrice(detailCoin.last) }}</span>
          </div>
          <button class="detail-close" @click="detailCoin=null">✕</button>
        </div>
        <div class="detail-chart"><CandleChart :instId="detailCoin.instId" /></div>
        <div class="detail-actions">
          <button class="btn btn-ghost" @click="toggleWatchlist(detailCoin.instId)">
            {{ watchlist.has(detailCoin.instId) ? '✓ 已加自选' : '+ 加入自选' }}
          </button>
          <button class="btn btn-primary" @click="detailCoin=null">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useSettingsStore, useWatchlistStore } from '@/stores'
import { formatPrice, formatChange, formatVol, getCoinIcon, getCoinColor, getMarketTopMovers, getOpenInterest } from '@/api/okx'
import CandleChart from '@/components/CandleChart.vue'

const settings = useSettingsStore()
const watchlist = useWatchlistStore()
const rankTab = ref('gainer')
const loadingRank = ref(false)
const loadingOI = ref(false)
const marketMovers = ref([])
const oiList = ref([])
const detailCoin = ref(null)
const fng = ref({ value:'--', label:'加载中', desc:'' })
const fngHistory = ref([])
const globalData = ref({ btcDominance:'--', totalMktCap:'--', totalVol:'--', mktChange:'--' })

function fngColorFor(v) {
  const n=parseInt(v); if(isNaN(n)) return '#94a3b8'
  if(n<=25) return '#dc2626'; if(n<=45) return '#f97316'
  if(n<=55) return '#eab308'; if(n<=75) return '#22c55e'
  return '#16a34a'
}
const fngColor = computed(() => fngColorFor(fng.value.value))
const fngDash = computed(() => { const v=parseInt(fng.value.value); return isNaN(v)?0:(v/100)*172 })
const needleX = computed(() => { const v=parseInt(fng.value.value)||50; const a=Math.PI-(v/100)*Math.PI; return 70+Math.cos(a)*45 })
const needleY = computed(() => { const v=parseInt(fng.value.value)||50; const a=Math.PI-(v/100)*Math.PI; return 75-Math.sin(a)*45 })

const rankList = computed(() => {
  if (!marketMovers.value.length) return []
  const list = [...marketMovers.value]
  if (rankTab.value==='gainer') return list.sort((a,b)=>parseFloat(b.change24h||0)-parseFloat(a.change24h||0)).slice(0,10)
  if (rankTab.value==='loser')  return list.sort((a,b)=>parseFloat(a.change24h||0)-parseFloat(b.change24h||0)).slice(0,10)
  return list.sort((a,b)=>parseFloat(b.volCcy24h||0)-parseFloat(a.volCcy24h||0)).slice(0,10)
})

async function loadFNG() {
  try {
    const res = await fetch('https://api.alternative.me/fng/?limit=3')
    const data = await res.json()
    const d = data.data
    if (d?.[0]) {
      const v=parseInt(d[0].value)
      let label,desc
      if(v<=25){label='极度恐惧';desc='市场极度恐慌，历史上往往是抄底良机'}
      else if(v<=45){label='恐惧';desc='投资者谨慎，市场情绪偏空'}
      else if(v<=55){label='中性';desc='市场情绪平衡，多空博弈'}
      else if(v<=75){label='贪婪';desc='市场乐观，注意控制风险'}
      else{label='极度贪婪';desc='市场过热，警惕回调风险'}
      fng.value={value:d[0].value,label,desc}
      fngHistory.value=[{label:'昨日',value:d[1]?.value||'--'},{label:'上周',value:d[2]?.value||'--'}]
    }
  } catch { fng.value={value:'50',label:'中性',desc:'数据加载失败'} }
}

async function loadGlobalData() {
  try {
    // 用 OKX 现货数据估算全局数据
    const movers = marketMovers.value
    if (!movers.length) return
    const totalVol = movers.reduce((s,t) => s+parseFloat(t.volCcy24h||0), 0)
    // BTC 市值估算（BTC价格 × 流通量约1900万）
    const btc = movers.find(t => t.instId==='BTC-USDT')
    const btcPrice = parseFloat(btc?.last||0)
    const btcMktCap = btcPrice * 19700000
    // 全网市值粗估（BTC历史占比约55%）
    const totalMktCap = btcMktCap > 0 ? btcMktCap / 0.55 : 0
    const btcDom = btcMktCap > 0 && totalMktCap > 0 ? (btcMktCap/totalMktCap*100).toFixed(1)+'%' : '--'
    // 24H涨跌用BTC代替
    const btcChange = btc ? parseFloat(btc.change24h||0)*100 : 0
    globalData.value = {
      btcDominance: btcDom,
      totalMktCap: totalMktCap > 0 ? '$'+formatVol(totalMktCap) : '--',
      totalVol: '$'+formatVol(totalVol),
      mktChange: btcChange !== 0 ? `${btcChange>=0?'+':''}${btcChange.toFixed(2)}%` : '--'
    }
  } catch(e) { console.error('loadGlobalData:', e) }
}

async function loadMarket() {
  loadingRank.value = true
  try {
    marketMovers.value = await getMarketTopMovers(100)
    loadGlobalData()
  } finally { loadingRank.value = false }
}

async function loadOI() {
  loadingOI.value = true
  try {
    const swaps = ['BTC-USDT-SWAP','ETH-USDT-SWAP','SOL-USDT-SWAP','BNB-USDT-SWAP','XRP-USDT-SWAP']
    const results = await Promise.all(swaps.map(async id => {
      const baseCcy = id.replace('-USDT-SWAP','')
      const d = await getOpenInterest(baseCcy)
      // 优先用 USD 计价，其次币本位，最后张数
      const oi = parseFloat(d?.oiUsd||d?.oiCcy||d?.oi||0)
      return { instId:id, oi }
    }))
    const maxOI = Math.max(...results.map(r=>r.oi),1)
    oiList.value = results.sort((a,b)=>b.oi-a.oi).map(r=>({
      instId:r.instId, oiFormatted:formatVol(r.oi), pct:Math.round(r.oi/maxOI*100)
    }))
  } finally { loadingOI.value = false }
}

function openDetail(item) { detailCoin.value = item }
function toggleWatchlist(instId) { watchlist.has(instId)?watchlist.remove(instId):watchlist.add(instId) }

watch(() => settings.darkMode, dark => {
  document.documentElement.setAttribute('data-theme', dark?'dark':'')
}, { immediate:true })

onMounted(() => { loadFNG(); loadMarket(); loadOI() })
</script>

<style scoped>
.overview-page { padding:14px; display:flex; flex-direction:column; gap:12px; padding-bottom:20px; }
.fng-card { padding:18px 20px; }
.fng-top { display:flex; justify-content:space-between; align-items:flex-start; gap:10px; }
.fng-left { flex:1; }
.fng-label { font-size:11px; opacity:0.7; margin-bottom:4px; color:white; }
.fng-title { font-size:20px; font-weight:800; color:white; margin-bottom:6px; }
.fng-desc { font-size:12px; opacity:0.75; color:white; line-height:1.5; }
.fng-gauge { text-align:center; flex-shrink:0; }
.gauge-svg { width:130px; height:80px; }
.fng-status { font-size:13px; font-weight:700; margin-top:-6px; }
.fng-history { display:flex; gap:16px; margin-top:14px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.15); }
.fh-item { display:flex; align-items:center; gap:6px; }
.fh-label { font-size:11px; opacity:0.6; color:white; }
.fh-val { font-size:14px; font-weight:700; }
.global-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.g-card { display:flex; align-items:center; gap:12px; padding:14px; }
.g-icon { width:40px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.g-label { font-size:11px; color:var(--text-muted); margin-bottom:3px; }
.g-val { font-size:15px; font-weight:700; }
.section-card { padding:16px; }
.section-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
.section-title { font-size:15px; font-weight:700; }
.section-sub { font-size:12px; color:var(--text-muted); }
.mini-loading { display:flex; justify-content:center; padding:20px; }
.mini-empty { text-align:center; color:var(--text-muted); font-size:13px; padding:16px 0; }
.rank-tabs { display:flex; gap:4px; }
.rtab { padding:4px 12px; border-radius:20px; font-size:12px; font-weight:500; color:var(--text-muted); background:var(--bg); cursor:pointer; }
.rtab.active { background:var(--primary); color:white; }
.rank-list { display:flex; flex-direction:column; }
.rank-item { display:flex; align-items:center; gap:10px; padding:10px 4px; border-bottom:1px solid var(--border); cursor:pointer; }
.rank-item:last-child { border-bottom:none; }
.rank-item:active { background:var(--bg); }
.rank-num { width:20px; font-size:13px; font-weight:700; color:var(--text-muted); text-align:center; flex-shrink:0; }
.rank-top { color:var(--primary); }
.rank-logo { width:34px; height:34px; border-radius:50%; overflow:hidden; background:var(--bg); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.rank-logo img { width:100%; height:100%; object-fit:cover; }
.logo-fb { width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; font-size:10px; font-weight:700; flex-shrink:0; }
.rank-info { flex:1; }
.rank-sym { font-size:14px; font-weight:700; display:block; }
.rank-price { font-size:11px; color:var(--text-muted); }
.rank-right { text-align:right; }
.rank-badge { font-size:12px; font-weight:600; padding:3px 8px; border-radius:6px; display:block; }
.badge-up { background:rgba(220,38,38,0.1); color:#dc2626; }
.badge-down { background:rgba(5,150,105,0.1); color:#059669; }
.rank-vol { font-size:10px; color:var(--text-muted); display:block; margin-top:2px; }
.rank-arrow { width:14px; height:14px; color:var(--text-muted); flex-shrink:0; }
.oi-list { display:flex; flex-direction:column; gap:12px; }
.oi-item { display:flex; align-items:center; gap:10px; }
.oi-info { flex:1; }
.oi-sym { font-size:13px; font-weight:600; display:block; margin-bottom:5px; }
.oi-bar-wrap { height:5px; background:var(--border); border-radius:3px; overflow:hidden; }
.oi-bar { height:100%; background:linear-gradient(90deg,#2563eb,#818cf8); border-radius:3px; }
.oi-val { font-size:13px; font-weight:700; flex-shrink:0; min-width:54px; text-align:right; }
.settings-item { display:flex; align-items:center; justify-content:space-between; padding:12px 0; cursor:pointer; }
.si-left { display:flex; align-items:center; gap:12px; }
.si-icon { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; }
.si-label { font-size:14px; font-weight:600; }
.si-sub { font-size:11px; color:var(--text-muted); }
.toggle { width:44px; height:24px; background:var(--border); border-radius:12px; position:relative; transition:background 0.2s; }
.toggle.on { background:var(--primary); }
.toggle-thumb { width:18px; height:18px; background:white; border-radius:50%; position:absolute; top:3px; left:3px; transition:transform 0.2s; box-shadow:0 1px 4px rgba(0,0,0,0.2); }
.toggle.on .toggle-thumb { transform:translateX(20px); }
.detail-mask { position:fixed; inset:0; background:rgba(0,0,0,0.6); display:flex; align-items:flex-end; z-index:200; }
.detail-box { width:100%; background:var(--card); border-radius:20px 20px 0 0; max-height:88vh; overflow-y:auto; padding-bottom:var(--safe-bottom); }
.detail-header { display:flex; align-items:center; gap:12px; padding:18px 18px 12px; border-bottom:1px solid var(--border); }
.detail-title { flex:1; }
.detail-sym { font-size:16px; font-weight:700; display:block; }
.detail-price { font-size:14px; color:var(--text-muted); }
.detail-close { font-size:18px; color:var(--text-muted); background:none; border:none; padding:6px 8px; cursor:pointer; }
.detail-chart { padding:14px; }
.detail-actions { display:flex; gap:10px; padding:12px 18px 20px; }
.detail-actions .btn { flex:1; padding:13px; }
</style>
