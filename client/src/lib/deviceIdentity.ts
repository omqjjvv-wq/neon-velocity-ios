export function getDeviceFamily(userAgent = navigator.userAgent) {
  if (/iPad/i.test(userAgent)) return "iPad";
  if (/iPhone/i.test(userAgent)) return "iPhone";
  if (/Android/i.test(userAgent)) {
    const match = userAgent.match(/Android[^;]*;\s*([^;()]+?)(?:\s+Build|;|\))/i);
    const model = match?.[1]?.trim();
    return model && model.length <= 40 ? model : "Android";
  }
  if (/Macintosh|Mac OS X/i.test(userAgent)) return "Mac";
  if (/Windows/i.test(userAgent)) return "Windows PC";
  return "Device";
}
