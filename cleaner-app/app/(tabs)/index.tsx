import { View, Text, FlatList, Pressable, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, MapPin, Clock } from "lucide-react-native";
import { useAuthStore } from "@/store/authStore";
import { getTodayJobs, type JobSummary } from "@/lib/api";
import { formatCurrency, formatTime } from "@/lib/format";

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function JobCard({ job }: { job: JobSummary }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(`/job/${job.id}`)}
      className="mb-3 rounded-2xl border border-slate-200 bg-white p-4 active:opacity-80"
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-bold text-slate-900">{job.customer?.full_name ?? "Customer"}</Text>
        <ChevronRight size={18} color="#94a3b8" />
      </View>
      <View className="mt-2 flex-row items-center gap-1.5">
        <MapPin size={14} color="#64748b" />
        <Text className="flex-1 text-sm text-slate-500" numberOfLines={1}>
          {job.address ? `${job.address.line_1}, ${job.address.postcode}` : "No address"}
        </Text>
      </View>
      <View className="mt-1 flex-row items-center gap-1.5">
        <Clock size={14} color="#64748b" />
        <Text className="text-sm text-slate-500">{formatTime(job.clean_time ?? undefined)}</Text>
        {job.quote_total != null && (
          <Text className="ml-auto text-sm font-bold text-brand-teal-700">{formatCurrency(job.quote_total)}</Text>
        )}
      </View>
    </Pressable>
  );
}

export default function TodayScreen() {
  const cleanerId = useAuthStore((s) => s.cleanerId);
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["today-jobs", cleanerId],
    queryFn: () => getTodayJobs(cleanerId!, todayISO()),
    enabled: !!cleanerId,
  });

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="px-5 pb-2 pt-4">
        <Text className="text-2xl font-bold text-slate-900">Today</Text>
        <Text className="text-sm text-slate-500">{(data ?? []).length} job{(data ?? []).length === 1 ? "" : "s"} scheduled</Text>
      </View>
      <FlatList
        data={data ?? []}
        keyExtractor={(j) => j.id}
        contentContainerStyle={{ padding: 20, paddingTop: 8 }}
        renderItem={({ item }) => <JobCard job={item} />}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListEmptyComponent={
          !isLoading ? (
            <View className="mt-16 items-center">
              <Text className="text-slate-400">No jobs scheduled for today.</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
