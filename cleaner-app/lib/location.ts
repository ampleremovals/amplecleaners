import * as Location from "expo-location";
import type { LatLng } from "./api";

const TIMEOUT_MS = 8000;

/**
 * Best-effort location stamp for clock in/out. Never blocks the action: no
 * permission, no GPS fix or a slow fix just means the stamp is omitted.
 */
export async function getLocationStamp(): Promise<LatLng | undefined> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return undefined;
    const position = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), TIMEOUT_MS)),
    ]);
    return position ? { lat: position.coords.latitude, lng: position.coords.longitude } : undefined;
  } catch {
    return undefined;
  }
}
