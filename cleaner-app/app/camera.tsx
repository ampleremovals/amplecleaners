import { useRef, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Alert, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useQueryClient } from "@tanstack/react-query";
import { X, RotateCcw, Check } from "lucide-react-native";
import { uploadJobPhoto } from "@/lib/api";

/** Full-screen capture for before/after photos: shoot → preview → upload. */
export default function CameraScreen() {
  const { jobId, kind } = useLocalSearchParams<{ jobId: string; kind: "before" | "after" }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!permission) return <View className="flex-1 bg-black" />;

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-slate-900 px-8">
        <Text className="text-center text-lg font-bold text-white">Camera access needed</Text>
        <Text className="mt-2 text-center text-slate-300">We use the camera for before/after photos of each job.</Text>
        <Pressable onPress={requestPermission} className="mt-6 rounded-xl bg-brand-green-700 px-6 py-3.5">
          <Text className="font-bold text-white">Allow camera</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} className="mt-4 py-2"><Text className="text-slate-300">Not now</Text></Pressable>
      </SafeAreaView>
    );
  }

  async function shoot() {
    if (busy) return;
    setBusy(true);
    try {
      const photo = await camera.current?.takePictureAsync({ quality: 0.6 });
      if (photo?.uri) setPreview(photo.uri);
    } catch {
      Alert.alert("Couldn't take the photo", "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function usePhoto() {
    if (!preview || !jobId || !kind) return;
    setBusy(true);
    try {
      await uploadJobPhoto(jobId, kind, preview);
      await queryClient.invalidateQueries({ queryKey: ["job", jobId] });
      router.back();
    } catch (e) {
      Alert.alert("Upload failed", e instanceof Error ? e.message : "Please try again.");
      setBusy(false);
    }
  }

  return (
    <View className="flex-1 bg-black">
      {preview ? (
        <Image source={{ uri: preview }} style={{ flex: 1 }} resizeMode="contain" />
      ) : (
        <CameraView ref={camera} style={{ flex: 1 }} facing="back" />
      )}

      <SafeAreaView className="absolute left-0 right-0 top-0 flex-row items-center justify-between px-4">
        <Pressable onPress={() => router.back()} disabled={busy} accessibilityLabel="Close camera" className="h-10 w-10 items-center justify-center rounded-full bg-black/50">
          <X size={20} color="#fff" />
        </Pressable>
        <View className="rounded-full bg-black/50 px-3 py-1.5">
          <Text className="text-sm font-semibold capitalize text-white">{kind} photo</Text>
        </View>
        <View className="h-10 w-10" />
      </SafeAreaView>

      <SafeAreaView className="absolute bottom-0 left-0 right-0 items-center pb-4" edges={["bottom"]}>
        {preview ? (
          <View className="flex-row items-center gap-6">
            <Pressable onPress={() => setPreview(null)} disabled={busy} accessibilityLabel="Retake" className="h-14 w-14 items-center justify-center rounded-full bg-white/20">
              <RotateCcw size={22} color="#fff" />
            </Pressable>
            <Pressable onPress={usePhoto} disabled={busy} accessibilityLabel="Use this photo" className="h-16 w-16 items-center justify-center rounded-full bg-brand-green-600">
              {busy ? <ActivityIndicator color="#fff" /> : <Check size={30} color="#fff" />}
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={shoot} disabled={busy} accessibilityLabel="Take photo" className="h-20 w-20 items-center justify-center rounded-full border-4 border-white">
            <View className="h-14 w-14 rounded-full bg-white" />
          </Pressable>
        )}
      </SafeAreaView>
    </View>
  );
}
