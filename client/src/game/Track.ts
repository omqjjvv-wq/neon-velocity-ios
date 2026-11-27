/**
 * DESIGN REMINDER — 三條稀疏的石墨跑道、骨白校準刻度和橘色邊緣，以回收而非堆疊表現無限速度。
 */
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import type { Scene } from "@babylonjs/core/scene";
import { getErrorAnomalyFamily, type ErrorAnomalyKind } from "./errorDimension";

interface Marker { mesh: Mesh; phase: number; }

export class Track {
  private readonly markers: Marker[] = [];
  private readonly streaks: Marker[] = [];
  private readonly landmarks: Mesh[] = [];
  private readonly directionSignals: Mesh[] = [];
  private readonly glitchLayers: Mesh[] = [];
  private readonly scanSlices: Mesh[] = [];
  private readonly textLayers: Mesh[] = [];
  private readonly glitchMat: StandardMaterial;
  private readonly textMat: StandardMaterial;
  private elapsed = 0;
  private readonly laneMat: StandardMaterial;
  private readonly paperMat: StandardMaterial;
  private readonly orangeMat: StandardMaterial;

  constructor(scene: Scene) {
    this.laneMat = new StandardMaterial("track-graphite", scene);
    this.laneMat.diffuseColor = Color3.FromHexString("#15191F");
    this.laneMat.emissiveColor = Color3.FromHexString("#080A0E");
    this.paperMat = new StandardMaterial("track-paper", scene);
    this.paperMat.diffuseColor = Color3.FromHexString("#F4F1E8");
    this.paperMat.emissiveColor = Color3.FromHexString("#42413E");
    this.orangeMat = new StandardMaterial("track-orange", scene);
    this.orangeMat.diffuseColor = Color3.FromHexString("#FF4D00");
    this.orangeMat.emissiveColor = Color3.FromHexString("#8C2700");
    this.glitchMat = new StandardMaterial("track-glitch", scene);
    this.glitchMat.diffuseColor = Color3.FromHexString("#66E3FF");
    this.glitchMat.emissiveColor = Color3.FromHexString("#FF66C4");
    this.glitchMat.alpha = .72;
    this.glitchMat.transparencyMode = 2;
    const textTexture = new DynamicTexture("track-text-glitch-texture", { width: 1024, height: 256 }, scene, true);
    textTexture.hasAlpha = true;
    textTexture.drawText("TEXT//LANE  03  02  01", 28, 154, "bold 68px monospace", "#F4F1E8", "transparent", true, true);
    this.textMat = new StandardMaterial("track-text-glitch-material", scene);
    this.textMat.diffuseTexture = textTexture;
    this.textMat.emissiveTexture = textTexture;
    this.textMat.emissiveColor = Color3.FromHexString("#66E3FF");
    this.textMat.alpha = .94;
    this.textMat.transparencyMode = 2;

    for (let i = 0; i < 7; i += 1) {
      const slice = MeshBuilder.CreateBox(`error-scan-slice-${i}`, { width: 9.2, height: .045, depth: .16 }, scene);
      slice.position.set(0, .22, 5 + i * 17);
      slice.material = this.glitchMat;
      slice.isPickable = false;
      slice.isVisible = false;
      this.scanSlices.push(slice);
    }

    [-4, 0, 4].forEach((x) => {
      const lane = MeshBuilder.CreateGround(`lane-${x}`, { width: 3.72, height: 158 }, scene);
      lane.position.set(x, 0, 58);
      lane.material = this.laneMat;
    });

    [-4, 0, 4].forEach((x, laneIndex) => {
      for (let i = 0; i < 5; i += 1) {
        const glitch = MeshBuilder.CreateBox(`glitch-layer-${laneIndex}-${i}`, { width: 2.8, height: .035, depth: 1.8 }, scene);
        glitch.position.set(x, .095, 8 + i * 24);
        glitch.material = this.glitchMat;
        glitch.isVisible = false;
        this.glitchLayers.push(glitch);
        this.landmarks.push(glitch);
        const textLayer = MeshBuilder.CreatePlane(`text-track-layer-${laneIndex}-${i}`, { width: 3.4, height: .86 }, scene);
        textLayer.position.set(x, .13, 12 + i * 24);
        textLayer.rotation.x = Math.PI / 2;
        textLayer.material = this.textMat;
        textLayer.isPickable = false;
        textLayer.isVisible = false;
        this.textLayers.push(textLayer);
      }
    });

    [-6.05, -2, 2, 6.05].forEach((x, railIndex) => {
      for (let i = 0; i < 15; i += 1) {
        const dash = MeshBuilder.CreateBox(`dash-${railIndex}-${i}`, { width: railIndex === 0 || railIndex === 3 ? 0.12 : 0.06, height: 0.055, depth: 4.5 }, scene);
        dash.position.set(x, 0.07, i * 8 - 14);
        dash.material = railIndex === 0 || railIndex === 3 ? this.orangeMat : this.paperMat;
        this.markers.push({ mesh: dash, phase: i * 8 });
      }
    });

    [-6.75, 6.75].forEach((x, side) => {
      for (let i = 0; i < 12; i += 1) {
        const tick = MeshBuilder.CreateBox(`tick-${side}-${i}`, { width: 0.58, height: 0.08, depth: 0.12 }, scene);
        tick.position.set(x, 0.08, i * 10 - 10);
        tick.material = this.paperMat;
        this.markers.push({ mesh: tick, phase: i * 10 + 1 });
      }
    });

    for (let i = 0; i < 18; i += 1) {
      const streak = MeshBuilder.CreateBox(`streak-${i}`, { width: i % 3 === 0 ? 0.15 : 0.06, height: 0.07, depth: 1.5 + (i % 4) * 0.6 }, scene);
      streak.position.set([-4, 0, 4][i % 3] + (i % 2 ? 0.8 : -0.8), 0.1, (i * 7) % 105 - 8);
      streak.material = i % 4 === 0 ? this.orangeMat : this.paperMat;
      this.streaks.push({ mesh: streak, phase: (i * 7) % 105 });
    }

    const addForwardMark = (name: string, x: number, z: number, scale: number) => {
      const y = .12;
      [-1, 1].forEach((side) => {
        const leftRail = MeshBuilder.CreateBox(`${name}-rail-a-${side}`, { width: .13 * scale, height: .07, depth: 1.02 * scale }, scene);
        leftRail.position.set(x + side * .38 * scale, y, z - .16 * scale);
        leftRail.rotation.y = side * .48;
        leftRail.material = this.paperMat;
        const rightRail = MeshBuilder.CreateBox(`${name}-rail-b-${side}`, { width: .13 * scale, height: .07, depth: 1.02 * scale }, scene);
        rightRail.position.set(x + side * .38 * scale, y, z + .48 * scale);
        rightRail.rotation.y = -side * .48;
        rightRail.material = this.paperMat;
        this.landmarks.push(leftRail, rightRail);
      });
      const speedBar = MeshBuilder.CreateBox(`${name}-speed-bar`, { width: 1.34 * scale, height: .08, depth: .12 * scale }, scene);
      speedBar.position.set(x - .24 * scale, y + .01, z - .86 * scale);
      speedBar.material = this.orangeMat;
      this.landmarks.push(speedBar);
    };

    addForwardMark("start-forward-mark", 0, 20, 1.22);
    addForwardMark("horizon-forward-mark", 0, 74, 2.25);
    [-4, 0, 4].forEach((x, laneIndex) => {
      const first = MeshBuilder.CreateBox(`mirror-arrow-a-${laneIndex}`, { width: .12, height: .08, depth: .9 }, scene);
      const second = MeshBuilder.CreateBox(`mirror-arrow-b-${laneIndex}`, { width: .12, height: .08, depth: .9 }, scene);
      first.position.set(x - .32, .16, 10 + laneIndex * 2);
      second.position.set(x + .32, .16, 10 + laneIndex * 2);
      first.rotation.y = -.58;
      second.rotation.y = .58;
      first.material = this.orangeMat;
      second.material = this.orangeMat;
      first.isVisible = second.isVisible = false;
      this.directionSignals.push(first, second);
      this.landmarks.push(first, second);
    });
  }

  setAnomalyVisual(kind: ErrorAnomalyKind | null, elapsed: number) {
    const family = getErrorAnomalyFamily(kind);
    const familyColors = ["#66E3FF", "#66E3FF", "#FF66C4", "#FF7A00", "#FFCF5A", "#FFFFFF", "#B6FF6A", "#A78BFA", "#FF9F43", "#FFFFFF"];
    if (kind === "prism" || family === 2) {
      this.laneMat.diffuseColor = Color3.FromHexString("#24204A");
      this.laneMat.emissiveColor = Color3.FromHexString("#17102F");
      this.paperMat.diffuseColor = Color3.FromHexString("#7DF9FF");
      this.orangeMat.diffuseColor = Color3.FromHexString("#FF66C4");
    } else {
      this.laneMat.diffuseColor = Color3.FromHexString("#15191F");
      this.laneMat.emissiveColor = Color3.FromHexString("#080A0E");
      this.paperMat.diffuseColor = Color3.FromHexString("#F4F1E8");
      this.orangeMat.diffuseColor = Color3.FromHexString(kind === "surge" ? "#FF7A00" : "#FF4D00");
    }
    const visualTime = kind === "lag" ? Math.floor(elapsed * 8) / 8 : elapsed;
    const pulse = kind === "surge" || family === 3 ? 1.8 + Math.sin(elapsed * (14 + family)) * .5 : kind === "prism" || family === 2 ? 1.35 : kind === "plane" ? 1.58 + Math.sin(elapsed * 3) * .22 : 1;
    this.streaks.forEach(({ mesh }) => { mesh.scaling.z = pulse; mesh.visibility = kind === "surge" ? 1 : .92; });
    this.directionSignals.forEach((mesh, index) => {
      mesh.isVisible = kind === "mirror" || family === 4;
      mesh.rotation.y = (index % 2 === 0 ? -.58 : .58) * (kind === "mirror" ? -1 : 1);
      mesh.position.z = 10 + Math.sin(elapsed * 5 + index * .4) * .6;
    });
    const glitchVisible = kind !== null;
    const familyDrift = family === 0 ? .72 : family === 6 ? 1.05 : family === 7 ? .55 : family === 8 ? 1.55 : 1;
    const glitchColor = kind === null ? "#66E3FF" : familyColors[family] ?? "#66E3FF";
    this.glitchMat.diffuseColor = Color3.FromHexString(glitchColor);
    this.glitchMat.emissiveColor = Color3.FromHexString(kind === "echo" ? "#66E3FF" : "#FF66C4");
    const textVisible = kind === "text" || kind === "fullscreen" || family === 5 || family === 9;
    const scanVisible = kind !== null;
    this.scanSlices.forEach((mesh, index) => {
      mesh.isVisible = scanVisible;
      mesh.position.x = Math.sin(visualTime * 13 + index * 1.7) * (kind === "prism" || kind === "fullscreen" ? .8 : kind === "plane" ? 1.05 : kind === "lag" ? .5 : .32);
      mesh.position.y = .2 + Math.sin(visualTime * 17 + index) * (kind === "plane" ? .11 : .06);
      mesh.position.z = 5 + ((index * 17 - visualTime * (kind === "surge" || kind === "fullscreen" || family === 3 ? 22 : kind === "plane" ? 15 : 11 + family)) % 116 + 116) % 116;
      mesh.scaling.x = kind === "echo" ? 1.1 + Math.sin(visualTime * 14 + index) * .12 : kind === "text" || kind === "fullscreen" ? 1.3 + Math.sin(visualTime * 19 + index) * .16 : kind === "plane" ? 1.5 + Math.sin(visualTime * 3 + index) * .2 : kind === "lag" ? 1.08 : 1 + Math.sin(visualTime * 16 + index) * .08;
      mesh.visibility = kind === "text" || kind === "fullscreen" || kind === "plane" || family === 5 || family === 9 ? .88 : kind === "lag" ? (Math.floor(elapsed * 8) % 2 === 0 ? .9 : .32) : .52;
    });
    this.textLayers.forEach((mesh, index) => {
      mesh.isVisible = textVisible;
      mesh.position.x = [-4, 0, 4][index % 3] + Math.sin(elapsed * 12 + index) * .2;
      mesh.position.z = 12 + ((index * 24 - elapsed * 12) % 112 + 112) % 112;
      mesh.scaling.x = 1 + Math.sin(elapsed * 18 + index) * .16;
      mesh.visibility = .95;
    });
    this.glitchLayers.forEach((mesh, index) => {
      mesh.isVisible = glitchVisible;
      mesh.position.x = [-4, 0, 4][index % 3] + Math.sin(visualTime * (9 + family)) * (kind === "prism" ? .75 : kind === "plane" ? 1.1 : kind === "lag" ? .22 : .38 * familyDrift);
      mesh.rotation.z = kind === "plane" ? Math.sin(visualTime * 2 + index) * .22 : family === 6 ? Math.sin(visualTime * 7 + index) * .16 : family === 7 ? Math.sin(visualTime * 4 + index) * .08 : 0;
      mesh.position.z = 8 + ((index * 24 - visualTime * (kind === "surge" ? 18 : kind === "plane" ? 10 : kind === "lag" ? 6 : 8)) % 112 + 112) % 112;
      mesh.scaling.x = kind === "echo" ? 1.2 + Math.sin(visualTime * 12 + index) * .22 : kind === "prism" ? 1.45 : kind === "text" ? 1 + Math.sin(visualTime * 20 + index) * .38 : kind === "plane" ? 1.65 : kind === "lag" ? 1.28 : family === 8 ? 1.18 + Math.sin(visualTime * 11 + index) * .3 : 1;
      mesh.scaling.y = kind === "plane" ? .48 + Math.sin(visualTime * 3 + index) * .08 : family === 7 ? 1.45 + Math.sin(visualTime * 6 + index) * .2 : 1;
      mesh.visibility = kind === "echo" ? .58 : kind === "text" ? .95 : kind === "plane" ? .96 : kind === "lag" ? (Math.floor(elapsed * 8) % 2 === 0 ? .92 : .28) : family === 0 || family === 6 || family === 7 || family === 8 ? .94 : .82;
    });
  }

  update(delta: number, speed: number, sprinting: boolean) {
    this.elapsed += delta * speed;
    const depth = 124;
    this.markers.forEach(({ mesh, phase }) => {
      const z = ((phase - this.elapsed) % depth + depth) % depth - 14;
      mesh.position.z = z;
    });
    const streakSpeed = this.elapsed * (sprinting ? 3.2 : 1.45);
    this.streaks.forEach(({ mesh, phase }) => {
      mesh.position.z = ((phase - streakSpeed) % depth + depth) % depth - 10;
      mesh.scaling.z = 1 + Math.min(1.55, speed / 95) + (sprinting ? 1.25 : 0);
    });
  }

  dispose() { [...this.markers, ...this.streaks].forEach(({ mesh }) => mesh.dispose()); this.landmarks.forEach((mesh) => mesh.dispose()); this.scanSlices.forEach((mesh) => mesh.dispose()); this.textLayers.forEach((mesh) => mesh.dispose()); this.laneMat.dispose(); this.paperMat.dispose(); this.orangeMat.dispose(); this.glitchMat.dispose(); this.textMat.dispose(); }
}
