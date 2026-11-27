export function isLegacyAndroidWebView(userAgent = typeof navigator !== "undefined" ? navigator.userAgent : ""): boolean {
  const match = userAgent.match(/Android\s+(\d+)(?:\.(\d+))?(?:\.(\d+))?/i);
  if (!match) return false;

  const major = Number(match[1]);
  const minor = Number(match[2] ?? 0);
  const patch = Number(match[3] ?? 0);
  if (!Number.isFinite(major)) return false;

  // Android 6 and earlier commonly ships a WebView too old for the 3D bundle.
  // Keep the game playable with the DOM/canvas compatibility runner instead.
  return major < 7 || (major === 7 && minor === 0 && patch === 0);
}
