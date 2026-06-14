<template>
  <div class="search-page">
    <div class="search-bar">
      <input
        v-model="keyword"
        placeholder="搜索币种，如 BTC、ETH..."
        @input="onInput"
        autofocus
      />
    </div>

    <div v-if="searching" class="loading">
      <div class="spinner"></div>
      <span>搜索中...</span>
    </div>

    <div v-else-if="keyword && results.length === 0" class="empty">
      <span class="icon">🔍</span>
      <span class="text">未找到相关币种</span>
    </div>

    <div v-else-if="results.length > 0" class="result-list">
      <div class="section-title">搜索结果</div>
      <div
        v-for="coin in results"
        :key="coin.instId"
        class="result-item card"
        @click="toggleWatchlist(coin)"
      >
        <div class="result-left">
          <div class="result-symbol">{{ coin.baseCcy }}</div>
          <div class="result-id">{{ coin.instId }}</div>
        </div>
        <div class="result-right">
          <div v-if="watchlist.has(coin.instId)" class="tag tag-added">✓ 已添加</div>
          <div v-else class="tag tag-add">+ 添加</div>
        </div>
      </div>
    </div>

    <div v-else class="hint-section">
      <div class="section-title">热门币种</div>
      <div class="hot-grid">
        <div
          v-for="coin in hotCoins"
          :key="coin"
          class="hot-item"
          :class="{ added: watchlist.has(coin) }"
          @click="quickAdd(coin)"
        >
          {{ coin.replace('-USDT', '') }}
          <span v-if="watchlist.has(coin)"> ✓</span>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <transition name="toast">
      <div v-if="toastMsg" class="toast">{{ toastMsg }}</div>
    </transition>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useWatchlistStore } from '@/stores'
import { searchCoins } from '@/api/okx'

const watchlist = useWatchlistStore()
const keyword = ref('')
const results = ref([])
const searching = ref(false)
const toastMsg = ref('')

const hotCoins = [
  'BTC-USDT', 'ETH-USDT', 'SOL-USDT', 'BNB-USDT',
  'XRP-USDT', 'DOGE-USDT', 'ADA-USDT', 'AVAX-USDT',
  'DOT-USDT', 'MATIC-USDT', 'LINK-USDT', 'UNI-USDT'
]

let searchTimer = null
function onInput() {
  clearTimeout(searchTimer)
  if (!keyword.value.trim()) { results.value = []; return }
  searching.value = true
  searchTimer = setTimeout(async () => {
    try {
      results.value = await searchCoins(keyword.value.trim())
    } finally {
      searching.value = false
    }
  }, 400)
}

function showToast(msg) {
  toastMsg.value = msg
  setTimeout(() => { toastMsg.value = '' }, 2000)
}

function toggleWatchlist(coin) {
  if (watchlist.has(coin.instId)) {
    watchlist.remove(coin.instId)
    showToast(`已移除 ${coin.baseCcy}`)
  } else {
    watchlist.add(coin.instId)
    showToast(`已添加 ${coin.baseCcy}`)
  }
}

function quickAdd(instId) {
  if (watchlist.has(instId)) {
    watchlist.remove(instId)
    showToast(`已移除 ${instId.replace('-USDT', '')}`)
  } else {
    watchlist.add(instId)
    showToast(`已添加 ${instId.replace('-USDT', '')}`)
  }
}
</script>

<style scoped>
.search-page { padding: 16px; display: flex; flex-direction: column; gap: 12px; }

.search-bar input {
  font-size: 15px;
  padding: 12px 16px;
  border-radius: 12px;
  border: 2px solid var(--border);
}
.search-bar input:focus { border-color: var(--primary); }

.section-title { font-size: 15px; font-weight: 600; margin-bottom: 8px; }

.result-list { display: flex; flex-direction: column; gap: 8px; }

.result-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  cursor: pointer;
  transition: box-shadow 0.15s;
}
.result-item:active { box-shadow: 0 0 0 2px var(--primary-light); }

.result-symbol { font-size: 16px; font-weight: 700; }
.result-id { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

.tag {
  font-size: 12px;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: 20px;
}
.tag-add { background: var(--primary-light); color: var(--primary); }
.tag-added { background: var(--success-light); color: var(--success); }

.hot-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.hot-item {
  background: var(--card);
  border-radius: var(--radius-sm);
  padding: 12px 8px;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
  border: 1.5px solid var(--border);
  transition: all 0.15s;
}
.hot-item.added {
  background: var(--primary-light);
  color: var(--primary);
  border-color: var(--primary);
}
.hot-item:active { opacity: 0.7; }

.toast {
  position: fixed;
  bottom: 90px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.75);
  color: white;
  padding: 10px 20px;
  border-radius: 20px;
  font-size: 13px;
  white-space: nowrap;
  z-index: 999;
}
.toast-enter-active, .toast-leave-active { transition: opacity 0.2s; }
.toast-enter-from, .toast-leave-to { opacity: 0; }
</style>
