<template>
  <div class="tools-page">

    <!-- 汇率换算 -->
    <div class="rate-card gradient-card">
      <div class="rate-left">
        <div class="rate-label">实时汇率</div>
        <div class="rate-big">1 USDT ≈ <span class="rate-num">{{ cnyRate }}</span> CNY</div>
      </div>
      <div class="rate-right">
        <div class="rate-label">输入 USDT</div>
        <input v-model="convertAmt" type="number" placeholder="0" class="rate-input" @input="calcConvert" />
        <div class="rate-result">≈ {{ convertCny }} 元</div>
      </div>
    </div>

    <!-- 市场异动 -->
    <div class="section-card card">
      <div class="section-head">
        <span class="section-title">🚨 市场异动</span>
        <span class="section-sub">1H内涨跌超5%</span>
      </div>
      <div v-if="loadingMovers" class="mini-loading"><div class="spinner"></div></div>
      <div v-else-if="!movers.length" class="mini-empty">暂无异动</div>
      <div v-else class="movers-list">
        <div v-for="item in movers" :key="item.instId" class="mover-item">
          <div class="item-logo">
            <img v-if="getCoinIcon(item.instId.replace('-USDT',''))" :src="getCoinIcon(item.instId.replace('-USDT',''))" @error="e=>e.target.style.display='none'" />
            <span v-else class="logo-fb" :style="{background:getCoinColor(item.instId.replace('-USDT',''))}">{{ item.instId.replace('-USDT','').slice(0,2) }}</span>
          </div>
          <div class="item-info">
            <span class="item-sym">{{ item.instId.replace('-USDT','') }}/USDT</span>
            <span class="item-sub">成交额 ${{ formatVol(item.volCcy24h) }}</span>
          </div>
          <div class="item-right">
            <span class="fr-rate" :class="parseFloat(item.change24h||0)>=0?'up':'down'">
              {{ formatChange(item.change24h) }}
            </span>
            <span class="item-sub">{{ formatPrice(item.last) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 仓位计算器 -->
    <div class="section-card card">
      <div class="section-head"><span class="section-title">🧮 仓位计算器</span></div>
      <div class="calc-form">
        <div class="form-row2">
          <div class="form-group"><label>本金 (USDT)</label><input v-model="pos.capital" type="number" placeholder="10000" @input="calcPosition" /></div>
          <div class="form-group"><label>杠杆倍数</label><input v-model="pos.leverage" type="number" placeholder="10" @input="calcPosition" /></div>
        </div>
        <div class="form-row2">
          <div class="form-group"><label>开仓价格</label><input v-model="pos.entryPrice" type="number" placeholder="0" @input="calcPosition" /></div>
          <div class="form-group"><label>止损价格</label><input v-model="pos.stopLoss" type="number" placeholder="0" @input="calcPosition" /></div>
        </div>
        <div class="form-row2">
          <div class="form-group"><label>风险比例 (%)</label><input v-model="pos.riskPct" type="number" placeholder="2" @input="calcPosition" /></div>
          <div class="form-group">
            <label>方向</label>
            <div class="side-btns">
              <span class="side-btn" :class="{active_long:pos.side==='long'}" @click="pos.side='long';calcPosition()">做多</span>
              <span class="side-btn" :class="{active_short:pos.side==='short'}" @click="pos.side='short';calcPosition()">做空</span>
            </div>
          </div>
        </div>
        <div class="calc-result" v-if="posResult.qty">
          <div class="cr-row"><span class="cr-label">建议仓位</span><span class="cr-val primary">{{ posResult.qty }}</span></div>
          <div class="cr-row"><span class="cr-label">名义价值</span><span class="cr-val">{{ posResult.notional }} U</span></div>
          <div class="cr-row"><span class="cr-label">所需保证金</span><span class="cr-val">{{ posResult.margin }} U</span></div>
          <div class="cr-row"><span class="cr-label">最大亏损</span><span class="cr-val down">-{{ posResult.maxLoss }} U</span></div>
          <div class="cr-row"><span class="cr-label">预估强平价</span><span class="cr-val down">{{ posResult.liqPrice }}</span></div>
        </div>
      </div>
    </div>

    <!-- 盈亏计算器 -->
    <div class="section-card card">
      <div class="section-head"><span class="section-title">💰 盈亏计算器</span></div>
      <div class="calc-form">
        <div class="form-row2">
          <div class="form-group"><label>开仓价</label><input v-model="pnl.entry" type="number" placeholder="0" @input="calcPnl" /></div>
          <div class="form-group"><label>平仓价</label><input v-model="pnl.exit" type="number" placeholder="0" @input="calcPnl" /></div>
        </div>
        <div class="form-row2">
          <div class="form-group"><label>数量</label><input v-model="pnl.qty" type="number" placeholder="0" @input="calcPnl" /></div>
          <div class="form-group"><label>杠杆</label><input v-model="pnl.leverage" type="number" placeholder="1" @input="calcPnl" /></div>
        </div>
        <div class="side-btns" style="margin-top:4px">
          <span class="side-btn" :class="{active_long:pnl.side==='long'}" @click="pnl.side='long';calcPnl()">做多</span>
          <span class="side-btn" :class="{active_short:pnl.side==='short'}" @click="pnl.side='short';calcPnl()">做空</span>
        </div>
        <div class="calc-result" v-if="pnlResult.pnl!==undefined">
          <div class="cr-row"><span class="cr-label">盈亏</span><span class="cr-val" :class="parseFloat(pnlResult.pnl)>=0?'up':'down'">{{ parseFloat(pnlResult.pnl)>=0?'+':'' }}{{ pnlResult.pnl }} U</span></div>
          <div class="cr-row"><span class="cr-label">价格收益率</span><span class="cr-val" :class="parseFloat(pnlResult.rate)>=0?'up':'down'">{{ parseFloat(pnlResult.rate)>=0?'+':'' }}{{ pnlResult.rate }}%</span></div>
          <div class="cr-row"><span class="cr-label">本金收益率</span><span class="cr-val" :class="parseFloat(pnlResult.capRate)>=0?'up':'down'">{{ parseFloat(pnlResult.capRate)>=0?'+':'' }}{{ pnlResult.capRate }}%</span></div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getUsdtCnyRate, getMarketTopMovers, getCoinIcon, getCoinColor, formatPrice, formatChange, formatVol } from '@/api/okx'

const cnyRate = ref('7.25')
const convertAmt = ref('')
const convertCny = ref('--')
const loadingMovers = ref(false)
const movers = ref([])

const pos = ref({ capital:'', leverage:10, entryPrice:'', stopLoss:'', riskPct:2, side:'long' })
const posResult = ref({})
const pnl = ref({ entry:'', exit:'', qty:'', leverage:1, side:'long' })
const pnlResult = ref({})

function calcConvert() {
  convertCny.value = (parseFloat(convertAmt.value||0) * parseFloat(cnyRate.value)).toFixed(2)
}

function calcPosition() {
  const C=parseFloat(pos.value.capital), L=parseFloat(pos.value.leverage)
  const E=parseFloat(pos.value.entryPrice), S=parseFloat(pos.value.stopLoss), R=parseFloat(pos.value.riskPct)
  if (!C||!L||!E||!S||!R) { posResult.value={}; return }
  const stopPct = Math.abs(E-S)/E; if (!stopPct) return
  const maxLoss = C*(R/100)
  const notional = maxLoss/stopPct
  posResult.value = {
    qty: (notional/E).toFixed(4),
    notional: notional.toFixed(2),
    margin: (notional/L).toFixed(2),
    maxLoss: maxLoss.toFixed(2),
    liqPrice: formatPrice(pos.value.side==='long' ? E*(1-1/L+0.004) : E*(1+1/L-0.004))
  }
}

function calcPnl() {
  const E=parseFloat(pnl.value.entry), X=parseFloat(pnl.value.exit), Q=parseFloat(pnl.value.qty), L=parseFloat(pnl.value.leverage)||1
  if (!E||!X||!Q) { pnlResult.value={}; return }
  const diff = pnl.value.side==='long' ? X-E : E-X
  pnlResult.value = { pnl:(diff*Q).toFixed(4), rate:((diff/E)*100).toFixed(2), capRate:((diff/E)*100*L).toFixed(2) }
}

async function loadMovers() {
  loadingMovers.value = true
  try {
    const all = await getMarketTopMovers(100)
    // 找24H涨跌超过5%的币种
    movers.value = all
      .filter(t => Math.abs(parseFloat(t.change24h||0)) >= 0.05)
      .sort((a,b) => Math.abs(parseFloat(b.change24h||0)) - Math.abs(parseFloat(a.change24h||0)))
      .slice(0, 15)
  } finally { loadingMovers.value = false }
}

async function loadRate() {
  const rate = await getUsdtCnyRate()
  cnyRate.value = rate.toFixed(4)
  calcConvert()
}

onMounted(() => { loadRate(); loadMovers() })
</script>

<style scoped>
.tools-page { padding:14px; display:flex; flex-direction:column; gap:12px; padding-bottom:24px; }
.rate-card { padding:18px 20px; display:flex; justify-content:space-between; align-items:center; gap:12px; }
.rate-label { font-size:11px; opacity:0.75; margin-bottom:4px; color:white; }
.rate-big { font-size:14px; font-weight:600; color:white; }
.rate-num { font-size:22px; font-weight:800; }
.rate-input { background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.3); border-radius:8px; padding:6px 10px; color:white; font-size:15px; font-weight:600; width:110px; text-align:right; }
.rate-input::placeholder { color:rgba(255,255,255,0.4); }
.rate-result { font-size:13px; color:rgba(255,255,255,0.85); margin-top:4px; text-align:right; }
.section-card { padding:16px; }
.section-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
.section-title { font-size:15px; font-weight:700; }
.section-sub { font-size:11px; color:var(--text-muted); }
.mini-loading { display:flex; justify-content:center; padding:20px; }
.mini-empty { text-align:center; color:var(--text-muted); font-size:13px; padding:16px 0; }
.movers-list { display:flex; flex-direction:column; gap:10px; }
.mover-item { display:flex; align-items:center; gap:10px; }
.item-logo { width:36px; height:36px; border-radius:50%; overflow:hidden; background:var(--bg); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.item-logo img { width:100%; height:100%; object-fit:cover; }
.logo-fb { width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; font-size:11px; font-weight:700; flex-shrink:0; }
.item-info { flex:1; }
.item-sym { font-size:13px; font-weight:600; display:block; }
.item-sub { font-size:10px; color:var(--text-muted); display:block; margin-top:1px; }
.item-right { text-align:right; }
.fr-rate { font-size:15px; font-weight:700; display:block; }
.calc-form { display:flex; flex-direction:column; gap:10px; }
.form-row2 { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.form-group { display:flex; flex-direction:column; gap:5px; }
.form-group label { font-size:11px; font-weight:600; color:var(--text-muted); }
.side-btns { display:flex; gap:8px; }
.side-btn { flex:1; padding:10px; text-align:center; border-radius:8px; font-size:13px; font-weight:600; border:1.5px solid var(--border); color:var(--text-muted); cursor:pointer; }
.active_long { background:rgba(220,38,38,0.1); color:#dc2626; border-color:#dc2626; }
.active_short { background:rgba(5,150,105,0.1); color:#059669; border-color:#059669; }
.calc-result { background:var(--bg); border-radius:10px; padding:12px 14px; display:flex; flex-direction:column; gap:8px; margin-top:4px; }
.cr-row { display:flex; justify-content:space-between; align-items:center; }
.cr-label { font-size:12px; color:var(--text-muted); }
.cr-val { font-size:14px; font-weight:700; }
.cr-val.primary { color:var(--primary); }
</style>
