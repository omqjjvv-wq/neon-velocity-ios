export type PersonalLeaderboardIdentity = { deviceId: string } | null | undefined;

export function isCurrentDeviceEntry(entryDeviceId: string, personal: PersonalLeaderboardIdentity) {
  return Boolean(personal?.deviceId && entryDeviceId === personal.deviceId);
}
