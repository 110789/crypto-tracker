<template>
  <div class="market-page">


    <div class="summary-card gradient-card">
      <div class="summary-top">
        <div>
          <div class="s-label">自选总值</div>
          <div class="s-value">{{ totalValue }} <span class="s-unit">USDT</span></div>
        </div>
        <div class="ws-pill" :class="wsConnected ? 'live' : 'off'">
          <span class="dot"></span>{{ wsConnected ? '实时' : '连接中' }}
        </div>
      </div>
      <div class="summary-stats">
        <div class="stat-item"><span class="stat-label">自选数量</span><span class="stat-val">{{ watchlist.list.length }}</span></div>
        <div class="stat-div"></div>
        <div class="stat-item"><span class="stat-label">市场最强</span><span class="stat-val gainer">{{ marketTop.gainer }}</span></div>
        <div class="stat-div"></div>
        <div class="stat-item"><span class="stat-label">市场最弱</span><span class="stat-val loser">{{ marketTop.loser }}</span></div>
      </div>
    </div>

    <div v-if="loading" class="loading"><div class="spinner"></div><span>加载中...</span></div>
    <div v-else-if="error" class="error-box">
      ❌ {{ error }}
      <button class="btn btn-primary" style="margin-top:10px;width:100%" @click="loadTickers">重试</button>
    </div>
    <div v-else-if="watchlist.list.length === 0" class="empty">
      <span class="icon">📭</span>
      <span class="text">还没有自选币种</span>
      <button class="btn btn-primary" style="margin-top:14px" @click="$router.push('/search')">去添加</button>
    </div>

    <div v-else>
      <div class="sort-bar">
        <span class="sort-label">币种</span>
        <span class="sort-btn" :class="{ active: sortKey==='change' }" @click="toggleSort('change')">涨跌幅 {{ sortKey==='change'?(sortAsc?'↑':'↓'):'↕' }}</span>
        <span class="sort-btn" :class="{ active: sortKey==='price' }" @click="toggleSort('price')">价格 {{ sortKey==='price'?(sortAsc?'↑':'↓'):'↕' }}</span>
      </div>

      <div class="coin-list">
        <div v-for="ticker in sortedTickers" :key="ticker.instId" class="coin-card card">
          <div class="coin-header" @click="toggleExpand(ticker.instId)">
            <div class="coin-logo-wrap">
              <img v-if="getCoinIcon(ticker.instId.replace('-USDT',''))"
                :src="getCoinIcon(ticker.instId.replace('-USDT',''))"
                class="coin-img"
                @error="e=>e.target.style.display='none'" />
              <div class="logo-fb" :style="{ background: getCoinColor(ticker.instId.replace('-USDT','')) }">
                {{ ticker.instId.replace('-USDT','').slice(0,2) }}
              </div>
            </div>
            <div class="coin-info">
              <div class="coin-symbol">{{ ticker.instId.replace('-USDT','') }}</div>
              <div class="coin-vol">{{ formatVol(ticker.vol24h) }} · 24H量</div>
            </div>
            <div class="coin-right">
              <div class="coin-price">{{ formatPrice(ticker.last) }}</div>
              <div class="coin-badge" :class="parseFloat(ticker.change24h||0)>=0?'badge-up':'badge-down'">
                {{ formatChange(ticker.change24h) }}
              </div>
            </div>
            <span class="expand-icon">{{ expanded===ticker.instId?'▲':'▼' }}</span>
          </div>

          <div v-if="expanded===ticker.instId" class="chart-section">
            <div class="price-range">
              <span class="range-item"><span class="range-lbl">最高</span><span class="up">{{ formatPrice(ticker.high24h) }}</span></span>
              <span class="range-item"><span class="range-lbl">最低</span><span class="down">{{ formatPrice(ticker.low24h) }}</span></span>
              <span class="range-item"><span class="range-lbl">成交额</span><span>${{ formatVol(ticker.volCcy24h) }}</span></span>
            </div>
            <CandleChart :instId="ticker.instId" />
          </div>

          <button class="remove-btn" @click.stop="removeFromWatchlist(ticker.instId)">×</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useWatchlistStore, useAlertStore } from '@/stores'
import { getTickers, getMarketTopMovers, okxWs, formatPrice, formatChange, formatVol, getCoinIcon, getCoinColor } from '@/api/okx'
import CandleChart from '@/components/CandleChart.vue'

const watchlist = useWatchlistStore()
const alertStore = useAlertStore()
const tickers = ref([])
const tickerMap = ref({})
const loading = ref(false)
const error = ref('')

const expanded = ref(null)
const wsConnected = ref(false)
const sortKey = ref('none')
const sortAsc = ref(false)
const marketTop = ref({ gainer: '--', loser: '--' })

const sortedTickers = computed(() => {
  const list = [...tickers.value]
  if (sortKey.value === 'change') list.sort((a,b) => (parseFloat(a.change24h||0)-parseFloat(b.change24h||0))*(sortAsc.value?1:-1))
  else if (sortKey.value === 'price') list.sort((a,b) => (parseFloat(a.last||0)-parseFloat(b.last||0))*(sortAsc.value?1:-1))
  return list
})

function toggleSort(key) {
  if (sortKey.value === key) sortAsc.value = !sortAsc.value
  else { sortKey.value = key; sortAsc.value = false }
}

const totalValue = computed(() => {
  const t = Object.values(tickerMap.value).reduce((s,t) => s+parseFloat(t.last||0), 0)
  return t > 0 ? t.toLocaleString('zh-CN',{maximumFractionDigits:2}) : '--'
})

async function loadMarketTop() {
  try {
    const movers = await getMarketTopMovers(50)
    if (!movers.length) return
    const sorted = [...movers].sort((a,b) => parseFloat(b.change24h||0)-parseFloat(a.change24h||0))
    const top = sorted[0], bot = sorted[sorted.length-1]
    marketTop.value = {
      gainer: `${top.instId.replace('-USDT','')} ${(parseFloat(top.change24h)*100).toFixed(2)}%`,
      loser:  `${bot.instId.replace('-USDT','')} ${(parseFloat(bot.change24h)*100).toFixed(2)}%`
    }
  } catch(e) { console.error('loadMarketTop:', e) }
}

async function loadTickers() {
  if (!watchlist.list.length) { loading.value = false; return }
  loading.value = tickers.value.length === 0
  error.value = ''
  try {
    const data = await getTickers(watchlist.list)
    if (data.length > 0) {
      data.forEach(t => { tickerMap.value[t.instId] = t })
      tickers.value = watchlist.list.map(id => tickerMap.value[id]).filter(Boolean)
    } else {
      error.value = '接口返回空数据，请检查网络或反代配置'
    }
  } catch(e) {
    error.value = `请求失败: ${e.message}`

  } finally {
    loading.value = false
  }
}

const wsCallbacks = new Map()
function subscribeAll() {
  watchlist.list.forEach(instId => {
    if (wsCallbacks.has(instId)) return
    const cb = (t) => {
      tickerMap.value[instId] = { ...tickerMap.value[instId], ...t }
      const idx = tickers.value.findIndex(x => x.instId === instId)
      if (idx !== -1) tickers.value[idx] = { ...tickers.value[idx], ...t }
      wsConnected.value = true
      alertStore.checkAlerts({ [instId]: t.last })
    }
    wsCallbacks.set(instId, cb); okxWs.subscribe(instId, cb)
  })
}
function unsubAll() { wsCallbacks.forEach((cb,id) => okxWs.unsubscribe(id,cb)); wsCallbacks.clear() }
function toggleExpand(instId) { expanded.value = expanded.value===instId ? null : instId }
function removeFromWatchlist(instId) {
  const cb = wsCallbacks.get(instId)
  if (cb) { okxWs.unsubscribe(instId,cb); wsCallbacks.delete(instId) }
  watchlist.remove(instId)
  tickers.value = tickers.value.filter(t => t.instId!==instId)
  delete tickerMap.value[instId]
}

watch(() => watchlist.list.length, () => { loadTickers(); unsubAll(); subscribeAll() })
onMounted(async () => { await loadTickers(); loadMarketTop(); okxWs.connect(); subscribeAll() })
onUnmounted(unsubAll)
</script>

<style scoped>
.market-page { padding:14px; display:flex; flex-direction:column; gap:10px; padding-bottom:16px; }


.error-box { background:#fef2f2; border:1px solid #fecaca; border-radius:12px; padding:16px; font-size:13px; color:#dc2626; text-align:center; }

.summary-card { padding:18px 20px; }
.summary-top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px; }
.s-label { font-size:12px; opacity:0.75; margin-bottom:4px; color:white; }
.s-value { font-size:30px; font-weight:700; letter-spacing:-0.5px; color:white; }
.s-unit { font-size:13px; font-weight:400; opacity:0.8; }
.ws-pill { display:flex; align-items:center; gap:5px; font-size:12px; font-weight:600; padding:5px 12px; background:rgba(255,255,255,0.15); border-radius:20px; color:white; }
.ws-pill .dot { width:6px; height:6px; border-radius:50%; }
.ws-pill.live .dot { background:#86efac; box-shadow:0 0 6px #86efac; }
.ws-pill.off .dot { background:rgba(255,255,255,0.4); }
.summary-stats { display:flex; align-items:center; padding-top:14px; border-top:1px solid rgba(255,255,255,0.15); }
.stat-item { flex:1; text-align:center; }
.stat-div { width:1px; height:28px; background:rgba(255,255,255,0.2); }
.stat-label { font-size:10px; opacity:0.7; display:block; margin-bottom:3px; color:white; }
.stat-val { font-size:12px; font-weight:600; color:white; }
.stat-val.gainer { color:#fca5a5; }
.stat-val.loser  { color:#86efac; }

.sort-bar { display:flex; align-items:center; gap:6px; }
.sort-label { font-size:12px; color:var(--text-muted); flex:1; }
.sort-btn { font-size:12px; color:var(--text-secondary); font-weight:500; padding:5px 10px; border-radius:8px; background:var(--card); cursor:pointer; border:1px solid var(--border); }
.sort-btn.active { background:var(--primary-light); color:var(--primary); border-color:var(--primary); }

.coin-list { display:flex; flex-direction:column; gap:8px; }
.coin-card { overflow:hidden; position:relative; }
.coin-header { display:flex; align-items:center; gap:10px; padding:13px 40px 13px 13px; cursor:pointer; }
.coin-header:active { background:var(--bg); }

.coin-logo-wrap { width:42px; height:42px; border-radius:50%; flex-shrink:0; position:relative; overflow:hidden; background:var(--bg); }
.coin-img { position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; z-index:2; }
.logo-fb { position:absolute; top:0; left:0; width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:white; font-size:12px; font-weight:700; z-index:1; }

.coin-info { flex:1; min-width:0; }
.coin-symbol { font-size:15px; font-weight:700; }
.coin-vol { font-size:11px; color:var(--text-muted); margin-top:2px; }
.coin-right { text-align:right; flex-shrink:0; }
.coin-price { font-size:15px; font-weight:700; letter-spacing:-0.3px; }
.coin-badge { font-size:12px; font-weight:600; margin-top:4px; padding:2px 8px; border-radius:6px; display:inline-block; }
.badge-up { background:rgba(220,38,38,0.1); color:#dc2626; }
.badge-down { background:rgba(5,150,105,0.1); color:#059669; }
.expand-icon { font-size:9px; color:var(--text-muted); position:absolute; right:12px; top:50%; transform:translateY(-50%); }

.chart-section { padding:10px 13px 14px; border-top:1px solid var(--border); }
.price-range { display:flex; margin-bottom:10px; padding-bottom:8px; border-bottom:1px solid var(--border); }
.range-item { flex:1; text-align:center; display:flex; flex-direction:column; gap:2px; }
.range-lbl { font-size:10px; color:var(--text-muted); }
.range-item span:last-child { font-size:12px; font-weight:600; }
.remove-btn { position:absolute; top:9px; right:8px; background:none; border:none; color:var(--text-muted); font-size:20px; cursor:pointer; padding:4px 6px; border-radius:4px; line-height:1; }
</style>
