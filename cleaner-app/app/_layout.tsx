import "../global.css";
import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, onlineManager } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { supabase, registerSupabaseAppStateRefresh } from "@/lib/supabase";
import { getCleanerRecord } from "@/lib/auth";
import { assertEnv } from "@/lib/env";
import { useAuthStore } from "@/store/authStore";

// Offline-first: persist the query cache so the app opens with last-known data
// even with a patchy connection (a cleaner's job site is often a dead spot).
onlineManager.setEventListener((setOnline) => {
  const sub = NetInfo.addEventListener((s) => setOnline(!!s.isConnected));
  return () => sub();
});

const WEEK = 1000 * 60 * 60 * 24 * 7;
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, gcTime: WEEK, retry: 2, refetchOnReconnect: true, refetchOnWindowFocus: false },
  },
});
const persister = createAsyncStoragePersister({ storage: AsyncStorage, key: "AMPLE_CLEANER_QUERY_CACHE", throttleTime: 1000 });

/** Redirect based on auth: non-cleaners → login; signed-in cleaners → app. */
function useAuthRedirect() {
  const segments = useSegments();
  const router = useRouter();
  const { initialised, session, cleanerId } = useAuthStore();

  useEffect(() => {
    if (!initialised) return;
    const inAuthGroup = segments[0] === "(auth)";
    const isCleaner = !!session && !!cleanerId;
    if (!isCleaner && !inAuthGroup) router.replace("/(auth)/login");
    else if (isCleaner && inAuthGroup) router.replace("/(tabs)");
  }, [initialised, session, cleanerId, segments, router]);
}

function RootNavigator() {
  useAuthRedirect();
  const { initialised } = useAuthStore();
  if (!initialised) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator color="#0f766e" />
      </View>
    );
  }
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="job/[id]" options={{ headerShown: true, title: "Job" }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    assertEnv();
    const unsub = registerSupabaseAppStateRefresh();

    const { setSession, setCleanerId, setInitialised } = useAuthStore.getState();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        const cleaner = await getCleanerRecord(session.user.id);
        setCleanerId(cleaner?.id ?? null);
      }
      setInitialised(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        const cleaner = await getCleanerRecord(session.user.id);
        setCleanerId(cleaner?.id ?? null);
      } else {
        setCleanerId(null);
      }
    });

    return () => {
      unsub();
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
          <StatusBar style="dark" />
          <RootNavigator />
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
