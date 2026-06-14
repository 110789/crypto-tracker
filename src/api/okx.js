const PROXY = 'https://ayoy1122.dpdns.org'
const TOKEN = 'ayou8888'
const WS_URL = 'wss://ayoy1122.dpdns.org/ws/v5/public'
const BINANCE_FAPI = 'https://fapi.binance.com'

// 请求缓存
const _cache = new Map()
const _pending = new Map()

async function apiFetch(path, ttl = 10000) {
  const sep = path.includes('?') ? '&' : '?'
  const url = `${PROXY}${path}${sep}token=${TOKEN}`
  const key = path

  // 命中缓存
  const cached = _cache.get(key)
  if (cached && Date.now() - cached.time < ttl) return cached.data

  // 防并发重复请求
  if (_pending.has(key)) return _pending.get(key)

  const promise = fetch(url)
    .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
    .then(data => {
      _cache.set(key, { data, time: Date.now() })
      _pending.delete(key)
      return data
    })
    .catch(e => { _pending.delete(key); throw e })

  _pending.set(key, promise)
  return promise
}

// 币安合约接口（需代理）
async function binapiFetch(path) {
  const url = `${BINANCE_FAPI}${path}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ─── 图标 ─────────────────────────────────────────────
// 使用 jsDelivr CDN 的 SVG 图标（国内可直连）
const SVG_BASE = 'https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/svg/color'
const ICON_MAP = {
  BTC: `${SVG_BASE}/btc.svg`,
  ETH: `${SVG_BASE}/eth.svg`,
  SOL:`${SVG_BASE}/sol.svg`,
  BNB:`${SVG_BASE}/bnb.svg`,
  XRP:`${SVG_BASE}/xrp.svg`,
  DOGE:`${SVG_BASE}/doge.svg`,
  ADA:`${SVG_BASE}/ada.svg`,
  AVAX:`${SVG_BASE}/avax.svg`,
  DOT:`${SVG_BASE}/dot.svg`,
  LINK:`${SVG_BASE}/link.svg`,
  UNI:`${SVG_BASE}/uni.svg`,
  LTC:`${SVG_BASE}/ltc.svg`,
  BCH:`${SVG_BASE}/bch.svg`,
  ATOM:`${SVG_BASE}/atom.svg`,
  TRX:`${SVG_BASE}/trx.svg`,
  ETC:`${SVG_BASE}/etc.svg`,
  XLM:`${SVG_BASE}/xlm.svg`,
  NEAR:`${SVG_BASE}/near.svg`,
  FIL:`${SVG_BASE}/fil.svg`,
  APT:'https://assets.coingecko.com/coins/images/26455/small/aptos_round.png',
  OP:'https://assets.coingecko.com/coins/images/25244/small/Optimism.png',
  ARB:'https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_18.45.54.jpeg',
  SUI:'https://assets.coingecko.com/coins/images/26375/small/sui_asset.jpeg',
  TON:'https://assets.coingecko.com/coins/images/17980/small/ton_symbol.png',
  PEPE:'https://assets.coingecko.com/coins/images/29850/small/pepe-token.jpeg',
  WIF:'https://assets.coingecko.com/coins/images/33566/small/dogwifhat.jpg',
  INJ:'https://assets.coingecko.com/coins/images/12882/small/Secondary_Symbol.png',
  TIA:'https://assets.coingecko.com/coins/images/31967/small/tia.jpg',
  SEI:'https://assets.coingecko.com/coins/images/28205/small/Sei_Logo_-_Transparent.png',
  LDO:'https://assets.coingecko.com/coins/images/13573/small/Lido_DAO.png',
  MKR:'https://assets.coingecko.com/coins/images/1364/small/Mark_Maker.png',
  CRV:'https://assets.coingecko.com/coins/images/12124/small/Curve.png',
  AAVE:`${SVG_BASE}/aave.svg`,
  MATIC:`${SVG_BASE}/matic.svg`,
  SHIB:`${SVG_BASE}/shib.svg`,
  EOS:`${SVG_BASE}/eos.svg`,
  XMR:`${SVG_BASE}/xmr.svg`,
  ZEC:`${SVG_BASE}/zec.svg`,
  BONK:'https://assets.coingecko.com/coins/images/28600/small/bonk.jpg',
  ALGO:`${SVG_BASE}/algo.svg`,
  NOT:'https://assets.coingecko.com/coins/images/36400/small/notcoin.jpg',
  BLUR:'https://assets.coingecko.com/coins/images/28453/small/blur.png',
  ONDO:'https://assets.coingecko.com/coins/images/26580/small/ONDO.png',
}
export function getCoinIcon(b) { return ICON_MAP[b?.toUpperCase()]||null }
export function getCoinColor(b) {
  const c=['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#ef4444','#06b6d4','#f97316']
  let h=0; for(let i=0;i<(b||'').length;i++) h=(h*31+b.charCodeAt(i))&0xffff
  return c[h%c.length]
}

// ─── 归一化 ticker ────────────────────────────────────
function normTicker(d) {
  const last=parseFloat(d.last||0), open=parseFloat(d.open24h||0)
  return {
    instId:d.instId,
    last:d.last||'0',
    open24h:d.open24h||'0',
    high24h:d.high24h||'0',
    low24h:d.low24h||'0',
    vol24h:d.vol24h||'0',
    volCcy24h:d.volCcy24h||'0',
    change24h:open>0 ? String((last-open)/open) : '0'
  }
}

// ─── 全量行情缓存（避免重复请求） ─────────────────────
let _allTickersCache = null
let _allTickersCacheTime = 0

async function getAllTickers() {
  const now = Date.now()
  if (_allTickersCache && now - _allTickersCacheTime < 10000) return _allTickersCache
  const data = await apiFetch('/api/v5/market/tickers?instType=SPOT')
  _allTickersCache = data.data || []
  _allTickersCacheTime = now
  return _allTickersCache
}

// ─── 批量 ticker（从全量缓存里过滤） ─────────────────
export async function getTickers(instIds) {
  try {
    const all = await getAllTickers()
    const map = {}
    all.forEach(d => { map[d.instId] = d })
    return instIds.map(id => map[id] ? normTicker(map[id]) : null).filter(Boolean)
  } catch(e) {
    console.error('getTickers error:', e)
    return []
  }
}

// ─── 单个 ticker ──────────────────────────────────────
export async function getTicker(instId) {
  try {
    const data = await apiFetch(`/api/v5/market/ticker?instId=${instId}`)
    return data.data?.[0] ? normTicker(data.data[0]) : null
  } catch(e) {
    console.error('getTicker error:', e)
    return null
  }
}

// ─── 全市场涨跌 ───────────────────────────────────────
export async function getMarketTopMovers(n=100) {
  try {
    const all = await getAllTickers()
    return all
      .filter(t => t.instId.endsWith('-USDT') && parseFloat(t.volCcy24h)>500000)
      .map(t => normTicker(t))
      .sort((a,b) => parseFloat(b.volCcy24h)-parseFloat(a.volCcy24h))
      .slice(0,n)
  } catch(e) {
    console.error('getMarketTopMovers error:', e)
    return []
  }
}

// ─── 搜索 ─────────────────────────────────────────────
let _instruments = null
export async function searchCoins(keyword) {
  try {
    if (!_instruments) {
      const data = await apiFetch('/api/v5/public/instruments?instType=SPOT')
      _instruments = (data.data||[])
        .filter(i => i.instId.endsWith('-USDT'))
        .map(i => ({ instId:i.instId, baseCcy:i.baseCcy, quoteCcy:i.quoteCcy }))
    }
    const kw = keyword.toUpperCase()
    return _instruments.filter(i => i.baseCcy.includes(kw)||i.instId.includes(kw)).slice(0,30)
  } catch(e) {
    console.error('searchCoins error:', e)
    return []
  }
}

// ─── K线 ──────────────────────────────────────────────
export async function getCandles(instId, bar='1H', limit=200) {
  try {
    const data = await apiFetch(`/api/v5/market/candles?instId=${instId}&bar=${bar}&limit=${limit}`)
    return (data.data||[]).reverse()
  } catch(e) {
    console.error('getCandles error:', e)
    return []
  }
}

// ─── 资金费率 ─────────────────────────────────────────
export async function getFundingRate(baseCcy) {
  try {
    const sym = `${baseCcy}USDT`
    const data = await binapiFetch(`/fapi/v1/premiumIndex?symbol=${sym}`)
    if (!data) return null
    return {
      fundingRate: data.lastFundingRate||'0',
      nextFundingTime: String(data.nextFundingTime||0),
      markPrice: data.markPrice||'0',
      indexPrice: data.indexPrice||'0'
    }
  } catch(e) {
    // 无代理时降级：用现货数据
    try {
      const spotData = await apiFetch(`/api/v5/market/ticker?instId=${baseCcy}-USDT`)
      const d = spotData.data?.[0]
      if (!d) return null
      const now = new Date()
      const nextHour = [0, 8, 16].find(h => h > now.getUTCHours()) ?? 24
      const next = new Date(now)
      next.setUTCHours(nextHour === 24 ? 0 : nextHour, 0, 0, 0)
      if (nextHour === 24) next.setUTCDate(next.getUTCDate() + 1)
      return {
        fundingRate: null, // null 表示无真实数据
        nextFundingTime: String(next.getTime()),
        markPrice: d.last||'0',
        indexPrice: d.open24h||'0'
      }
    } catch { return null }
  }
}

// ─── 多空比 ───────────────────────────────────────────
export async function getLongShortRatio(baseCcy) {
  try {
    const sym = `${baseCcy}USDT`
    const data = await binapiFetch(`/fapi/v1/globalLongShortAccountRatio?symbol=${sym}&period=5m&limit=1`)
    if (!Array.isArray(data) || !data[0]) return null
    const d = data[0]
    return {
      longAccount: d.longAccount,
      shortAccount: d.shortAccount,
      longShortRatio: d.longShortRatio
    }
  } catch(e) {
    return null // 需要代理，无代理时返回 null
  }
}

// ─── 未平仓量 ─────────────────────────────────────────
export async function getOpenInterest(baseCcy) {
  try {
    const sym = `${baseCcy}USDT`
    const data = await binapiFetch(`/fapi/v1/openInterest?symbol=${sym}`)
    if (!data || !data.openInterest) return null
    return {
      oi: data.openInterest,
      oiCcy: data.openInterest,
      oiUsd: String(parseFloat(data.openInterest) * parseFloat(data.time||0) / 1e13)
    }
  } catch(e) {
    return null // 需要代理
  }
}

// ─── 汇率 ─────────────────────────────────────────────
export async function getUsdtCnyRate() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD')
    const d = await res.json()
    return d.rates?.CNY||7.25
  } catch { return 7.25 }
}

// ─── WebSocket ────────────────────────────────────────
export class OkxWebSocket {
  constructor() {
    this.ws=null; this.subscriptions=new Set()
    this.callbacks=new Map(); this.reconnectTimer=null
    this.pingTimer=null; this.connected=false
  }
  connect() {
    if (this.ws&&(this.ws.readyState===WebSocket.OPEN||this.ws.readyState===WebSocket.CONNECTING)) return
    try { this.ws=new WebSocket(WS_URL) } catch { return }
    this.ws.onopen=()=>{
      this.connected=true; clearTimeout(this.reconnectTimer)
      if (this.subscriptions.size>0) this._sub([...this.subscriptions])
      this.pingTimer=setInterval(()=>{ if(this.ws?.readyState===WebSocket.OPEN) this.ws.send('ping') },25000)
    }
    this.ws.onmessage=(e)=>{
      if(e.data==='pong') return
      try {
        const msg=JSON.parse(e.data)
        if(msg.arg?.channel==='tickers'&&msg.data?.[0]) {
          const t=msg.data[0]
          const last=parseFloat(t.last||0), open=parseFloat(t.open24h||0)
          if(open>0) t.change24h=String((last-open)/open)
          ;(this.callbacks.get(t.instId)||[]).forEach(cb=>cb(t))
        }
      } catch {}
    }
    this.ws.onclose=()=>{
      this.connected=false; clearInterval(this.pingTimer)
      this.reconnectTimer=setTimeout(()=>this.connect(),3000)
    }
    this.ws.onerror=()=>{ try{this.ws.close()}catch{} }
  }
  _sub(ids) {
    if(this.ws?.readyState!==WebSocket.OPEN) return
    this.ws.send(JSON.stringify({op:'subscribe',args:ids.map(id=>({channel:'tickers',instId:id}))}))
  }
  subscribe(instId,cb) {
    if(!this.callbacks.has(instId)) this.callbacks.set(instId,[])
    this.callbacks.get(instId).push(cb)
    if(!this.subscriptions.has(instId)) {
      this.subscriptions.add(instId)
      if(!this.connected) this.connect(); else this._sub([instId])
    }
  }
  unsubscribe(instId,cb) {
    const cbs=(this.callbacks.get(instId)||[]).filter(c=>c!==cb)
    if(cbs.length===0) {
      this.callbacks.delete(instId); this.subscriptions.delete(instId)
      if(this.ws?.readyState===WebSocket.OPEN)
        this.ws.send(JSON.stringify({op:'unsubscribe',args:[{channel:'tickers',instId}]}))
    } else this.callbacks.set(instId,cbs)
  }
  disconnect() { clearInterval(this.pingTimer); clearTimeout(this.reconnectTimer); try{this.ws?.close()}catch{} }
}
export const okxWs=new OkxWebSocket()

// ─── 工具函数 ─────────────────────────────────────────
export function formatPrice(p) {
  const v=parseFloat(p); if(!v&&v!==0) return '--'
  if(v>=10000) return v.toLocaleString('zh-CN',{maximumFractionDigits:1})
  if(v>=1000) return v.toLocaleString('zh-CN',{maximumFractionDigits:2})
  if(v>=1) return v.toFixed(4)
  if(v>=0.01) return v.toFixed(6)
  return v.toFixed(8)
}
export function formatChange(c) { const v=parseFloat(c)*100; return `${v>=0?'+':''}${v.toFixed(2)}%` }
export function changeClass(c) { const v=parseFloat(c); return v>0?'up':v<0?'down':'flat' }
export function formatVol(v) {
  const n=parseFloat(v); if(isNaN(n)) return '--'
  if(n>=1e12) return (n/1e12).toFixed(2)+'T'
  if(n>=1e9) return (n/1e9).toFixed(2)+'B'
  if(n>=1e6) return (n/1e6).toFixed(2)+'M'
  if(n>=1e3) return (n/1e3).toFixed(1)+'K'
  return n.toFixed(0)
}
