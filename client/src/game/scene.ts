/**
 * DESIGN REMINDER — 稍高後方鏡頭將玩家、三條跑道與前方封鎖壓入同一個清晰的高速判斷畫面。
 */
import { Engine } from "@babylonjs/core/Engines/engine";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";
import { GameWorld } from "./GameWorld";
import type { GameVariant } from "./types";

export const SUPER_LAG_RENDER_INTERVAL_MS = 200;

export interface GameHandle { scene: Scene; update: (delta: number) => void; isRenderThrottled: () => boolean; dispose: () => void; }

export async function createGameScene(engine: Engine, canvas: HTMLCanvasElement, variant: GameVariant = "original"): Promise<GameHandle> {
  const scene = new Scene(engine);
  const camera = new FreeCamera("velocity-camera", new Vector3(0, 12.2, -18.8), scene);
  camera.setTarget(new Vector3(0, .2, 30));
  camera.fov = .86;
  camera.minZ = .1;

  const hemi = new HemisphericLight("ambient-paper", new Vector3(0, 1, .2), scene);
  hemi.intensity = 1.22;
  hemi.diffuse = Color3.FromHexString("#F4F1E8");
  hemi.groundColor = Color3.FromHexString("#11151B");
  const directional = new DirectionalLight("velocity-light", new Vector3(-.3, -1, .5), scene);
  directional.intensity = 1.75;
  directional.diffuse = Color3.FromHexString("#FF6433");

  const demo = new URLSearchParams(window.location.search).has("demo");
  const world = new GameWorld(scene, canvas, demo, variant);
  const observer = scene.onBeforeRenderObservable.add(() => {
    // Rendering is throttled by the host loop during SUPER LAG; game simulation remains external.
  });

  return {
    scene,
    update: (delta: number) => {
      world.update(delta);
      const targetFov = demo ? .9 : .86;
      camera.fov += (targetFov - camera.fov) * Math.min(1, delta * 2);
    },
    isRenderThrottled: () => world.isRenderThrottled(),
    dispose: () => {
      scene.onBeforeRenderObservable.remove(observer);
      world.dispose();
      scene.dispose();
    },
  };
}
