/**
 * DESIGN REMINDER — 遊戲世界只保留生存所需的幾何、分數與節奏；失誤必須清楚，重試必須立即。
 */
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import type { Scene } from "@babylonjs/core/scene";
import { AudioManager } from "./AudioManager";
import { InputManager } from "./InputManager";
import { ObstacleManager } from "./ObstacleManager";
import { Player } from "./Player";
import { getDifficultyLevel, getHudSpeed, getWorldSpeed } from "./speedCurve";
import { advanceErrorWave, createErrorAnomalySequence, ERROR_WAVE_START_DISTANCE, getErrorAnomaly, getErrorAnomalyFamily, isKnownErrorAnomalyKind, getErrorGameplayInterference, getErrorSpeedMultiplier, getErrorWaveFeedback, getErrorWaveRate, isErrorPreparationWindow, isMirrorAnomaly, makeErrorAnomalyRecord, recoverErrorWave, type ErrorAnomaly, type ErrorAnomalyKind, type ErrorAnomalyRecord } from "./errorDimension";
import { Track } from "./Track";
import type { GameAction, GameMode, GameSnapshot, GameVariant } from "./types";
import { getAnomalyText, getCommonText, getStoredLanguage } from "@/lib/locale";

const getElement = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;
const getForcedAnomaly = (): ErrorAnomalyKind | null => {
  const value = new URLSearchParams(window.location.search).get("debug-anomaly");
  return value && isKnownErrorAnomalyKind(value) ? value : null;
};

export class GameWorld {
  private readonly player: Player;
  private readonly track: Track;
  private readonly obstacles: ObstacleManager;
  private readonly input: InputManager;
  private readonly audio = new AudioManager();
  private mode: GameMode = "ready";
  private score = 0;
  private chain = 0;
  private elapsed = 0;
  private best = Number(localStorage.getItem("neon-velocity-best") || 0);
  private flash = 0;
  private launchPulse = 0;
  private readonly variant: GameVariant;
  private errorAnomaly: ErrorAnomaly | null = null;
  private lastErrorIndex = -1;
  private errorSequence: ErrorAnomalyKind[] = [];
  private errorHistory: ErrorAnomalyRecord[] = [];
  private readonly flashMat: StandardMaterial;
  private readonly errorWave: Mesh;
  private readonly errorWaveMat: StandardMaterial;
  private readonly textWave: Mesh;
  private readonly textWaveMat: StandardMaterial;
  private readonly fullscreenOverlay: Mesh;
  private readonly fullscreenSlices: Mesh[];
  private readonly fullscreenMat: StandardMaterial;
  private readonly fullscreenTextMat: StandardMaterial;
  private readonly fullscreenTextSlices: Mesh[];
  private readonly mirrorMat: StandardMaterial;
  private readonly mirrorSignals: Mesh[];
  private readonly debtSquareMat: StandardMaterial;
  private readonly debtSquare: Mesh;
  private readonly debtTextMat: StandardMaterial;
  private readonly debtText: Mesh;
  private errorWaveDistance = ERROR_WAVE_START_DISTANCE;

  constructor(private readonly scene: Scene, canvas: HTMLCanvasElement, private readonly demo: boolean, variant: GameVariant = "original") {
    this.variant = variant;
    scene.clearColor = new Color4(.055, .062, .078, 1);
    this.player = new Player(scene);
    this.track = new Track(scene);
    this.obstacles = new ObstacleManager(scene);
    this.input = new InputManager(canvas, (action) => this.handleAction(action));
    this.flashMat = new StandardMaterial("crash-flash", scene);
    this.flashMat.diffuseColor = Color3.FromHexString("#F4F1E8");
    this.flashMat.emissiveColor = Color3.FromHexString("#F4F1E8");
    this.flashMat.alpha = 0;
    const flash = MeshBuilder.CreatePlane("crash-flash", { width: 42, height: 26 }, scene);
    flash.position.set(0, 5, -2);
    flash.billboardMode = 7;
    flash.material = this.flashMat;
    flash.isPickable = false;
    this.errorWaveMat = new StandardMaterial("error-wave", scene);
    this.errorWaveMat.diffuseColor = Color3.FromHexString("#A78BFA");
    this.errorWaveMat.emissiveColor = Color3.FromHexString("#FF66C4");
    this.errorWaveMat.alpha = .78;
    this.errorWave = MeshBuilder.CreateBox("error-wave", { width: 13.2, height: 1.6, depth: .24 }, scene);
    this.errorWave.position.set(0, .95, -this.errorWaveDistance);
    this.errorWave.material = this.errorWaveMat;
    this.errorWave.isPickable = false;
    this.errorWave.isVisible = false;
    const waveTextTexture = new DynamicTexture("error-wave-text-glitch-texture", { width: 1024, height: 192 }, scene, true);
    waveTextTexture.hasAlpha = true;
    waveTextTexture.drawText("ERROR WAVE // TEXT OVERRIDE", 24, 118, "bold 54px monospace", "#F4F1E8", "transparent", true, true);
    this.textWaveMat = new StandardMaterial("error-wave-text-glitch-material", scene);
    this.textWaveMat.diffuseTexture = waveTextTexture;
    this.textWaveMat.emissiveTexture = waveTextTexture;
    this.textWaveMat.emissiveColor = Color3.FromHexString("#FF66C4");
    this.textWaveMat.alpha = .98;
    this.textWaveMat.transparencyMode = 2;
    this.textWave = MeshBuilder.CreatePlane("error-wave-text-layer", { width: 11.5, height: 1.25 }, scene);
    this.textWave.position.set(0, .95, -this.errorWaveDistance - .18);
    this.textWave.material = this.textWaveMat;
    this.textWave.billboardMode = 7;
    this.textWave.isPickable = false;
    this.textWave.isVisible = false;
    this.fullscreenMat = new StandardMaterial("fullscreen-error-material", scene);
    this.fullscreenMat.diffuseColor = Color3.FromHexString("#FF66C4");
    this.fullscreenMat.emissiveColor = Color3.FromHexString("#66E3FF");
    this.fullscreenMat.alpha = 0;
    this.fullscreenMat.transparencyMode = 2;
    this.fullscreenOverlay = MeshBuilder.CreatePlane("fullscreen-error-overlay", { width: 42, height: 26 }, scene);
    this.fullscreenOverlay.position.set(0, 5, -1.2);
    this.fullscreenOverlay.billboardMode = 7;
    this.fullscreenOverlay.material = this.fullscreenMat;
    this.fullscreenOverlay.isPickable = false;
    this.fullscreenOverlay.isVisible = false;
    const fullscreenTextTexture = new DynamicTexture("fullscreen-error-character-texture", { width: 1280, height: 256 }, scene, true);
    fullscreenTextTexture.hasAlpha = true;
    fullscreenTextTexture.drawText("FULLSCREEN//ERROR  0xFF  REASSEMBLE", 24, 154, "bold 66px monospace", "#F4F1E8", "transparent", true, true);
    this.fullscreenTextMat = new StandardMaterial("fullscreen-error-character-material", scene);
    this.fullscreenTextMat.diffuseTexture = fullscreenTextTexture;
    this.fullscreenTextMat.emissiveTexture = fullscreenTextTexture;
    this.fullscreenTextMat.emissiveColor = Color3.FromHexString("#66E3FF");
    this.fullscreenTextMat.alpha = .96;
    this.fullscreenTextMat.transparencyMode = 2;
    this.fullscreenTextSlices = Array.from({ length: 4 }, (_, index) => {
      const slice = MeshBuilder.CreatePlane(`fullscreen-error-character-slice-${index}`, { width: 18 - index * 2, height: .72 }, scene);
      slice.position.set((index % 2 ? 2.3 : -2.3), 2.2 + index * 1.35, -1.3 - index * .02);
      slice.billboardMode = 7;
      slice.material = this.fullscreenTextMat;
      slice.isPickable = false;
      slice.isVisible = false;
      return slice;
    });
    this.fullscreenSlices = Array.from({ length: 6 }, (_, index) => {
      const slice = MeshBuilder.CreatePlane(`fullscreen-error-slice-${index}`, { width: 42, height: .7 + (index % 3) * .35 }, scene);
      slice.position.set(0, 1.2 + index * 1.45, -1.05 - index * .01);
      slice.billboardMode = 7;
      slice.material = this.fullscreenMat;
      slice.isPickable = false;
      slice.isVisible = false;
      return slice;
    });
    this.mirrorMat = new StandardMaterial("mirror-signal", scene);
    this.mirrorMat.diffuseColor = Color3.FromHexString("#FF66C4");
    this.mirrorMat.emissiveColor = Color3.FromHexString("#FF66C4");
    this.mirrorMat.alpha = .9;
    const mirrorLeft = MeshBuilder.CreateBox("mirror-left", { width: 2.9, height: .18, depth: .22 }, scene);
    const mirrorRight = MeshBuilder.CreateBox("mirror-right", { width: 2.9, height: .18, depth: .22 }, scene);
    mirrorLeft.position.set(-7.1, 2.2, 8);
    mirrorRight.position.set(7.1, 2.2, 8);
    mirrorLeft.rotation.z = -.5;
    mirrorRight.rotation.z = .5;
    mirrorLeft.material = this.mirrorMat;
    mirrorRight.material = this.mirrorMat;
    mirrorLeft.isPickable = mirrorRight.isPickable = false;
    mirrorLeft.isVisible = mirrorRight.isVisible = false;
    this.mirrorSignals = [mirrorLeft, mirrorRight];
    this.debtSquareMat = new StandardMaterial("debt-build-square-material", scene);
    this.debtSquareMat.diffuseColor = Color3.FromHexString("#F4F1E8");
    this.debtSquareMat.emissiveColor = Color3.FromHexString("#FF4D00");
    this.debtSquareMat.alpha = .32;
    this.debtSquareMat.transparencyMode = 2;
    this.debtSquare = MeshBuilder.CreateBox("debt-build-square", { width: 3.8, height: 3.8, depth: .12 }, scene);
    this.debtSquare.position.set(0, 3.1, 7.2);
    this.debtSquare.material = this.debtSquareMat;
    this.debtSquare.isPickable = false;
    this.debtSquare.isVisible = false;
    const debtTexture = new DynamicTexture("debt-build-draft-texture", { width: 1024, height: 256 }, scene, true);
    debtTexture.hasAlpha = true;
    debtTexture.drawText("欠費版 // GAME", 28, 154, "bold 72px monospace", "#F4F1E8", "transparent", true, true);
    this.debtTextMat = new StandardMaterial("debt-build-draft-text-material", scene);
    this.debtTextMat.diffuseTexture = debtTexture;
    this.debtTextMat.emissiveTexture = debtTexture;
    this.debtTextMat.emissiveColor = Color3.FromHexString("#F4F1E8");
    this.debtTextMat.alpha = .96;
    this.debtTextMat.transparencyMode = 2;
    this.debtText = MeshBuilder.CreatePlane("debt-build-draft-text", { width: 7.8, height: 1.7 }, scene);
    this.debtText.position.set(0, 3.1, 7.02);
    this.debtText.billboardMode = 7;
    this.debtText.material = this.debtTextMat;
    this.debtText.isPickable = false;
    this.debtText.isVisible = false;
    this.syncHud();
    this.syncErrorHistory();
    if (demo) window.setTimeout(() => this.start(), 260);
  }

  private snapshot(): GameSnapshot {
    return { mode: this.mode, score: Math.floor(this.score), speed: this.currentSpeed(), chain: this.chain, best: this.best };
  }

  public isRenderThrottled() { return this.errorAnomaly?.kind === "lag"; }

  private currentSpeed() {
    return getHudSpeed(this.elapsed, this.player.isSprinting()) * getErrorGameplayInterference(this.errorAnomaly, this.elapsed).speedMultiplier;
  }

  private syncHud() {
    const state = this.snapshot();
    const shell = getElement<HTMLDivElement>("nv-shell");
    if (shell) {
      shell.dataset.mode = state.mode;
      shell.dataset.sprinting = String(this.player.isSprinting());
      shell.dataset.speedTier = state.speed >= 1500 ? "overdrive" : state.speed >= 900 ? "fast" : "base";
      shell.dataset.launch = String(this.launchPulse > 0);
      shell.dataset.variant = this.variant;
      shell.dataset.errorAnomaly = this.errorAnomaly?.kind ?? "none";
      shell.dataset.errorWaveDistance = this.variant === "error-dimension" ? this.errorWaveDistance.toFixed(1) : "inactive";
      shell.dataset.errorPreparation = this.variant === "error-dimension" && isErrorPreparationWindow(this.elapsed) ? "true" : "false";
      shell.dataset.errorVisual = this.errorAnomaly?.kind ?? "none";
      shell.dataset.echoGhosts = this.errorAnomaly?.kind === "echo" ? "visible" : "hidden";
      shell.dataset.mirrorSignals = this.errorAnomaly?.kind === "mirror" ? "visible" : "hidden";
      shell.dataset.prismSplit = this.errorAnomaly?.kind === "prism" ? "visible" : "hidden";
      shell.dataset.surgePulse = this.errorAnomaly?.kind === "surge" ? "visible" : "hidden";
      shell.dataset.textLayer = this.errorAnomaly?.kind === "text" ? "visible" : "hidden";
      shell.dataset.fullscreenError = this.errorAnomaly?.kind === "fullscreen" ? "visible" : "hidden";
      shell.dataset.planeShift = this.errorAnomaly?.kind === "plane" ? "visible" : "hidden";
      shell.dataset.superLag = this.errorAnomaly?.kind === "lag" ? "visible" : "hidden";
      shell.dataset.debtBuild = this.errorAnomaly?.kind === "debt" ? "visible" : "hidden";
      shell.dataset.anomalyFamily = String(getErrorAnomalyFamily(this.errorAnomaly?.kind));
      shell.dataset.anomalySerial = this.errorAnomaly?.kind.match(/^anomaly-(\d{3})$/)?.[1] ?? "core";
    }
    const score = getElement("nv-score");
    const speed = getElement("nv-speed");
    const chain = getElement("nv-chain");
    if (score) score.textContent = String(state.score).padStart(6, "0");
    if (speed) speed.textContent = String(state.speed);
    if (chain) chain.textContent = `×${String(state.chain).padStart(2, "0")}`;
    const sprintToggle = getElement<HTMLButtonElement>("nv-sprint-toggle");
    if (sprintToggle) {
      const sprinting = this.player.isSprinting();
      sprintToggle.textContent = sprinting ? "衝刺中" : "衝刺";
      sprintToggle.setAttribute("aria-pressed", String(sprinting));
    }
    const start = getElement("nv-start-panel");
    const crash = getElement("nv-crash-panel");
    if (start) start.hidden = state.mode !== "ready";
    if (crash) crash.hidden = state.mode !== "crashed";
    const crashScore = getElement("nv-crash-score");
    if (crashScore) crashScore.textContent = String(state.score).padStart(6, "0");
    const eventPanel = getElement<HTMLElement>("nv-dimension-event");
    const eventTitle = getElement("nv-dimension-event-title");
    const eventDetail = getElement("nv-dimension-event-detail");
    const common = getCommonText(getStoredLanguage());
    const preparing = this.variant === "error-dimension" && isErrorPreparationWindow(this.elapsed);
    if (eventPanel) eventPanel.hidden = this.variant !== "error-dimension" || (!this.errorAnomaly && !preparing);
    if (eventTitle) eventTitle.textContent = preparing ? common.nextAnomaly : this.errorAnomaly?.title ?? common.dimension;
    if (eventDetail) eventDetail.textContent = preparing ? common.prepare : this.errorAnomaly?.detail ?? common.rulesSoon;
  }

  private syncErrorHistory() {
    const historyPanel = getElement<HTMLElement>("nv-dimension-history");
    const historyList = getElement<HTMLOListElement>("nv-dimension-history-list");
    const crashHistory = getElement<HTMLElement>("nv-crash-history");
    const crashHistoryList = getElement<HTMLOListElement>("nv-crash-history-list");
    const visible = this.variant === "error-dimension" && this.errorHistory.length > 0;
    if (historyPanel) historyPanel.hidden = !visible;
    if (crashHistory) crashHistory.hidden = !visible;

    const render = (list: HTMLOListElement | null) => {
      if (!list) return;
      const fragment = document.createDocumentFragment();
      this.errorHistory.slice(-4).forEach((record) => {
        const item = document.createElement("li");
        const time = document.createElement("b");
        const copy = document.createElement("span");
        time.textContent = `${String(record.triggeredAt).padStart(2, "0")}s`;
        copy.textContent = `${record.title}／${record.detail}`;
        item.append(time, copy);
        fragment.append(item);
      });
      list.replaceChildren(fragment);
    };

    render(historyList);
    render(crashHistoryList);
  }

  private handleAction(action: GameAction) {
    this.audio.unlock();
    const interference = getErrorGameplayInterference(this.errorAnomaly, this.elapsed);
    if (action === "left" && this.mode === "playing") { this.player.move((-1 * interference.controlDirection) as -1 | 1); this.audio.beep(310, .025, .012); }
    if (action === "right" && this.mode === "playing") { this.player.move((1 * interference.controlDirection) as -1 | 1); this.audio.beep(370, .025, .012); }
    if (action === "sprint-on" && this.mode === "playing") this.player.setSprint(true);
    if (action === "sprint-off") this.player.setSprint(false);
    if (action === "sprint-toggle" && this.mode === "playing") this.player.setSprint(!this.player.isSprinting());
    if (action === "start") {
      if (this.mode === "ready" || this.mode === "crashed") this.start();
      else if (this.mode === "paused") { this.mode = "playing"; this.syncHud(); }
    }
    if (action === "restart") this.start();
    if (action === "pause" && (this.mode === "playing" || this.mode === "paused")) {
      this.mode = this.mode === "playing" ? "paused" : "playing";
      this.player.setSprint(false);
      this.syncHud();
    }
  }

  start() {
    this.mode = "playing";
    this.score = 0;
    this.chain = 0;
    this.errorAnomaly = null;
    this.lastErrorIndex = -1;
    const forcedAnomaly = this.variant === "error-dimension" ? getForcedAnomaly() : null;
    this.elapsed = forcedAnomaly ? 10 : 0;
    this.errorSequence = this.variant === "error-dimension" ? (forcedAnomaly ? [forcedAnomaly, ...createErrorAnomalySequence(64, Math.random, forcedAnomaly)] : createErrorAnomalySequence()) : [];
    this.errorHistory = [];
    this.errorWaveDistance = ERROR_WAVE_START_DISTANCE;
    this.errorWave.position.z = -this.errorWaveDistance;
    this.errorWave.isVisible = false;
    this.textWave.isVisible = false;
    this.fullscreenOverlay.isVisible = false;
    this.fullscreenSlices.forEach(slice => { slice.isVisible = false; });
    this.fullscreenTextSlices.forEach(slice => { slice.isVisible = false; });
    this.fullscreenMat.alpha = 0;
    this.mirrorSignals.forEach(signal => { signal.isVisible = false; });
    this.debtSquare.isVisible = false;
    this.debtText.isVisible = false;
    this.track.setAnomalyVisual(null, 0);
    this.flash = 0;
    this.launchPulse = 1.8;
    this.player.reset();
    this.obstacles.reset();
    this.audio.beep(510, .08, .04, "sawtooth");
    this.syncHud();
    this.syncErrorHistory();
  }

  private crash() {
    if (this.mode !== "playing") return;
    this.mode = "crashed";
    this.player.setSprint(false);
    this.errorWave.isVisible = false;
    this.textWave.isVisible = false;
    this.fullscreenOverlay.isVisible = false;
    this.fullscreenSlices.forEach(slice => { slice.isVisible = false; });
    this.fullscreenTextSlices.forEach(slice => { slice.isVisible = false; });
    this.fullscreenMat.alpha = 0;
    this.mirrorSignals.forEach(signal => { signal.isVisible = false; });
    this.debtSquare.isVisible = false;
    this.debtText.isVisible = false;
    this.track.setAnomalyVisual(null, this.elapsed);
    this.flash = .12;
    this.best = Math.max(this.best, Math.floor(this.score));
    localStorage.setItem("neon-velocity-best", String(this.best));
    window.dispatchEvent(new CustomEvent("neon-velocity-run-ended", {
      detail: { score: Math.floor(this.score) },
    }));
    this.audio.beep(95, .2, .08, "sawtooth");
    this.syncHud();
  }

  private collectCrystal() {
    if (this.variant === "error-dimension") this.errorWaveDistance = recoverErrorWave(this.errorWaveDistance);
    this.chain += 1;
    this.score += 120 * Math.max(1, this.chain);
    this.audio.beep(660 + this.chain * 26, .08, .035, "triangle");
  }

  update(delta: number) {
    if (this.flash > 0) {
      this.flash -= delta;
      this.flashMat.alpha = Math.max(0, this.flash * 3.5);
    }
    if (this.launchPulse > 0) this.launchPulse = Math.max(0, this.launchPulse - delta);
    if (this.mode !== "playing") return;
    this.elapsed += delta;
    if (this.variant === "error-dimension") {
      if (this.errorSequence.length > 0 && this.elapsed >= this.errorSequence.length * 10) {
        const previous = this.errorSequence.at(-1);
        this.errorSequence = [...this.errorSequence, ...createErrorAnomalySequence(64, Math.random, previous)];
      }
      const anomaly = getErrorAnomaly(this.elapsed, this.errorSequence);
      if (anomaly && anomaly.index !== this.lastErrorIndex) {
        const [title, detail] = getAnomalyText(getStoredLanguage(), anomaly.kind);
        this.errorAnomaly = { ...anomaly, title, detail };
        this.lastErrorIndex = anomaly.index;
        this.errorHistory.push(makeErrorAnomalyRecord(this.errorAnomaly, this.elapsed));
        window.dispatchEvent(new CustomEvent("neon-velocity-anomaly-encountered", { detail: { kind: this.errorAnomaly.kind } }));
        this.audio.beep(760 + anomaly.index * 22, .1, .035, "square");
        this.syncErrorHistory();
      }
    }
    if (this.variant === "error-dimension" && this.elapsed >= 10) {
      const waveRate = getErrorWaveRate(this.elapsed, this.errorAnomaly);
      this.errorWaveDistance = advanceErrorWave(this.errorWaveDistance, delta, this.elapsed, this.errorAnomaly);
      this.errorWave.position.z = -this.errorWaveDistance;
      this.textWave.position.z = Math.max(-this.errorWaveDistance - .18, 2.5);
      this.textWave.position.x = Math.sin(this.elapsed * 10) * .16;
      this.textWave.scaling.x = 1 + Math.sin(this.elapsed * 18) * .12;
      this.textWave.isVisible = this.errorAnomaly?.kind === "text";
      const fullscreen = this.errorAnomaly?.kind === "fullscreen";
      const plane = this.errorAnomaly?.kind === "plane";
      const lag = this.errorAnomaly?.kind === "lag";
      const debt = this.errorAnomaly?.kind === "debt";
      this.debtSquare.isVisible = debt;
      this.debtText.isVisible = debt;
      this.debtSquare.position.x = Math.sin(this.elapsed * 2.8) * .18;
      this.debtSquare.rotation.z = Math.sin(this.elapsed * 2.2) * .035;
      this.debtSquare.scaling.x = 1 + Math.sin(this.elapsed * 4) * .04;
      this.debtSquare.scaling.y = 1 - Math.sin(this.elapsed * 3.5) * .04;
      this.debtText.position.x = this.debtSquare.position.x;
      this.debtText.rotation.z = this.debtSquare.rotation.z;
      this.fullscreenOverlay.isVisible = fullscreen || plane;
      this.fullscreenOverlay.position.y = plane ? -0.35 : 0;
      this.fullscreenMat.alpha = fullscreen ? .08 + Math.abs(Math.sin(this.elapsed * 21)) * .09 : plane ? .045 + Math.abs(Math.sin(this.elapsed * 4)) * .04 : 0;
      this.fullscreenOverlay.position.x = Math.sin(this.elapsed * (plane ? 5 : 17)) * (plane ? .62 : .25);
      this.fullscreenOverlay.scaling.x = 1 + Math.sin(this.elapsed * 29) * .025;
      this.fullscreenTextSlices.forEach((slice, index) => {
        slice.isVisible = fullscreen || plane;
        slice.position.x = Math.sin(this.elapsed * (plane ? 5 + index : 24 + index) + index) * (plane ? 1.4 + index * .14 : 2.2 + index * .22) + (index % 2 ? 2.3 : -2.3);
        slice.position.y = 2.2 + index * 1.35 + Math.sin(this.elapsed * 27 + index) * .16;
        slice.scaling.x = fullscreen ? 1 + Math.sin(this.elapsed * 37 + index) * .13 : plane ? 1.5 + Math.sin(this.elapsed * 4 + index) * .18 : 1;
      });
      this.fullscreenSlices.forEach((slice, index) => {
        slice.isVisible = fullscreen || plane || lag;
        slice.position.x = Math.sin(this.elapsed * (lag ? 4 : plane ? 5 : 18 + index) + index) * (lag ? .35 : plane ? 1.2 + index * .18 : 1.2 + index * .18);
        slice.position.y = 1.2 + index * 1.45 + Math.sin(this.elapsed * 23 + index) * .18;
        slice.scaling.x = fullscreen ? 1 + Math.sin(this.elapsed * 31 + index) * .08 : plane ? 1.55 : lag ? (Math.floor(this.elapsed * 8) % 2 === 0 ? 1.18 : .72) : 1;
      });
      this.errorWave.isVisible = true;
      const interference = getErrorGameplayInterference(this.errorAnomaly, this.elapsed);
      const feedback = getErrorWaveFeedback(this.errorAnomaly, this.elapsed);
      this.errorWave.scaling.x = feedback.scaleX * interference.wavePressure;
      this.track.setAnomalyVisual(this.errorAnomaly?.kind ?? null, this.elapsed + getErrorGameplayInterference(this.errorAnomaly, this.elapsed).laneSignalOffset);
      const isMirror = this.errorAnomaly?.kind === "mirror";
      this.mirrorSignals.forEach((signal, index) => {
        signal.isVisible = isMirror;
        signal.position.y = 2.2 + Math.sin(this.elapsed * 8 + index) * .1;
        signal.scaling.x = 1 + Math.sin(this.elapsed * 10) * .12;
      });
      this.errorWave.scaling.x = feedback.scaleX * (lag && Math.floor(this.elapsed * 8) % 2 === 1 ? .72 : 1);
      this.errorWave.scaling.y = feedback.scaleY;
      this.errorWave.rotation.z = feedback.tilt;
      this.errorWaveMat.diffuseColor = Color3.FromHexString(feedback.diffuse);
      this.errorWaveMat.emissiveColor = Color3.FromHexString(feedback.emissive);
      if (this.errorWaveDistance <= .12) this.crash();
    }
    if (this.demo) {
      this.player.setLane(this.obstacles.getRecommendedLane());
      this.player.setSprint(true);
    }
    this.player.update(delta);
    const worldSpeed = getWorldSpeed(this.elapsed, this.player.isSprinting()) * getErrorSpeedMultiplier(this.errorAnomaly);
    this.track.update(delta, worldSpeed, this.player.isSprinting());
    const preAnomalyWindow = this.variant === "error-dimension" && isErrorPreparationWindow(this.elapsed);
    this.obstacles.update(delta, worldSpeed, this.player.getX(), getDifficultyLevel(this.elapsed), this.elapsed, () => {
      if (!this.demo) this.crash();
    }, () => this.collectCrystal(), preAnomalyWindow, this.errorAnomaly?.kind ?? null);
    this.score += delta * this.currentSpeed() * .34;
    this.syncHud();
  }

  dispose() {
    this.input.dispose();
    this.audio.dispose();
    this.player.dispose();
    this.track.dispose();
    this.obstacles.dispose();
    this.errorWave.dispose();
    this.errorWaveMat.dispose();
    this.textWave.dispose();
    this.textWaveMat.dispose();
    this.fullscreenOverlay.dispose();
    this.fullscreenSlices.forEach(slice => slice.dispose());
    this.fullscreenTextSlices.forEach(slice => slice.dispose());
    this.fullscreenTextMat.dispose();
    this.fullscreenMat.dispose();
    this.mirrorSignals.forEach(signal => signal.dispose());
    this.mirrorMat.dispose();
    this.debtSquare.dispose();
    this.debtSquareMat.dispose();
    this.debtText.dispose();
    this.debtTextMat.dispose();
    this.flashMat.dispose();
  }
}
