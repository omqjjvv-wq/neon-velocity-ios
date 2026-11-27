# NEON VELOCITY iOS 工程

這是 Capacitor iOS 原生工程，已同步原版 NEON VELOCITY 遊戲內容。

## 在 Mac 上建置

1. 安裝 Xcode、Node.js、pnpm 和 CocoaPods。
2. 解壓縮工程後，在專案目錄執行：

```bash
pnpm install
pnpm build:client
pnpm exec cap sync ios
pnpm exec cap open ios
```

3. 在 Xcode 選擇 `ios/App` 專案。
4. 在 Signing & Capabilities 選擇自己的 Apple Developer Team。
5. 連接 iPhone 或選擇模擬器，按 Run 測試。
6. 如需 IPA，使用 Xcode 的 Archive，再透過 TestFlight 或 App Store Connect 發布。

這個工程不是已簽名的 IPA。沒有 Apple Developer 簽名時，不能直接在 iPhone 安裝。
