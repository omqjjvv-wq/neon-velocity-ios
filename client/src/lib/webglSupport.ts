type CanvasFactory = {
  createElement: (tagName: "canvas") => Pick<HTMLCanvasElement, "getContext">;
};

export function canUseWebGL(documentRef: CanvasFactory | undefined = typeof document === "undefined" ? undefined : document) {
  if (!documentRef) return false;
  const canvas = documentRef.createElement("canvas");
  return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
}
