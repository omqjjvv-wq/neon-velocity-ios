/**
 * DESIGN REMINDER — 危險與獎勵只使用橘、骨白、青綠三種硬邊輪廓；每個節拍都保留一條通路。
 */
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import type { Scene } from "@babylonjs/core/scene";
import { getObstacleSpawnDelay } from "./speedCurve";
import type { ObstacleKind } from "./types";
import type { ErrorAnomalyKind } from "./errorDimension";

const LANES = [-4, 0, 4];
interface Entity { mesh: Mesh; ghost?: Mesh; text?: Mesh; lane: number; kind: ObstacleKind; spun: number; }

export class ObstacleManager {
  private readonly entities: Entity[] = [];
  private nextSpawn = 0.9;
  private sequence = 0;
  private readonly blockMat: StandardMaterial;
  private readonly gateMat: StandardMaterial;
  private readonly crystalMat: StandardMaterial;
  private readonly ghostMat: StandardMaterial;
  private readonly textMat: StandardMaterial;

  constructor(private readonly scene: Scene) {
    this.blockMat = new StandardMaterial("obstacle-orange", scene);
    this.blockMat.diffuseColor = Color3.FromHexString("#FF4D00");
    this.blockMat.emissiveColor = Color3.FromHexString("#C63800");
    this.gateMat = new StandardMaterial("obstacle-paper", scene);
    this.gateMat.diffuseColor = Color3.FromHexString("#F4F1E8");
    this.gateMat.emissiveColor = Color3.FromHexString("#5B5951");
    this.crystalMat = new StandardMaterial("crystal-mint", scene);
    this.crystalMat.diffuseColor = Color3.FromHexString("#A5FFD6");
    this.crystalMat.emissiveColor = Color3.FromHexString("#4DBB91");
    this.ghostMat = new StandardMaterial("echo-ghost", scene);
    this.ghostMat.diffuseColor = Color3.FromHexString("#66E3FF");
    this.ghostMat.emissiveColor = Color3.FromHexString("#66E3FF");
    this.ghostMat.alpha = .34;
    this.ghostMat.transparencyMode = 2;
    const textTexture = new DynamicTexture("text-glitch-texture", { width: 768, height: 256 }, scene, true);
    textTexture.hasAlpha = true;
    textTexture.drawText("ERROR//3D→TXT", 26, 154, "bold 72px monospace", "#F4F1E8", "transparent", true, true);
    this.textMat = new StandardMaterial("text-glitch-material", scene);
    this.textMat.diffuseTexture = textTexture;
    this.textMat.emissiveTexture = textTexture;
    this.textMat.diffuseColor = Color3.FromHexString("#66E3FF");
    this.textMat.emissiveColor = Color3.FromHexString("#FF66C4");
    this.textMat.alpha = .96;
    this.textMat.transparencyMode = 2;
  }

  private addEntity(lane: number, kind: ObstacleKind, z: number, anomalyKind: ErrorAnomalyKind | null = null) {
    let mesh: Mesh;
    if (kind === "block") {
      mesh = MeshBuilder.CreateBox(`block-${this.sequence}`, { width: 2.7, height: 1.5, depth: 0.86 }, this.scene);
      mesh.material = this.blockMat;
      mesh.position.y = 0.78;
    } else if (kind === "gate") {
      mesh = MeshBuilder.CreateBox(`gate-${this.sequence}`, { width: 2.72, height: 2.4, depth: 0.38 }, this.scene);
      mesh.material = this.gateMat;
      mesh.position.y = 1.22;
    } else {
      mesh = MeshBuilder.CreateCylinder(`crystal-${this.sequence}`, { height: 1.25, diameterTop: 0.16, diameterBottom: 0.86, tessellation: 4 }, this.scene);
      mesh.material = this.crystalMat;
      mesh.position.y = 0.82;
      mesh.rotation.x = Math.PI / 2;
    }
    mesh.position.x = LANES[lane];
    mesh.position.z = z;
    mesh.isPickable = false;
    const ghost = anomalyKind === "echo" && kind !== "crystal" ? mesh.clone(`echo-${mesh.name}`) : undefined;
    const text = anomalyKind === "text" && kind !== "crystal" ? MeshBuilder.CreatePlane(`text-${mesh.name}`, { width: 3.1, height: 1.25 }, this.scene) : undefined;
    if (text) {
      text.position.set(mesh.position.x, mesh.position.y, mesh.position.z - .48);
      text.material = this.textMat;
      text.isPickable = false;
      text.isVisible = true;
    }
    if (ghost) {
      ghost.position.x += lane === 1 ? 1.05 : -1.05;
      ghost.position.z += 1.35;
      ghost.material = this.ghostMat;
      ghost.visibility = .95;
      ghost.isPickable = false;
    }
    this.entities.push({ mesh, ghost: ghost ?? undefined, text: text ?? undefined, lane, kind, spun: Math.random() * 5 });
  }

  private spawnPattern(level: number, anomalyKind: ErrorAnomalyKind | null) {
    const safeLane = (this.sequence + Math.floor(level * 1.7)) % 3;
    const z = 92;
    for (let lane = 0; lane < 3; lane += 1) {
      if (lane !== safeLane) this.addEntity(lane, (lane + this.sequence) % 3 === 0 ? "gate" : "block", z, anomalyKind);
    }
    if (this.sequence % 2 === 0 || level > 3) this.addEntity(safeLane, "crystal", z + 8);
    this.sequence += 1;
  }

  update(delta: number, speed: number, playerX: number, level: number, elapsed: number, onCrash: () => void, onCrystal: () => void, preAnomalyWindow = false, anomalyKind: ErrorAnomalyKind | null = null) {
    this.nextSpawn -= delta;
    if (preAnomalyWindow) {
      // Leave a readable preparation gap before each anomaly instead of stacking a wall on top of it.
      this.nextSpawn = Math.max(this.nextSpawn, 0.28);
    } else if (this.nextSpawn <= 0) {
      this.spawnPattern(level, anomalyKind);
      this.nextSpawn = getObstacleSpawnDelay(elapsed);
    }
    for (let index = this.entities.length - 1; index >= 0; index -= 1) {
      const entity = this.entities[index];
      entity.mesh.position.z -= speed * delta;
      if (entity.ghost) { entity.ghost.position.z -= speed * delta; entity.ghost.position.y = entity.mesh.position.y + Math.sin(entity.spun * 2.2) * .08; entity.ghost.scaling.setAll(1 + Math.sin(entity.spun * 3) * .045); }
      if (entity.text) { entity.text.position.x = entity.mesh.position.x + Math.sin(entity.spun * 4) * .12; entity.text.position.y = entity.mesh.position.y + Math.sin(entity.spun * 3) * .16; entity.text.position.z = entity.mesh.position.z - .48; entity.text.rotation.z = Math.sin(entity.spun * 5) * .06; entity.text.scaling.x = 1 + Math.sin(entity.spun * 8) * .14; }
      entity.spun += delta * 4;
      if (entity.kind === "crystal") entity.mesh.rotation.z += delta * 3.4;
      if (entity.kind !== "crystal" && entity.kind === "gate") entity.mesh.rotation.y = Math.sin(entity.spun) * .14;
      const nearZ = Math.abs(entity.mesh.position.z) < 1.35;
      const nearX = Math.abs(entity.mesh.position.x - playerX) < (entity.kind === "crystal" ? 1.48 : 1.38);
      if (nearZ && nearX) {
        if (entity.kind === "crystal") {
          onCrystal();
          entity.mesh.dispose();
          entity.ghost?.dispose();
          entity.text?.dispose();
          this.entities.splice(index, 1);
          continue;
        }
        onCrash();
      }
      if (entity.mesh.position.z < -8) {
        entity.mesh.dispose();
        entity.ghost?.dispose();
        entity.text?.dispose();
        this.entities.splice(index, 1);
      }
    }
  }

  getRecommendedLane() {
    const upcoming = this.entities.filter((entity) => entity.kind !== "crystal" && entity.mesh.position.z > 3 && entity.mesh.position.z < 46);
    if (upcoming.length === 0) return 1;
    const nearestDepth = Math.min(...upcoming.map((entity) => entity.mesh.position.z));
    const blocked = new Set(upcoming.filter((entity) => Math.abs(entity.mesh.position.z - nearestDepth) < 3).map((entity) => entity.lane));
    return [0, 1, 2].find((lane) => !blocked.has(lane)) ?? 1;
  }

  reset() {
    this.entities.splice(0).forEach(({ mesh, ghost, text }) => { mesh.dispose(); ghost?.dispose(); text?.dispose(); });
    this.nextSpawn = .9;
    this.sequence = 0;
  }

  dispose() { this.reset(); this.blockMat.dispose(); this.gateMat.dispose(); this.crystalMat.dispose(); this.ghostMat.dispose(); this.textMat.dispose(); }
}
