# NEON VELOCITY：iPhone、iPad 與 iPod touch

這個 iOS 工程使用一個通用 App，同時支援 iPhone／iPod touch 與 iPad，不需要製作三個獨立 App。Xcode 專案的 `TARGETED_DEVICE_FAMILY` 已設定為 `1,2`。

目前工程最低部署版本是 iOS 15，因此主要支援：

- iPhone：執行 iOS 15 或更新版本
- iPad：執行 iPadOS 15 或更新版本
- iPod touch：第 7 代（能執行 iOS 15）

較舊的 iPod touch（例如第 6 代）最高只能使用較舊 iOS，不能直接使用目前這個 Capacitor 8 工程。若要支援舊 iPod touch，需要另做一個舊版 iOS 工程與較舊的相容 WebView 方案。

在 Mac 上建置：

```bash
pnpm install
pnpm build:client
pnpm exec cap sync ios
pnpm exec cap open ios
```

在 Xcode 選擇 `App` Target，於 Signing & Capabilities 選擇 Apple Account，然後選擇 iPhone、iPad 或 iPod touch 作為執行裝置。要發布給其他人，請使用 Product → Archive，再透過 TestFlight 或 App Store Connect 發布。

這個環境已準備好通用 iOS 工程，但沒有 macOS／Xcode，所以無法在這裡產生已簽名 IPA。
