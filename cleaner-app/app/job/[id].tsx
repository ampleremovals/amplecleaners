import { useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, MapPin, Phone, Clock } from "lucide-react-native";
import { getJob, updateTasks, clockIn, clockOut, type CleanerTask } from "@/lib/api";
import { formatCurrency, formatDayLabel, formatTime } from "@/lib/format";

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const { data: job, isLoading } = useQuery({
    queryKey: ["job", id],
    queryFn: () => getJob(id),
    enabled: !!id,
  });

  const toggleTask = useMutation({
    mutationFn: async (tasks: CleanerTask[]) => updateTasks(id, tasks),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["job", id] }),
  });

  if (isLoading || !job) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#0f766e" />
      </View>
    );
  }

  const tasks = job.tasks ?? [];
  const doneCount = tasks.filter((t) => t.done).length;

  async function handleClockIn() {
    setBusy(true);
    try {
      await clockIn(id);
      queryClient.invalidateQueries({ queryKey: ["job", id] });
    } finally {
      setBusy(false);
    }
  }

  async function handleClockOut() {
    setBusy(true);
    try {
      await clockOut(id);
      queryClient.invalidateQueries({ queryKey: ["job", id] });
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ padding: 20 }}>
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
          <View className="mt-2 flex-row items-center gap-2">
            <Phone size={16} color="#64748b" />
            <Text className="text-sm text-slate-700">{job.customer.phone}</Text>
          </View>
        )}
        {job.quote_total != null && (
          <Text className="mt-3 text-lg font-bold text-brand-teal-700">{formatCurrency(job.quote_total)}</Text>
        )}
      </View>

      {job.special_instructions && (
        <View className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <Text className="text-sm font-semibold text-amber-800">Special instructions</Text>
          <Text className="mt-1 text-sm text-amber-700">{job.special_instructions}</Text>
        </View>
      )}

      <View className="mt-4 flex-row gap-3">
        <Pressable
          onPress={handleClockIn}
          disabled={busy || !!job.clock_in_at}
          className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-brand-teal-700 py-3.5 disabled:opacity-50"
        >
          <Clock size={16} color="#fff" />
          <Text className="font-bold text-white">{job.clock_in_at ? "Clocked in" : "Clock in"}</Text>
        </Pressable>
        <Pressable
          onPress={handleClockOut}
          disabled={busy || !job.clock_in_at || !!job.clock_out_at}
          className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border-2 border-brand-teal-700 py-3.5 disabled:opacity-50"
        >
          <Clock size={16} color="#0f766e" />
          <Text className="font-bold text-brand-teal-700">{job.clock_out_at ? "Clocked out" : "Clock out"}</Text>
        </Pressable>
      </View>

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
              onPress={() => toggleTask.mutate(tasks.map((x) => (x.key === t.key ? { ...x, done: !x.done } : x)))}
              className="mt-2 flex-row items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"
            >
              <View className={`h-6 w-6 items-center justify-center rounded-md border-2 ${t.done ? "border-brand-teal-700 bg-brand-teal-700" : "border-slate-300"}`}>
                {t.done && <Check size={14} color="#fff" />}
              </View>
              <View>
                <Text className="text-sm font-medium text-slate-800">{t.label}</Text>
                <Text className="text-xs text-slate-400">{t.area}</Text>
              </View>
            </Pressable>
          ))
        )}
      </View>

      <View className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-6">
        <Text className="text-center text-sm text-slate-400">
          Before/after photo capture lands in Phase 4 — see tasks/todo.md.
        </Text>
      </View>
    </ScrollView>
  );
}
