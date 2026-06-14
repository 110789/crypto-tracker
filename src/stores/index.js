import { defineStore } from 'pinia'
import { ref } from 'vue'

function load(key, fb) { try { const v=localStorage.getItem(key); return v?JSON.parse(v):fb } catch { return fb } }
function save(key, val) { localStorage.setItem(key, JSON.stringify(val)) }

export const useWatchlistStore = defineStore('watchlist', () => {
  const list = ref(load('watchlist', ['BTC-USDT','ETH-USDT','SOL-USDT']))
  function add(instId) { if(!list.value.includes(instId)){list.value.push(instId);save('watchlist',list.value)} }
  function remove(instId) { list.value=list.value.filter(i=>i!==instId);save('watchlist',list.value) }
  function has(instId) { return list.value.includes(instId) }
  return { list, add, remove, has }
})

export const useAlertStore = defineStore('alerts', () => {
  const alerts = ref(load('price_alerts', []))
  const triggered = ref([])

  function addAlert(a) {
    alerts.value.push({ id:Date.now(), instId:a.instId, condition:a.condition, price:parseFloat(a.price), active:true })
    save('price_alerts', alerts.value)
  }
  function removeAlert(id) { alerts.value=alerts.value.filter(a=>a.id!==id); save('price_alerts',alerts.value) }

  async function checkAlerts(priceMap) {
    let changed = false
    for (const a of alerts.value) {
      if (!a.active) continue
      const cur = parseFloat(priceMap[a.instId]||0); if (!cur) continue
      const hit = a.condition==='above' ? cur>=a.price : cur<=a.price
      if (hit) {
        a.active = false; changed = true
        triggered.value.unshift({ ...a, triggeredAt:new Date().toLocaleTimeString('zh-CN'), currentPrice:cur })
        if (triggered.value.length>50) triggered.value.pop()
        // 震动提醒
        try { if(navigator.vibrate) navigator.vibrate(a.condition==='above'?[100,50,200]:[200,80,200,80,200]) } catch {}
        // 音效
        try {
          const ctx = new (window.AudioContext||window.webkitAudioContext)()
          const osc = ctx.createOscillator(); const gain = ctx.createGain()
          osc.connect(gain); gain.connect(ctx.destination)
          if (a.condition==='above') { osc.frequency.setValueAtTime(523,ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(1047,ctx.currentTime+0.4) }
          else { osc.frequency.setValueAtTime(784,ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(392,ctx.currentTime+0.4) }
          gain.gain.setValueAtTime(0.3,ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.5)
          osc.start(ctx.currentTime); osc.stop(ctx.currentTime+0.5)
        } catch {}
      }
    }
    if (changed) save('price_alerts', alerts.value)
  }

  function clearTriggered() { triggered.value=[] }
  return { alerts, triggered, addAlert, removeAlert, checkAlerts, clearTriggered }
})

export const useSettingsStore = defineStore('settings', () => {
  const darkMode = ref(load('darkMode', false))
  function toggleDark() { darkMode.value=!darkMode.value; save('darkMode',darkMode.value) }
  return { darkMode, toggleDark }
})
