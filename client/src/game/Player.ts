/**
 * DESIGN REMINDER — 骨白楔形飛行器以單一橘色切線表示速度；輪廓永遠比裝飾優先。
 */
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";

const LANES = [-4, 0, 4];

export class Player {
  readonly root: TransformNode;
  private lane = 1;
  private targetLane = 1;
  private sprinting = false;
  private readonly orange: StandardMaterial;

  constructor(scene: Scene) {
    this.root = new TransformNode("player-root", scene);
    this.root.position = new Vector3(0, 0.45, 0);

    const paper = new StandardMaterial("player-paper", scene);
    paper.diffuseColor = Color3.FromHexString("#F4F1E8");
    paper.emissiveColor = Color3.FromHexString("#393936");
    const charcoal = new StandardMaterial("player-charcoal", scene);
    charcoal.diffuseColor = Color3.FromHexString("#161a20");
    charcoal.emissiveColor = Color3.FromHexString("#080a0e");
    this.orange = new StandardMaterial("player-orange", scene);
    this.orange.diffuseColor = Color3.FromHexString("#FF4D00");
    this.orange.emissiveColor = Color3.FromHexString("#B83200");

    const body = MeshBuilder.CreateBox("player-body", { width: 1.45, height: 0.38, depth: 2.55 }, scene);
    body.parent = this.root;
    body.position.y = 0.14;
    body.material = paper;

    const nose = MeshBuilder.CreateCylinder("player-nose", { height: 1.4, diameterTop: 0.12, diameterBottom: 1.42, tessellation: 4 }, scene);
    nose.parent = this.root;
    nose.rotation.x = Math.PI / 2;
    nose.position = new Vector3(0, 0.16, 1.78);
    nose.material = paper;

    const cockpit = MeshBuilder.CreateBox("player-cockpit", { width: 0.48, height: 0.21, depth: 1.15 }, scene);
    cockpit.parent = this.root;
    cockpit.position = new Vector3(0, 0.43, 0.1);
    cockpit.material = charcoal;

    const slash = MeshBuilder.CreateBox("player-velocity-slash", { width: 0.12, height: 0.45, depth: 1.55 }, scene);
    slash.parent = this.root;
    slash.rotation.z = -0.28;
    slash.position = new Vector3(0.36, 0.34, -0.08);
    slash.material = this.orange;
  }

  move(direction: -1 | 1) {
    this.targetLane = Math.max(0, Math.min(2, this.targetLane + direction));
  }

  setLane(lane: number) {
    this.targetLane = Math.max(0, Math.min(2, lane));
  }

  setSprint(active: boolean) { this.sprinting = active; }
  getLane() { return this.targetLane; }
  getX() { return this.root.position.x; }
  isSprinting() { return this.sprinting; }

  update(delta: number) {
    const targetX = LANES[this.targetLane];
    const response = Math.min(1, delta * 21);
    this.root.position.x += (targetX - this.root.position.x) * response;
    const lean = (targetX - this.root.position.x) * -0.12;
    this.root.rotation.z += (lean - this.root.rotation.z) * Math.min(1, delta * 17);
    this.root.rotation.x = this.sprinting ? -0.055 : 0;
    this.orange.emissiveColor = this.sprinting ? Color3.FromHexString("#FF6B2A") : Color3.FromHexString("#B83200");
  }

  reset() {
    this.lane = 1;
    this.targetLane = 1;
    this.root.position.x = 0;
    this.root.rotation = Vector3.Zero();
    this.sprinting = false;
  }

  dispose() { this.root.dispose(false, true); }
}
