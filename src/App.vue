<template>
  <div class="app-shell">
    <div class="status-bar-fill"></div>
    <div class="page-header">
      <div class="header-left">
        <img src="/icons/icon.png" class="header-avatar" />
        <span class="header-title">{{ currentTitle }}</span>
      </div>
      <span class="header-time">{{ currentTime }}</span>
    </div>
    <div class="page-content"><router-view /></div>
    <nav class="tab-bar">
      <router-link v-for="tab in tabs" :key="tab.path" :to="tab.path"
        class="tab-item" :class="{ active: route.path === tab.path }">
        <div class="tab-icon-wrap" :class="{ active: route.path === tab.path }">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
            v-html="tab.icon"></svg>
          <span v-if="tab.badge && alertCount > 0" class="badge">{{ alertCount }}</span>
        </div>
        <span class="tab-label">{{ tab.label }}</span>
      </router-link>
    </nav>
    <div class="bottom-fill"></div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAlertStore } from '@/stores'

const route = useRoute()
const alertStore = useAlertStore()
const currentTime = ref('')

const tabs = [
  { path: '/market',   label: '行情', icon: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>' },
  { path: '/overview', label: '总览', icon: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>' },
  { path: '/search',   label: '搜索', icon: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>' },
  { path: '/tools',    label: '工具', icon: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>' },
  { path: '/lottery',  label: '六合彩', icon: '<circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/>' },
  { path: '/alert',    label: '提醒', badge: true, icon: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>' },
]

const titleMap = { '/market':'行情', '/overview':'市场总览', '/search':'搜索币种', '/tools':'交易工具', '/alert':'价格提醒', '/lottery':'六合彩' }
const currentTitle = computed(() => titleMap[route.path] || '阿佑')
const alertCount = computed(() => alertStore.triggered.length)

function updateTime() { currentTime.value = new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}) }
let timer
onMounted(() => { updateTime(); timer = setInterval(updateTime, 1000) })
onUnmounted(() => clearInterval(timer))
</script>

<style>
.app-shell { display:flex; flex-direction:column; height:100%; height:-webkit-fill-available; background:var(--bg); overflow:hidden; }
.status-bar-fill { flex-shrink:0; height:var(--safe-top); background:var(--card); }
.page-header { display:flex; align-items:center; justify-content:space-between; padding:10px 18px; background:var(--card); border-bottom:1px solid var(--border); flex-shrink:0; }
.header-left { display:flex; align-items:center; gap:10px; }
.header-avatar { width:30px; height:30px; border-radius:50%; object-fit:cover; border:2px solid var(--primary-light); }
.header-title { font-size:17px; font-weight:700; color:var(--text-primary); }
.header-time { font-size:13px; color:var(--text-muted); font-variant-numeric:tabular-nums; }
.page-content { flex:1; overflow-y:auto; overflow-x:hidden; -webkit-overflow-scrolling:touch; }
.tab-bar { display:flex; background:var(--card); border-top:1px solid var(--border); padding:6px 0 0; flex-shrink:0; }
.tab-item { flex:1; display:flex; flex-direction:column; align-items:center; gap:2px; text-decoration:none; color:var(--text-muted); padding-bottom:4px; transition:color 0.15s; }
.tab-item.active { color:var(--primary); }
.tab-icon-wrap { position:relative; padding:5px 6px; border-radius:12px; transition:background 0.15s; }
.tab-icon-wrap svg { width:20px; height:20px; display:block; }
.tab-icon-wrap.active { background:var(--primary-light); }
.tab-item.active .tab-icon-wrap svg { stroke:var(--primary); }
.tab-label { font-size:9px; font-weight:500; }
.badge { position:absolute; top:0; right:2px; background:#dc2626; color:white; font-size:9px; font-weight:700; padding:1px 4px; border-radius:8px; min-width:14px; text-align:center; }
.bottom-fill { flex-shrink:0; height:var(--safe-bottom); background:var(--card); }
</style>
