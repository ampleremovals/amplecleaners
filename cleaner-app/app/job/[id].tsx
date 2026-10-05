import { useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, Image, Linking, Modal } from "react-native";
import { useRouter as useAppRouter } from "expo-router";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, MapPin, Phone, Clock, Camera } from "lucide-react-native";
import { getJob, updateTasks, clockIn, clockOut, signPhotos, declineJob, type CleanerTask } from "@/lib/api";
import { getLocationStamp } from "@/lib/location";
import { formatCurrency, formatDayLabel, formatTime } from "@/lib/format";

function PhotoStrip({ label, kind, paths, canAdd, jobId }: { label: string; kind: "before" | "after"; paths: string[]; canAdd: boolean; jobId: string }) {
  const router = useRouter();
  const { data: urls } = useQuery({
    queryKey: ["job-photos", jobId, kind, paths.length],
    queryFn: () => signPhotos(paths),
    enabled: paths.length > 0,
    staleTime: 1000 * 60 * 30,
  });

  return (
    <View className="mt-3 rounded-2xl border border-slate-200 bg-white p-4">
      <View className="flex-row items-center justify-between">
        <Text className="font-bold text-slate-900">{label} ({paths.length})</Text>
        {canAdd && (
          <Pressable
            onPress={() => router.push({ pathname: "/camera", params: { jobId, kind } })}
            accessibilityLabel={`Add ${kind} photo`}
            className="flex-row items-center gap-1.5 rounded-lg bg-brand-green-700 px-3 py-2"
          >
            <Camera size={14} color="#fff" />
            <Text className="text-sm font-bold text-white">Add photo</Text>
          </Pressable>
        )}
      </View>
      {paths.length === 0 ? (
        <Text className="mt-2 text-sm text-slate-400">{canAdd ? "Take a few photos so the customer can see the difference." : "No photos taken."}</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3" contentContainerStyle={{ gap: 8 }}>
          {(urls ?? []).map((u) => (
            <Image key={u} source={{ uri: u }} style={{ width: 84, height: 84, borderRadius: 10 }} />
          ))}
          {!urls && <ActivityIndicator color="#15803d" />}
        </ScrollView>
      )}
    </View>
  );
}

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const appRouter = useAppRouter();

  const { data: job, isLoading, isError, refetch } = useQuery({
    queryKey: ["job", id],
    queryFn: () => getJob(id),
    enabled: !!id,
  });

  const toggleTask = useMutation({
    mutationFn: async (tasks: CleanerTask[]) => updateTasks(id, tasks),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["job", id] }),
    onError: (e) => Alert.alert("Couldn't save that tick", e instanceof Error ? e.message : "Please try again."),
  });

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8">
        <Text className="text-center text-base font-semibold text-slate-800">We couldn&apos;t load this job</Text>
        <Pressable onPress={() => refetch()} className="mt-4 rounded-xl bg-brand-green-700 px-6 py-3"><Text className="font-bold text-white">Try again</Text></Pressable>
      </View>
    );
  }
  if (isLoading || !job) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#15803d" />
      </View>
    );
  }

  const tasks = job.tasks ?? [];
  const doneCount = tasks.filter((t) => t.done).length;
  const before = job.before_photos ?? [];
  const after = job.after_photos ?? [];
  const inProgress = !!job.clock_in_at && !job.clock_out_at;
  const finished = !!job.clock_out_at;
  const canClockIn = job.status === "cleaner_assigned" && !job.clock_in_at;

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
      await queryClient.invalidateQueries({ queryKey: ["job", id] });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["today-jobs"] }),
        queryClient.invalidateQueries({ queryKey: ["upcoming-jobs"] }),
        queryClient.invalidateQueries({ queryKey: ["earnings"] }),
      ]);
    } catch (e) {
      Alert.alert("Something went wrong", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const canDecline = job.status === "cleaner_assigned" && !job.clock_in_at;

  async function handleDecline(reason: string) {
    setDeclineOpen(false);
    setBusy(true);
    try {
      const r = await declineJob(id, reason);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["today-jobs"] }),
        queryClient.invalidateQueries({ queryKey: ["upcoming-jobs"] }),
      ]);
      Alert.alert("Job given back", r.reassigned ? "Thanks for letting us know — it's been passed to another cleaner." : "Thanks for letting us know — the office will find cover.");
      appRouter.back();
    } catch (e) {
      Alert.alert("Couldn't give the job back", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const handleClockIn = () => run(async () => clockIn(id, await getLocationStamp()));

  function handleClockOut() {
    const warnings: string[] = [];
    if (tasks.length > doneCount) warnings.push(`${tasks.length - doneCount} checklist item${tasks.length - doneCount === 1 ? " isn't" : "s aren't"} ticked`);
    if (after.length === 0) warnings.push("no after photos yet");
    const proceed = () => run(async () => clockOut(id, await getLocationStamp()));
    if (warnings.length === 0) {
      proceed();
      return;
    }
    Alert.alert("Finish this job?", `You have ${warnings.join(" and ")}. The customer is invoiced as soon as you clock out.`, [
      { text: "Go back", style: "cancel" },
      { text: "Clock out anyway", style: "destructive", onPress: proceed },
    ]);
  }

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
      <Text className="text-xl font-bold text-slate-900">{job.customer?.full_name ?? "Customer"}</Text>
      <Text className="mt-1 text-sm text-slate-500">
        {job.clean_date ? formatDayLabel(job.clean_date) : "Flexible date"} · {formatTime(job.clean_time ?? undefined)}
      </Text>

      <View className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <View className="flex-row items-center gap-2">
          <MapPin size={16} color="#64748b" />
          <Text className="flex-1 text-sm text-slate-700">
            {job.address ? `${job.address.line_1}${job.address.line_2 ? ", " + job.address.line_2 : ""}, ${job.address.postcode}` : "No address on file"}
          </Text>
        </View>
        {job.customer?.phone && (
          <Pressable onPress={() => Linking.openURL(`tel:${job.customer!.phone}`)} className="mt-2 flex-row items-center gap-2">
            <Phone size={16} color="#64748b" />
            <Text className="text-sm font-medium text-brand-green-700">{job.customer.phone}</Text>
          </Pressable>
        )}
        {job.quote_total != null && (
          <Text className="mt-3 text-lg font-bold text-brand-green-700">{formatCurrency(job.quote_total)}</Text>
        )}
      </View>

      {job.special_instructions && (
        <View className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <Text className="text-sm font-semibold text-amber-800">Special instructions</Text>
          <Text className="mt-1 text-sm text-amber-700">{job.special_instructions}</Text>
        </View>
      )}

      {finished ? (
        <View className="mt-4 rounded-2xl border border-brand-green-200 bg-brand-green-50 p-4">
          <Text className="font-bold text-brand-green-800">Job complete ✓</Text>
          <Text className="mt-1 text-sm text-brand-green-700">Nice work — the customer has been invoiced.</Text>
        </View>
      ) : (
        <View className="mt-4 flex-row gap-3">
          <Pressable
            onPress={handleClockIn}
            disabled={busy || !canClockIn}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-brand-green-700 py-3.5 disabled:opacity-50"
          >
            {busy && !inProgress ? <ActivityIndicator color="#fff" /> : <Clock size={16} color="#fff" />}
            <Text className="font-bold text-white">{job.clock_in_at ? "Clocked in" : "Clock in"}</Text>
          </Pressable>
          <Pressable
            onPress={handleClockOut}
            disabled={busy || !inProgress}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border-2 border-brand-green-700 py-3.5 disabled:opacity-50"
          >
            {busy && inProgress ? <ActivityIndicator color="#15803d" /> : <Clock size={16} color="#15803d" />}
            <Text className="font-bold text-brand-green-700">Clock out</Text>
          </Pressable>
        </View>
      )}

      {canDecline && (
        <Pressable onPress={() => setDeclineOpen(true)} disabled={busy} className="mt-3 items-center rounded-xl border-2 border-slate-200 bg-white py-3 disabled:opacity-50">
          <Text className="font-semibold text-slate-600">I can't make this job</Text>
        </Pressable>
      )}

      <Modal visible={declineOpen} transparent animationType="slide" onRequestClose={() => setDeclineOpen(false)}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="rounded-t-3xl bg-white p-5 pb-8">
            <Text className="text-lg font-bold text-slate-900">Why can't you make it?</Text>
            <Text className="mt-1 text-sm text-slate-500">We'll pass the job to another cleaner straight away. Please give as much notice as you can.</Text>
            {["I'm unwell", "Family emergency", "Transport problem", "I'm double-booked", "Another reason"].map((r) => (
              <Pressable key={r} onPress={() => handleDecline(r)} className="mt-3 rounded-xl border border-slate-200 px-4 py-3.5"><Text className="font-medium text-slate-800">{r}</Text></Pressable>
            ))}
            <Pressable onPress={() => setDeclineOpen(false)} className="mt-4 items-center py-2"><Text className="font-semibold text-brand-green-700">Keep the job</Text></Pressable>
          </View>
        </View>
      </Modal>

      <View className="mt-6">
        <Text className="font-bold text-slate-900">
          Tasks ({doneCount}/{tasks.length})
        </Text>
        {tasks.length === 0 ? (
          <Text className="mt-2 text-sm text-slate-400">No checklist set for this job yet.</Text>
        ) : (
          tasks.map((t) => (
            <Pressable
              key={t.key}
              disabled={finished}
              onPress={() => toggleTask.mutate(tasks.map((x) => (x.key === t.key ? { ...x, done: !x.done } : x)))}
              className="mt-2 flex-row items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"
            >
              <View className={`h-6 w-6 items-center justify-center rounded-md border-2 ${t.done ? "border-brand-green-700 bg-brand-green-700" : "border-slate-300"}`}>
                {t.done && <Check size={14} color="#fff" />}
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-slate-800">{t.label}</Text>
                <Text className="text-xs text-slate-400">{t.area}</Text>
              </View>
            </Pressable>
          ))
        )}
      </View>

      <View className="mt-6">
        <Text className="font-bold text-slate-900">Photos</Text>
        <PhotoStrip label="Before" kind="before" paths={before} canAdd={!finished && (inProgress || canClockIn)} jobId={id} />
        <PhotoStrip label="After" kind="after" paths={after} canAdd={inProgress} jobId={id} />
      </View>
    </ScrollView>
  );
}
