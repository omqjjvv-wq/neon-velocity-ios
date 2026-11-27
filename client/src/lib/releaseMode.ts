export function isItchRelease(value: string | undefined = import.meta.env.VITE_ITCH_BUILD): boolean {
  return value === "1";
}
