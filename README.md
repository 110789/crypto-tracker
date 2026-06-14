# 加密追踪 - Crypto Tracker

开源加密货币行情 & 持仓追踪 Android APP

## 功能
- 📈 实时行情（OKX 公开接口，30秒自动刷新）
- 🔍 搜索所有 OKX 现货币种
- 💼 手动记录持仓（买入均价、数量）
- 💰 自动计算盈亏
- 🇨🇳 中文界面
- 📱 数据完全本地存储，不上传任何信息

## 获取 APK

### 方法一：GitHub Actions 自动编译（推荐）
1. Fork 本仓库
2. 进入 Actions 页面
3. 点击 `Build APK` → `Run workflow`
4. 等待约 5 分钟编译完成
5. 在 Artifacts 里下载 `crypto-tracker-apk.zip`，解压得到 APK

### 方法二：本地编译
```bash
npm install
npm run build
npx cap add android
npx cap sync android
cd android && ./gradlew assembleDebug
```

## 数据说明
- 行情数据来自 OKX 公开接口，无需登录或 API Key
- 持仓数据存储在手机本地，不联网传输
- 仅供参考，不构成投资建议
