# NEON VELOCITY — Assets

**Art direction：** 瑞士國際主義平面設計的極簡高速街機畫面。近黑石墨背景作為留白空間，骨白提供瞬讀資訊，安全橘只用於速度、危險與互動節點；所有幾何皆採 45 度切角與硬邊，不使用霧化、紫色、擬真材質或持續性霓虹光暈。

## 視覺目標

| 資產 | 用途 | URL |
| --- | --- | --- |
| 主美術基準 | 開始畫面與整體構圖、色彩、節奏的視覺 QA 依據 | `/manus-storage/neon-velocity-visual-target_b10c3f1c.png` |

## 遊戲資產

| 資產 | 用途 | URL |
| --- | --- | --- |
| 跑道材質 | 開始畫面底圖與跑道圖樣參考 | `/manus-storage/neon-velocity-track-texture_89acd77c.png` |
| 障礙圖樣 | 障礙物形狀與色彩參考 | `/manus-storage/neon-velocity-obstacle-sprites_96296d6c.png` |
| 速度線圖樣 | 粒子、殘影與加速軌跡參考 | `/manus-storage/neon-velocity-speed-trails_6229804e.png` |
| 品牌圖標 | 首頁、HUD、Favicon 與跑道內標誌的核心識別 | `/manus-storage/neon-velocity-forward-mark_8f069099.png` |

## 遊戲內實作對照

- **玩家：** 程式化生成的骨白楔形飛行器，中央以安全橘折線切割。
- **障礙：** 程式化生成的橘色封鎖條、骨白閘門與深石墨旋轉菱形。
- **收集物：** 程式化生成的青綠晶片，收集後增加分數並提升連擊。
- **跑道：** 程式化三軌幾何與校準刻度，依速度持續向玩家流動。
- **品牌標誌：** 純圖形的雙軌前進箭頭，以骨白箭頭與短橘色速度槓組成；左上角與 favicon 使用生成版本，跑道則以同一幾何語言的程式化網格呈現。
- **特效：** 程式化三段式白／橘殘影與短促粒子；生成資產作為色彩與構圖參照而不仰賴大量貼圖。
