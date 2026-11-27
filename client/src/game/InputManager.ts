/** DESIGN REMINDER — 每一個輸入都轉譯為立即、可預測的語義動作，不讓原始按鍵滲入玩法模組。 */
import type { GameAction } from "./types";

export class InputManager {
  private readonly keyDown: (event: KeyboardEvent) => void;
  private readonly keyUp: (event: KeyboardEvent) => void;
  private readonly pointerDown: (event: PointerEvent) => void;
  private readonly command: (event: Event) => void;

  constructor(canvas: HTMLCanvasElement, private readonly onAction: (action: GameAction) => void) {
    this.keyDown = (event) => {
      const key = event.key.toLowerCase();
      if (["arrowleft", "arrowright", "a", "d", " ", "enter", "p", "r"].includes(key)) event.preventDefault();
      if ((key === "arrowleft" || key === "a") && !event.repeat) this.onAction("left");
      if ((key === "arrowright" || key === "d") && !event.repeat) this.onAction("right");
      if (key === " " && !event.repeat) { this.onAction("start"); this.onAction("sprint-on"); }
      if (key === "enter" && !event.repeat) this.onAction("start");
      if (key === "p" && !event.repeat) this.onAction("pause");
      if (key === "r" && !event.repeat) this.onAction("restart");
    };
    this.keyUp = (event) => { if (event.key === " ") this.onAction("sprint-off"); };
    this.pointerDown = (event) => {
      const rect = canvas.getBoundingClientRect();
      this.onAction(event.clientX - rect.left < rect.width / 2 ? "left" : "right");
      this.onAction("start");
    };
    this.command = (event) => {
      const value = (event as CustomEvent<string>).detail;
      if (value === "start" || value === "restart" || value === "pause" || value === "sprint-toggle") this.onAction(value);
    };
    window.addEventListener("keydown", this.keyDown, { passive: false });
    window.addEventListener("keyup", this.keyUp);
    canvas.addEventListener("pointerdown", this.pointerDown);
    window.addEventListener("neon-velocity-command", this.command);
  }

  dispose() {
    window.removeEventListener("keydown", this.keyDown);
    window.removeEventListener("keyup", this.keyUp);
    window.removeEventListener("neon-velocity-command", this.command);
  }
}
