import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { registerPushToken, unregisterPushToken } from "./api";

const TOKEN_KEY = "AMPLE_CLEANER_PUSH_TOKEN";

// Show pushes as a banner even while the app is open (a new job should be noticed).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Asks for permission and registers this device's Expo push token with the
 * server so new-job and day-before reminders reach the cleaner. Safe to call on
 * every launch; a declined permission or a simulator simply registers nothing.
 */
export async function registerForPush(): Promise<void> {
  if (!Device.isDevice) return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Jobs",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== "granted") return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return;
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

  await registerPushToken(token, Platform.OS === "ios" ? "ios" : "android");
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

/** On sign-out, stop this device receiving the previous cleaner's jobs. Must run BEFORE the session ends. */
export async function unregisterForPush(): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) return;
    await unregisterPushToken(token);
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {
    // Signing out must never be blocked by a failed unregister.
  }
}
