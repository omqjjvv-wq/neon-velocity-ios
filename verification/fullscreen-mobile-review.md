# Fullscreen Error 手机视觉验证

验证入口：`/error-dimension?demo&debug-anomaly=fullscreen`，视口 390×844。

审查结果：运行中可见全画面横向扫描线、青／粉／黄分层边缘与大范围错位框；顶部异常标题显示「全畫面錯誤」，左侧本局纪录同步显示 10s 事件。底部「衝刺中／暫停／重置」三个控制按钮保持可见、可读，没有被 fullscreen 覆盖层遮挡。3D 字符切片与 HUD 错误层均采用 pointer-events none 或不可拾取设置，不改变玩家实体碰撞规则。
