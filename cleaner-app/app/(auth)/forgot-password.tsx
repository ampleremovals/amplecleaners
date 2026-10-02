import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { sendPasswordReset } from "@/lib/auth";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setBusy(true);
    const res = await sendPasswordReset(email);
    setBusy(false);
    if (!res.ok) setError(res.error ?? "Something went wrong");
    else setSent(true);
  }

  return (
    <SafeAreaView className="flex-1 bg-white px-6 pt-10">
      <Text className="text-2xl font-bold text-slate-900">Reset your password</Text>
      <Text className="mt-1 text-slate-500">We&apos;ll email you a link to set a new one.</Text>

      {sent ? (
        <Text className="mt-6 text-brand-teal-700">
          Check your email for a reset link. You can close this screen.
        </Text>
      ) : (
        <View className="mt-6">
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
            className="mb-4 rounded-xl border border-slate-300 px-4 py-3 text-slate-900"
          />
          {error ? <Text className="mb-3 text-sm text-red-600">{error}</Text> : null}
          <Pressable onPress={submit} disabled={busy} className="items-center rounded-xl bg-brand-teal-700 py-3.5 active:opacity-90">
            {busy ? <ActivityIndicator color="#fff" /> : <Text className="text-base font-bold text-white">Send reset link</Text>}
          </Pressable>
        </View>
      )}

      <Pressable onPress={() => router.back()} className="mt-6 items-center py-1">
        <Text className="text-sm font-medium text-brand-teal-700">Back to sign in</Text>
      </Pressable>
    </SafeAreaView>
  );
}
