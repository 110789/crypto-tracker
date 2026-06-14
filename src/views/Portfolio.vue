<template>
  <div class="portfolio-page">
    <!-- 总资产卡片 -->
    <div class="summary-card gradient-card">
      <div class="summary-row">
        <div>
          <div class="s-label">总持仓市值</div>
          <div class="s-value">{{ totalMarketValue }} <span class="s-unit">USDT</span></div>
        </div>
        <div class="s-right">
          <div class="s-label">总成本</div>
          <div class="s-cost">{{ totalCostFmt }}</div>
        </div>
      </div>
      <div class="pnl-row">
        <div class="pnl-item">
          <span class="pnl-label">总盈亏</span>
          <span class="pnl-val" :class="totalPnlClass">{{ totalPnlFmt }}</span>
        </div>
        <div class="pnl-divider"></div>
        <div class="pnl-item">
          <span class="pnl-label">收益率</span>
          <span class="pnl-val" :class="totalPnlClass">{{ totalPnlRateFmt }}</span>
        </div>
        <div class="pnl-divider"></div>
        <div class="pnl-item">
          <span class="pnl-label">持仓数</span>
          <span class="pnl-val">{{ portfolio.positions.length }}</span>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="action-row">
      <button class="btn btn-buy" @click="openAdd('buy')">📈 买入/做多</button>
      <button class="btn btn-sell" @click="openAdd('sell')">📉 卖出/做空</button>
    </div>

    <!-- 持仓列表 -->
    <div v-if="portfolio.positions.length === 0" class="empty">
      <div class="empty-icon">💼</div>
      <div class="empty-text">还没有持仓记录</div>
      <div class="empty-sub">点击上方按钮添加</div>
    </div>

    <div v-else>
      <!-- 筛选Tab -->
      <div class="filter-tabs">
        <span class="ftab" :class="{ active: filterType === 'all' }" @click="filterType = 'all'">全部</span>
        <span class="ftab" :class="{ active: filterType === 'buy' }" @click="filterType = 'buy'">做多</span>
        <span class="ftab" :class="{ active: filterType === 'sell' }" @click="filterType = 'sell'">做空</span>
      </div>

      <div class="pos-list">
        <div v-for="pos in filteredPositions" :key="pos.id" class="pos-card card">
          <!-- 头部 -->
          <div class="pos-header" @click="toggleExpand(pos.id)">
            <div class="pos-logo">
              <img v-if="getCoinIcon(pos.baseCcy)" :src="getCoinIcon(pos.baseCcy)" :alt="pos.baseCcy" @error="e => e.target.style.display='none'" />
              <span v-else class="logo-text">{{ pos.baseCcy?.slice(0,2) }}</span>
            </div>
            <div class="pos-info">
              <div class="pos-title">
                <span class="pos-symbol">{{ pos.baseCcy }}/USDT</span>
                <span class="pos-tag" :class="pos.side === 'buy' ? 'tag-long' : 'tag-short'">
                  {{ pos.side === 'buy' ? '做多' : '做空' }}
                </span>
                <span class="pos-type-tag">{{ pos.contractType === 'swap' ? '永续' : '现货' }}</span>
              </div>
              <div class="pos-sub">{{ pos.amount }} 张 · 开仓 {{ formatPrice(pos.buyPrice) }}</div>
            </div>
            <div class="pos-right">
              <div class="pos-cur">{{ tickerMap[pos.instId] ? formatPrice(tickerMap[pos.instId].last) : '--' }}</div>
              <div class="pos-pnl" :class="pnlClass(pos)">{{ calcPnlStr(pos) }}</div>
            </div>
            <span class="exp-icon">{{ expanded === pos.id ? '▲' : '▼' }}</span>
          </div>

          <!-- 展开详情+走势图 -->
          <div v-if="expanded === pos.id" class="pos-detail">
            <div class="detail-grid">
              <div class="d-item">
                <span class="d-label">持仓数量</span>
                <span class="d-val">{{ pos.amount }}</span>
              </div>
              <div class="d-item">
                <span class="d-label">开仓均价</span>
                <span class="d-val">{{ formatPrice(pos.buyPrice) }}</span>
              </div>
              <div class="d-item">
                <span class="d-label">当前价格</span>
                <span class="d-val">{{ tickerMap[pos.instId] ? formatPrice(tickerMap[pos.instId].last) : '--' }}</span>
              </div>
              <div class="d-item">
                <span class="d-label">持仓市值</span>
                <span class="d-val">{{ calcMarketValue(pos) }} USDT</span>
              </div>
              <div class="d-item">
                <span class="d-label">浮动盈亏</span>
                <span class="d-val" :class="pnlClass(pos)">{{ calcPnlStr(pos) }}</span>
              </div>
              <div class="d-item">
                <span class="d-label">收益率</span>
                <span class="d-val" :class="pnlClass(pos)">{{ calcPnlRate(pos) }}</span>
              </div>
            </div>
            <CandleChart :instId="pos.instId" />
            <button class="close-btn" @click="portfolio.removePosition(pos.id)">平仓/删除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加持仓弹窗 -->
    <div v-if="showAdd" class="modal-mask" @click.self="showAdd = false">
      <div class="modal-box">
        <div class="modal-header">
          <span class="modal-title" :class="addSide === 'buy' ? 'title-buy' : 'title-sell'">
            {{ addSide === 'buy' ? '📈 买入 / 做多' : '📉 卖出 / 做空' }}
          </span>
          <span class="modal-close" @click="showAdd = false">✕</span>
        </div>

        <div class="modal-body">
          <!-- 合约类型 -->
          <div class="form-group">
            <label>类型</label>
            <div class="radio-group">
              <span class="radio-btn" :class="{ active: form.contractType === 'swap' }" @click="form.contractType = 'swap'; updateInstId()">永续合约</span>
              <span class="radio-btn" :class="{ active: form.contractType === 'spot' }" @click="form.contractType = 'spot'; updateInstId()">现货</span>
            </div>
          </div>

          <div class="form-group">
            <label>搜索币种</label>
            <div class="input-wrap">
              <input v-model="form.keyword" placeholder="如 BTC、ETH..." @input="onSearchCoin" />
              <div v-if="coinResults.length > 0" class="dropdown">
                <div v-for="c in coinResults" :key="c.instId" class="dropdown-item" @click="selectCoin(c)">
                  <span class="di-id">{{ c.instId }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="form-row-2">
            <div class="form-group">
              <label>开仓均价 (USDT)</label>
              <input v-model="form.buyPrice" type="number" placeholder="0.00" />
            </div>
            <div class="form-group">
              <label>数量{{ form.contractType === 'swap' ? '(张)' : '' }}</label>
              <input v-model="form.amount" type="number" placeholder="0" />
            </div>
          </div>

          <div v-if="form.contractType === 'swap'" class="form-group">
            <label>杠杆倍数</label>
            <div class="leverage-row">
              <span v-for="lv in [1,2,3,5,10,20,50,100]" :key="lv"
                class="lv-btn" :class="{ active: form.leverage == lv }"
                @click="form.leverage = lv">{{ lv }}x</span>
            </div>
          </div>

          <div class="cost-preview" v-if="form.buyPrice && form.amount">
            <span>总成本</span>
            <span class="cost-val">{{ calcCost() }} USDT</span>
            <span v-if="form.contractType === 'swap'" class="cost-margin">保证金 {{ calcMargin() }} USDT</span>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-ghost" @click="showAdd = false">取消</button>
          <button class="btn" :class="addSide === 'buy' ? 'btn-buy' : 'btn-sell'" @click="submitAdd">
            确认{{ addSide === 'buy' ? '买入' : '卖出' }}
          </button>
        </div>
      </div>
    </div>

    <transition name="toast">
      <div v-if="toastMsg" class="toast">{{ toastMsg }}</div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { usePortfolioStore } from '@/stores'
import { getTickers, okxWs, searchCoins, formatPrice, getCoinIcon } from '@/api/okx'
import CandleChart from '@/components/CandleChart.vue'

const portfolio = usePortfolioStore()
const showAdd = ref(false)
const addSide = ref('buy')
const toastMsg = ref('')
const tickerMap = ref({})
const expanded = ref(null)
const filterType = ref('all')

const form = ref({ keyword: '', instId: '', baseCcy: '', contractType: 'swap', buyPrice: '', amount: '', leverage: 10 })
const coinResults = ref([])

const filteredPositions = computed(() => {
  if (filterType.value === 'all') return portfolio.positions
  return portfolio.positions.filter(p => p.side === filterType.value)
})

// 盈亏计算
function calcPnl(pos) {
  const cur = parseFloat(tickerMap.value[pos.instId]?.last || 0)
  if (!cur) return 0
  const diff = pos.side === 'buy' ? cur - pos.buyPrice : pos.buyPrice - cur
  return diff * pos.amount
}
function calcPnlStr(pos) {
  const pnl = calcPnl(pos)
  if (!tickerMap.value[pos.instId]) return '--'
  return `${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} USDT`
}
function calcPnlRate(pos) {
  const pnl = calcPnl(pos)
  const cost = pos.buyPrice * pos.amount
  if (!cost) return '--'
  const rate = (pnl / cost) * 100 * (pos.leverage || 1)
  return `${rate >= 0 ? '+' : ''}${rate.toFixed(2)}%`
}
function calcMarketValue(pos) {
  const cur = parseFloat(tickerMap.value[pos.instId]?.last || 0)
  return (cur * pos.amount).toFixed(2)
}
function pnlClass(pos) {
  const pnl = calcPnl(pos)
  if (!tickerMap.value[pos.instId]) return 'flat'
  return pnl > 0 ? 'up' : pnl < 0 ? 'down' : 'flat'
}

const totalMarketValue = computed(() => {
  const t = portfolio.positions.reduce((s, p) => {
    const cur = parseFloat(tickerMap.value[p.instId]?.last || 0)
    return s + cur * p.amount
  }, 0)
  return t > 0 ? t.toFixed(2) : '--'
})
const totalCostFmt = computed(() => portfolio.totalCost.toFixed(2) + ' USDT')
const totalPnl = computed(() => {
  const mv = parseFloat(totalMarketValue.value) || 0
  return mv - portfolio.totalCost
})
const totalPnlFmt = computed(() => {
  if (!parseFloat(totalMarketValue.value)) return '--'
  return `${totalPnl.value >= 0 ? '+' : ''}${totalPnl.value.toFixed(2)} USDT`
})
const totalPnlRateFmt = computed(() => {
  const cost = portfolio.totalCost
  if (!cost || !parseFloat(totalMarketValue.value)) return '--'
  return `${totalPnl.value >= 0 ? '+' : ''}${(totalPnl.value / cost * 100).toFixed(2)}%`
})
const totalPnlClass = computed(() => totalPnl.value > 0 ? 'up' : totalPnl.value < 0 ? 'down' : 'flat')

// 表单
function calcCost() { return (parseFloat(form.value.buyPrice||0) * parseFloat(form.value.amount||0)).toFixed(2) }
function calcMargin() { return (parseFloat(calcCost()) / (form.value.leverage||1)).toFixed(2) }

function updateInstId() {
  if (!form.value.baseCcy) return
  form.value.instId = form.value.contractType === 'swap'
    ? `${form.value.baseCcy}-USDT-SWAP`
    : `${form.value.baseCcy}-USDT`
}

let searchTimer = null
async function onSearchCoin() {
  if (!form.value.keyword.trim()) { coinResults.value = []; return }
  clearTimeout(searchTimer)
  searchTimer = setTimeout(async () => {
    const results = await searchCoins(form.value.keyword)
    coinResults.value = results
  }, 300)
}

function selectCoin(c) {
  form.value.baseCcy = c.baseCcy
  form.value.keyword = c.baseCcy
  form.value.contractType === 'swap'
    ? form.value.instId = `${c.baseCcy}-USDT-SWAP`
    : form.value.instId = c.instId
  coinResults.value = []
}

function showToast(msg) { toastMsg.value = msg; setTimeout(() => { toastMsg.value = '' }, 2000) }

function openAdd(side) { addSide.value = side; form.value = { keyword: '', instId: '', baseCcy: '', contractType: 'swap', buyPrice: '', amount: '', leverage: 10 }; showAdd.value = true }

function submitAdd() {
  if (!form.value.instId) { showToast('请选择币种'); return }
  if (!form.value.buyPrice || parseFloat(form.value.buyPrice) <= 0) { showToast('请输入开仓均价'); return }
  if (!form.value.amount || parseFloat(form.value.amount) <= 0) { showToast('请输入数量'); return }
  portfolio.addPosition({
    instId: form.value.instId, baseCcy: form.value.baseCcy,
    buyPrice: form.value.buyPrice, amount: form.value.amount,
    side: addSide.value, contractType: form.value.contractType,
    leverage: form.value.contractType === 'swap' ? form.value.leverage : 1
  })
  showAdd.value = false; showToast('添加成功 ✓')
  loadPrices()
}

function toggleExpand(id) { expanded.value = expanded.value === id ? null : id }

// WebSocket
const wsCallbacks = new Map()
function subscribeAll() {
  portfolio.positions.forEach(pos => {
    if (wsCallbacks.has(pos.instId)) return
    const cb = (t) => { tickerMap.value[pos.instId] = { ...tickerMap.value[pos.instId], ...t } }
    wsCallbacks.set(pos.instId, cb); okxWs.subscribe(pos.instId, cb)
  })
}
function unsubAll() { wsCallbacks.forEach((cb, id) => okxWs.unsubscribe(id, cb)); wsCallbacks.clear() }

async function loadPrices() {
  const ids = [...new Set(portfolio.positions.map(p => p.instId))]
  if (!ids.length) return
  // 现货和合约分开请求
  const spotIds = ids.filter(id => !id.endsWith('-SWAP'))
  const swapIds = ids.filter(id => id.endsWith('-SWAP'))
  const fetches = []
  spotIds.forEach(id => fetches.push(fetch(`https://www.okx.com/api/v5/market/ticker?instId=${id}`).then(r => r.json()).then(d => d.data?.[0]).catch(() => null)))
  swapIds.forEach(id => fetches.push(fetch(`https://www.okx.com/api/v5/market/ticker?instId=${id}`).then(r => r.json()).then(d => d.data?.[0]).catch(() => null)))
  const results = await Promise.all(fetches)
  results.filter(Boolean).forEach(t => { tickerMap.value[t.instId] = t })
}

onMounted(async () => { await loadPrices(); okxWs.connect(); subscribeAll() })
onUnmounted(unsubAll)
</script>

<style scoped>
.portfolio-page { padding: 14px; display: flex; flex-direction: column; gap: 12px; padding-bottom: 20px; }

.summary-card { padding: 20px; }
.summary-row { display: flex; justify-content: space-between; margin-bottom: 14px; }
.s-label { font-size: 11px; opacity: 0.7; margin-bottom: 4px; }
.s-value { font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
.s-unit { font-size: 13px; font-weight: 400; opacity: 0.8; }
.s-right { text-align: right; }
.s-cost { font-size: 16px; font-weight: 600; color: white; }

.pnl-row { display: flex; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.15); }
.pnl-item { flex: 1; text-align: center; }
.pnl-divider { width: 1px; background: rgba(255,255,255,0.2); }
.pnl-label { font-size: 10px; opacity: 0.7; display: block; margin-bottom: 3px; }
.pnl-val { font-size: 13px; font-weight: 700; color: white; }
.pnl-val.up { color: #fca5a5; }
.pnl-val.down { color: #86efac; }

.action-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.btn-buy { background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 14px; font-size: 15px; border-radius: 12px; width: 100%; box-shadow: 0 3px 12px rgba(220,38,38,0.3); }
.btn-sell { background: linear-gradient(135deg, #059669, #047857); color: white; padding: 14px; font-size: 15px; border-radius: 12px; width: 100%; box-shadow: 0 3px 12px rgba(5,150,105,0.3); }

.filter-tabs { display: flex; gap: 6px; }
.ftab { padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 500; color: var(--text-muted); background: var(--card); border: 1px solid var(--border); cursor: pointer; }
.ftab.active { background: var(--primary); color: white; border-color: var(--primary); }

.pos-list { display: flex; flex-direction: column; gap: 10px; }

.pos-card { overflow: hidden; }
.pos-header { display: flex; align-items: center; gap: 10px; padding: 14px; cursor: pointer; }
.pos-header:active { background: var(--bg); }

.pos-logo { width: 42px; height: 42px; border-radius: 50%; overflow: hidden; background: linear-gradient(135deg, #2563eb, #1d4ed8); display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1.5px solid var(--border); }
.pos-logo img { width: 100%; height: 100%; object-fit: cover; }
.logo-text { color: white; font-size: 11px; font-weight: 700; }

.pos-info { flex: 1; min-width: 0; }
.pos-title { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
.pos-symbol { font-size: 15px; font-weight: 700; }
.pos-tag { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
.tag-long { background: rgba(220,38,38,0.1); color: #dc2626; }
.tag-short { background: rgba(5,150,105,0.1); color: #059669; }
.pos-type-tag { font-size: 10px; color: var(--text-muted); background: var(--bg); padding: 2px 6px; border-radius: 4px; }
.pos-sub { font-size: 11px; color: var(--text-muted); margin-top: 3px; }

.pos-right { text-align: right; flex-shrink: 0; }
.pos-cur { font-size: 15px; font-weight: 700; }
.pos-pnl { font-size: 12px; font-weight: 600; margin-top: 3px; }

.exp-icon { font-size: 9px; color: var(--text-muted); flex-shrink: 0; }

.pos-detail { padding: 0 14px 14px; border-top: 1px solid var(--border); }

.detail-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; padding: 12px 0; }
.d-item { display: flex; flex-direction: column; gap: 3px; }
.d-label { font-size: 10px; color: var(--text-muted); }
.d-val { font-size: 13px; font-weight: 600; }

.close-btn { margin-top: 12px; width: 100%; padding: 10px; border: 1.5px solid var(--danger); color: var(--danger); background: transparent; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; }
.close-btn:active { background: var(--danger-light); }

/* 弹窗 */
.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; z-index: 100; }
.modal-box { width: 100%; background: var(--card); border-radius: 20px 20px 0 0; max-height: 90vh; overflow-y: auto; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 20px 12px; border-bottom: 1px solid var(--border); }
.modal-title { font-size: 17px; font-weight: 700; }
.title-buy { color: #dc2626; }
.title-sell { color: #059669; }
.modal-close { font-size: 18px; color: var(--text-muted); padding: 4px 8px; cursor: pointer; }
.modal-body { padding: 16px 20px; display: flex; flex-direction: column; gap: 14px; }
.modal-footer { display: flex; gap: 10px; padding: 12px 20px 32px; }
.modal-footer .btn { flex: 1; padding: 14px; font-size: 15px; border-radius: 12px; }

.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
.form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.input-wrap { position: relative; }

.radio-group { display: flex; gap: 8px; }
.radio-btn { padding: 8px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; border: 1.5px solid var(--border); color: var(--text-secondary); cursor: pointer; }
.radio-btn.active { border-color: var(--primary); color: var(--primary); background: var(--primary-light); }

.leverage-row { display: flex; gap: 6px; flex-wrap: wrap; }
.lv-btn { padding: 6px 10px; border-radius: 8px; font-size: 12px; font-weight: 700; border: 1.5px solid var(--border); color: var(--text-secondary); cursor: pointer; }
.lv-btn.active { border-color: #dc2626; color: #dc2626; background: rgba(220,38,38,0.08); }

.cost-preview { background: var(--bg); border-radius: 10px; padding: 12px 14px; display: flex; align-items: center; gap: 10px; font-size: 13px; }
.cost-val { font-weight: 700; color: var(--text-primary); flex: 1; }
.cost-margin { font-size: 11px; color: var(--text-muted); }

.dropdown { position: absolute; top: 100%; left: 0; right: 0; background: var(--card); border: 1px solid var(--border); border-radius: 10px; z-index: 10; max-height: 160px; overflow-y: auto; box-shadow: var(--shadow-md); margin-top: 4px; }
.dropdown-item { padding: 11px 14px; font-size: 14px; cursor: pointer; border-bottom: 1px solid var(--border); }
.dropdown-item:last-child { border-bottom: none; }
.dropdown-item:active { background: var(--bg); }
.di-id { font-weight: 600; }

.empty { display: flex; flex-direction: column; align-items: center; padding: 50px 20px; gap: 6px; }
.empty-icon { font-size: 48px; }
.empty-text { font-size: 16px; font-weight: 600; color: var(--text-secondary); }
.empty-sub { font-size: 13px; color: var(--text-muted); }

.toast { position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); color: white; padding: 10px 22px; border-radius: 22px; font-size: 13px; white-space: nowrap; z-index: 999; }
.toast-enter-active, .toast-leave-active { transition: opacity 0.2s; }
.toast-enter-from, .toast-leave-to { opacity: 0; }
</style>
