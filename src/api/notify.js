import { LocalNotifications } from '@capacitor/local-notifications'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

let notifyId = 1
let audioCtx = null
let permissionGranted = false

// ─── 权限申请 ────────────────────────────────────────
export async function requestPermissions() {
  try {
    const result = await LocalNotifications.requestPermissions()
    permissionGranted = result.display === 'granted'
    return permissionGranted
  } catch { return false }
}

export async function checkPermissions() {
  try {
    const result = await LocalNotifications.checkPermissions()
    permissionGranted = result.display === 'granted'
    return permissionGranted
  } catch { return false }
}

// ─── 注册通知渠道（Android 8+） ──────────────────────
export async function createChannels() {
  try {
    await LocalNotifications.createChannel({
      id: 'price_alert',
      name: '价格提醒',
      description: '价格到达目标时通知',
      importance: 5,        // IMPORTANCE_HIGH
      visibility: 1,
      sound: 'alert_up',    // 在 res/raw 里放音频文件
      vibration: true,
      lights: true,
      lightColor: '#dc2626'
    })
    await LocalNotifications.createChannel({
      id: 'price_up',
      name: '价格上涨',
      description: '价格超过目标时通知',
      importance: 5,
      vibration: true,
      lights: true,
      lightColor: '#dc2626'
    })
    await LocalNotifications.createChannel({
      id: 'price_down',
      name: '价格下跌',
      description: '价格跌破目标时通知',
      importance: 5,
      vibration: true,
      lights: true,
      lightColor: '#059669'
    })
  } catch (e) {
    console.log('createChannel:', e)
  }
}

// ─── 发送通知 ────────────────────────────────────────
export async function sendNotification({ title, body, isUp = true }) {
  try {
    await LocalNotifications.schedule({
      notifications: [{
        id: notifyId++,
        title,
        body,
        channelId: isUp ? 'price_up' : 'price_down',
        smallIcon: 'ic_stat_notify',
        iconColor: isUp ? '#dc2626' : '#059669',
        sound: undefined,
        attachments: undefined,
        actionTypeId: '',
        extra: null,
        ongoing: false,
        autoCancel: true,
      }]
    })
  } catch (e) {
    // 降级：用浏览器 Notification API
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/icons/icon.png' })
      }
    } catch {}
  }
}

// ─── 震动 ────────────────────────────────────────────
export async function vibrateAlert(isUp = true) {
  try {
    if (isUp) {
      // 涨：短促两下
      await Haptics.impact({ style: ImpactStyle.Medium })
      setTimeout(() => Haptics.impact({ style: ImpactStyle.Heavy }), 150)
    } else {
      // 跌：连续三下
      await Haptics.impact({ style: ImpactStyle.Heavy })
      setTimeout(() => Haptics.impact({ style: ImpactStyle.Heavy }), 120)
      setTimeout(() => Haptics.impact({ style: ImpactStyle.Heavy }), 240)
    }
  } catch {
    // 降级：navigator.vibrate
    try {
      if (navigator.vibrate) {
        navigator.vibrate(isUp ? [100, 50, 200] : [200, 80, 200, 80, 200])
      }
    } catch {}
  }
}

// ─── Web Audio 音效 ──────────────────────────────────
function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  return audioCtx
}

function playTone(freq, duration, type = 'sine', gainVal = 0.3) {
  try {
    const ctx = getAudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = type
    osc.frequency.setValueAtTime(freq, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(freq * 0.8, ctx.currentTime + duration)
    gain.gain.setValueAtTime(gainVal, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration)
  } catch {}
}

// 涨价提醒音：上升音调，明亮
export function playUpSound() {
  try {
    const ctx = getAudioCtx()
    if (ctx.state === 'suspended') ctx.resume()
    // 三音上升：do-mi-sol
    playTone(523, 0.15, 'sine', 0.35)          // C5
    setTimeout(() => playTone(659, 0.15, 'sine', 0.35), 160)   // E5
    setTimeout(() => playTone(784, 0.25, 'sine', 0.4), 320)    // G5
    setTimeout(() => playTone(1047, 0.3, 'sine', 0.3), 480)    // C6
  } catch {}
}

// 跌价提醒音：下降音调，沉重
export function playDownSound() {
  try {
    const ctx = getAudioCtx()
    if (ctx.state === 'suspended') ctx.resume()
    // 三音下降：sol-mi-do
    playTone(784, 0.15, 'sawtooth', 0.25)       // G5
    setTimeout(() => playTone(622, 0.15, 'sawtooth', 0.25), 160) // Eb5
    setTimeout(() => playTone(494, 0.25, 'sawtooth', 0.3), 320)  // B4
    setTimeout(() => playTone(392, 0.35, 'sawtooth', 0.2), 480)  // G4
  } catch {}
}

// 触发提醒（通知+震动+音效）
export async function triggerAlert({ instId, currentPrice, targetPrice, condition, enableSound = true, enableVibrate = true, enableNotification = true }) {
  const sym = instId.replace('-USDT', '')
  const isUp = condition === 'above'
  const price = typeof targetPrice === 'number' ? targetPrice.toFixed(2) : targetPrice
  const cur = typeof currentPrice === 'number' ? currentPrice.toFixed(4) : currentPrice
  const title = isUp ? `🔴 ${sym} 突破 ${price}` : `🟢 ${sym} 跌破 ${price}`
  const body = `当前价格：${cur} USDT`

  const tasks = []
  if (enableNotification) tasks.push(sendNotification({ title, body, isUp }))
  if (enableVibrate) tasks.push(vibrateAlert(isUp))
  await Promise.all(tasks)
  if (enableSound) {
    if (isUp) playUpSound()
    else playDownSound()
  }
}

// 解锁音频（需要用户交互触发一次）
export function unlockAudio() {
  try {
    const ctx = getAudioCtx()
    if (ctx.state === 'suspended') ctx.resume()
    // 播一个静音
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, ctx.currentTime)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(); osc.stop(ctx.currentTime + 0.001)
  } catch {}
}
