<template>
  <div class="alert-page">
    <div class="alert-tip card">
      <svg class="tip-svg" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span>价格到达目标时提醒，振幅超标时提醒</span>
    </div>

    <!-- 添加提醒 -->
    <div class="add-card card">
      <div class="card-title">添加提醒</div>

      <div class="type-tabs">
        <span class="ttab" :class="{ active: addType === 'price' }" @click="addType = 'price'">价格提醒</span>
        <span class="ttab" :class="{ active: addType === 'pct' }" @click="addType = 'pct'">振幅提醒</span>
      </div>

      <div class="form-group">
        <label>搜索币种</label>
        <div class="input-wrap">
          <input v-model="form.keyword" placeholder="输入币种..." @input="onSearch" />
          <div v-if="coinResults.length > 0" class="dropdown">
            <div v-for="c in coinResults" :key="c.instId" class="dropdown-item" @click="selectCoin(c)">{{ c.instId }}</div>
          </div>
        </div>
      </div>

      <template v-if="addType === 'price'">
        <div class="form-row-2">
          <div class="form-group">
            <label>条件</label>
            <select v-model="form.condition">
              <option value="above">高于</option>
              <option value="below">低于</option>
            </select>
          </div>
          <div class="form-group">
            <label>目标价格 (USDT)</label>
            <input v-model="form.price" type="number" placeholder="0.00" />
          </div>
        </div>
      </template>

      <template v-else>
        <div class="form-group">
          <label>24H振幅超过 (%)</label>
          <input v-model="form.triggerPct" type="number" placeholder="例如 5 表示涨跌超5%提醒" />
        </div>
      </template>

      <button class="btn btn-primary add-btn" @click="submitAlert">+ 添加</button>
    </div>

    <!-- 已触发 -->
    <div v-if="alertStore.triggered.length > 0" class="list-section">
      <div class="list-head">
        <span class="list-title">已触发 ({{ alertStore.triggered.length }})</span>
        <span class="clear-btn" @click="alertStore.clearTriggered()">清空</span>
      </div>
      <div class="alert-list">
        <div v-for="a in alertStore.triggered" :key="a.id+'t'" class="alert-item card triggered">
          <div class="ai-logo">
            <img v-if="getCoinIcon(a.instId.replace('-USDT',''))" :src="getCoinIcon(a.instId.replace('-USDT',''))" @error="e=>e.target.style.display='none'" />
            <span v-else class="logo-text">{{ a.instId.replace('-USDT','').slice(0,2) }}</span>
          </div>
          <div class="ai-info">
            <div class="ai-sym">{{ a.instId.replace('-USDT','') }}</div>
            <div class="ai-cond">{{ a.condition === 'above' ? '≥' : '≤' }} {{ formatPrice(a.price) }}</div>
          </div>
          <div class="ai-right">
            <div class="ai-cur">{{ formatPrice(a.currentPrice) }}</div>
            <div class="ai-time">{{ a.triggeredAt }}</div>
          </div>
          <span class="triggered-tag">✓ 触发</span>
        </div>
      </div>
    </div>

    <!-- 监听中 -->
    <div class="list-section">
      <div class="list-head">
        <span class="list-title">监听中 ({{ activeAlerts.length }})</span>
      </div>
      <div v-if="!activeAlerts.length" class="empty" style="padding:30px 0">
        <svg style="width:40px;height:40px;color:var(--text-muted)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        <span class="text">暂无提醒</span>
      </div>
      <div v-else class="alert-list">
        <div v-for="a in activeAlerts" :key="a.id" class="alert-item card">
          <div class="ai-logo">
            <img v-if="getCoinIcon(a.instId.replace('-USDT',''))" :src="getCoinIcon(a.instId.replace('-USDT',''))" @error="e=>e.target.style.display='none'" />
            <span v-else class="logo-text">{{ a.instId.replace('-USDT','').slice(0,2) }}</span>
          </div>
          <div class="ai-info">
            <div class="ai-sym">{{ a.instId.replace('-USDT','') }}</div>
            <div class="ai-cond">{{ a.condition === 'above' ? '价格高于' : '价格低于' }} {{ formatPrice(a.price) }}</div>
          </div>
          <button class="del-btn" @click="alertStore.removeAlert(a.id)">删除</button>
        </div>
      </div>
    </div>

    <transition name="toast">
      <div v-if="toastMsg" class="toast">{{ toastMsg }}</div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAlertStore } from '@/stores'
import { searchCoins, formatPrice, getCoinIcon } from '@/api/okx'

const alertStore = useAlertStore()
const addType = ref('price')
const form = ref({ keyword: '', instId: '', condition: 'above', price: '', triggerPct: '' })
const coinResults = ref([])
const toastMsg = ref('')

const activeAlerts = computed(() => alertStore.alerts.filter(a => a.active))

let searchTimer = null
async function onSearch() {
  if (!form.value.keyword.trim()) { coinResults.value = []; return }
  clearTimeout(searchTimer)
  searchTimer = setTimeout(async () => { coinResults.value = await searchCoins(form.value.keyword) }, 300)
}
function selectCoin(c) { form.value.instId = c.instId; form.value.keyword = c.instId; coinResults.value = [] }
function showToast(msg) { toastMsg.value = msg; setTimeout(() => { toastMsg.value = '' }, 2000) }
function submitAlert() {
  if (!form.value.instId) { showToast('请选择币种'); return }
  if (addType.value === 'price' && (!form.value.price || parseFloat(form.value.price) <= 0)) { showToast('请输入目标价格'); return }
  if (addType.value === 'pct' && (!form.value.triggerPct || parseFloat(form.value.triggerPct) <= 0)) { showToast('请输入振幅百分比'); return }
  alertStore.addAlert({ instId: form.value.instId, condition: form.value.condition, price: addType.value === 'price' ? form.value.price : '0', triggerPct: addType.value === 'pct' ? form.value.triggerPct : null })
  form.value = { keyword: '', instId: '', condition: 'above', price: '', triggerPct: '' }
  showToast('提醒已添加 ✓')
}
</script>

<style scoped>
.alert-page { padding: 14px; display: flex; flex-direction: column; gap: 12px; padding-bottom: 20px; }
.alert-tip { display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: #fffbeb; border: 1px solid rgba(217,119,6,0.2); font-size: 13px; color: #92400e; }
.tip-svg { width: 20px; height: 20px; flex-shrink: 0; }
.add-card { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.card-title { font-size: 15px; font-weight: 700; }
.type-tabs { display: flex; gap: 6px; }
.ttab { padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 500; color: var(--text-muted); background: var(--bg); border: 1px solid var(--border); cursor: pointer; }
.ttab.active { background: var(--primary); color: white; border-color: var(--primary); }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
.form-row-2 { display: grid; grid-template-columns: 1fr 1.5fr; gap: 10px; }
.input-wrap { position: relative; }
.dropdown { position: absolute; top: 100%; left: 0; right: 0; background: var(--card); border: 1px solid var(--border); border-radius: 10px; z-index: 10; max-height: 140px; overflow-y: auto; box-shadow: var(--shadow-md); margin-top: 4px; }
.dropdown-item { padding: 10px 14px; font-size: 14px; cursor: pointer; border-bottom: 1px solid var(--border); }
.dropdown-item:last-child { border-bottom: none; }
.dropdown-item:active { background: var(--bg); }
.add-btn { width: 100%; padding: 13px; }
.list-section { display: flex; flex-direction: column; gap: 8px; }
.list-head { display: flex; justify-content: space-between; align-items: center; }
.list-title { font-size: 15px; font-weight: 700; }
.clear-btn { font-size: 13px; color: #dc2626; cursor: pointer; padding: 4px 8px; }
.alert-list { display: flex; flex-direction: column; gap: 8px; }
.alert-item { padding: 14px; display: flex; align-items: center; gap: 10px; position: relative; overflow: hidden; }
.alert-item.triggered { border-left: 3px solid #059669; }
.ai-logo { width: 36px; height: 36px; border-radius: 50%; overflow: hidden; background: var(--bg); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ai-logo img { width: 100%; height: 100%; object-fit: cover; }
.logo-text { font-size: 10px; font-weight: 700; color: var(--text-secondary); }
.ai-info { flex: 1; }
.ai-sym { font-size: 15px; font-weight: 700; }
.ai-cond { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.ai-right { text-align: right; }
.ai-cur { font-size: 13px; font-weight: 600; color: #059669; }
.ai-time { font-size: 11px; color: var(--text-muted); }
.triggered-tag { position: absolute; top: 8px; right: 8px; font-size: 10px; font-weight: 700; background: rgba(5,150,105,0.1); color: #059669; padding: 2px 7px; border-radius: 10px; }
.del-btn { font-size: 12px; color: #dc2626; border: 1px solid #dc2626; background: transparent; padding: 5px 12px; border-radius: 8px; cursor: pointer; flex-shrink: 0; }
.del-btn:active { background: rgba(220,38,38,0.08); }
.empty { display: flex; flex-direction: column; align-items: center; gap: 8px; color: var(--text-muted); }
.toast { position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); color: white; padding: 10px 22px; border-radius: 22px; font-size: 13px; white-space: nowrap; z-index: 999; }
.toast-enter-active, .toast-leave-active { transition: opacity 0.2s; }
.toast-enter-from, .toast-leave-to { opacity: 0; }
</style>
