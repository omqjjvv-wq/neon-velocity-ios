# NEON VELOCITY — Structure

## 分層原則

React 只持有全螢幕畫布的生命週期與最小化載入狀態；Babylon.js 負責渲染場景、相機、幾何、光線與畫面更新；所有規則、輸入、分數與實體都位於框架無關的 `client/src/game/`。任何 UI 呈現都經由 `GameWorld` 的狀態快照或回呼更新，不讓 React 參與每一影格的遊戲運算。

## 模組

| 模組 | 位置 | 責任 |
| --- | --- | --- |
| `GameCanvas` | `client/src/components/GameCanvas.tsx` | 安全初始化與釋放 Babylon 引擎，處理尺寸改變與 React StrictMode。 |
| `scene` | `client/src/game/scene.ts` | 建立場景、鏡頭、燈光與 `GameWorld`，回傳符合生命週期契約的 `GameHandle`。 |
| `GameWorld` | `client/src/game/GameWorld.ts` | 遊戲狀態機、更新迴圈、難度、分數、碰撞與總體釋放。 |
| `Player` | `client/src/game/Player.ts` | 玩家楔形飛行器、三軌位移、衝刺外觀與碰撞範圍。 |
| `Track` | `client/src/game/Track.ts` | 三條跑道、邊緣刻度、前進速度與無縫回收。 |
| `ObstacleManager` | `client/src/game/ObstacleManager.ts` | 障礙與收集物的安全節拍生成、回收、碰撞候選與演進難度。 |
| `InputManager` | `client/src/game/InputManager.ts` | 將鍵盤、滑鼠與觸控轉成切線、衝刺、暫停、開始與重試動作。 |
| `HudLayer` | `client/src/game/HudLayer.ts` | 程式化 GUI：速度、分數、連擊、開始、結算與行動裝置提示。 |
| `AudioManager` | `client/src/game/AudioManager.ts` | 在第一次使用者輸入後啟用瀏覽器合成音效；可停用且無自動播放依賴。 |
| `types` | `client/src/game/types.ts` | `GameMode`、`GameSnapshot`、輸入動作與實體列舉等共享型別。 |

## 狀態流

`READY → PLAYING → CRASHED → READY` 是主循環；`PAUSED` 僅能由 `PLAYING` 進入與回復。`InputManager` 輸出語義動作，由 `GameWorld` 唯一決定狀態轉移。每一影格由 `GameWorld.update(delta)` 更新輸入結果、玩家、跑道、生成管理器、分數與 HUD；在 `CRASHED` 狀態停止遊戲實體前進但保留短促撞擊視覺。

## 視覺與資料邊界

玩家、跑道、障礙、晶片與速度粒子均以可釋放的 Babylon meshes 形成。主美術、跑道、障礙、速度線和圖標資產只作為畫面基準與開始畫面的材質，網址集中記錄於 `ASSETS.md`。遊戲內每一個可視元素都有一個明確擁有者與 `dispose` 路徑，避免重新開始後累積節點或事件監聽器。

## 兩個獨立遊戲產品邊界

本專案包含兩個獨立遊戲，而不是一款遊戲的單一更新。`/original` 是 **NEON VELOCITY**，根路由 `/` 與 `/error-dimension` 是 **NEON VELOCITY:ERROR DIMENSION**。兩款遊戲可以共用 Babylon.js 核心與同一個 NEON ID 登入身份，但 `leaderboardEntries.gameVariant` 會將最佳分數、排行榜名次、個人資料與分享卡分開保存；一款遊戲的成績不會出現在另一款遊戲的排行榜。

NEON ID 是跨瀏覽器共用的玩家身份。玩家可以使用既有名稱與六位遊戲碼登入兩款遊戲，而每款遊戲會以目前變體讀取和提交自己的榜單。未登入玩家仍可遊玩，但正式提交分數、查看個人榜單紀錄與分享成績需要先登入 NEON ID。
