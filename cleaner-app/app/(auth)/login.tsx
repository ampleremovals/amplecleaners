import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { signInCleaner } from "@/lib/auth";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setBusy(true);
    const res = await signInCleaner(email, password);
    setBusy(false);
    if (!res.ok) setError(res.error ?? "Sign in failed");
    // On success the root layout's auth redirect moves us into the app.
  }

  return (
    <View className="flex-1">
      <LinearGradient colors={["#134e4a", "#0f766e", "#0d9488"]} style={{ flex: 1 }}>
        <SafeAreaView className="flex-1">
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 justify-center px-6">
            <View className="mb-6 items-center">
              <View className="h-16 w-16 items-center justify-center rounded-2xl bg-white/95 shadow-lg">
                <Image source={require("../../assets/logo.png")} style={{ width: 48, height: 48, borderRadius: 10 }} resizeMode="cover" />
              </View>
            </View>
            <Text className="text-center text-3xl font-bold text-white">Ample Cleaner</Text>
            <Text className="mt-1 text-center text-teal-100">Sign in to see today&apos;s jobs.</Text>

            <View className="mt-8 rounded-3xl bg-white p-6">
              <Text className="mb-1 text-sm font-medium text-slate-700">Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="you@example.com"
                className="mb-4 rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
              />
              <Text className="mb-1 text-sm font-medium text-slate-700">Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="••••••••"
                className="mb-4 rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
              />
              {error ? <Text className="mb-3 text-sm text-red-600">{error}</Text> : null}
              <Pressable
                onPress={submit}
                disabled={busy}
                className="items-center rounded-xl bg-brand-green-700 py-3.5 active:opacity-90"
              >
                {busy ? <ActivityIndicator color="#fff" /> : <Text className="text-base font-bold text-white">Sign in</Text>}
              </Pressable>
              <Pressable onPress={() => router.push("/forgot-password")} className="mt-4 items-center py-1">
                <Text className="text-sm font-medium text-brand-green-700">Forgot password?</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
