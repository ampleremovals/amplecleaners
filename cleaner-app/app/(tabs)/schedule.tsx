import { View, Text, FlatList, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { getUpcomingJobs, type JobSummary } from "@/lib/api";
import { formatDayLabel, formatCurrency } from "@/lib/format";

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function ScheduleScreen() {
  const cleanerId = useAuthStore((s) => s.cleanerId);
  const router = useRouter();
  const { data } = useQuery({
    queryKey: ["upcoming-jobs", cleanerId],
    queryFn: () => getUpcomingJobs(cleanerId!, todayISO()),
    enabled: !!cleanerId,
  });

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="px-5 pb-2 pt-4">
        <Text className="text-2xl font-bold text-slate-900">Schedule</Text>
      </View>
      <FlatList
        data={data ?? []}
        keyExtractor={(j) => j.id}
        contentContainerStyle={{ padding: 20, paddingTop: 8 }}
        renderItem={({ item }: { item: JobSummary }) => (
          <Pressable
            onPress={() => router.push(`/job/${item.id}`)}
            className="mb-3 flex-row items-center justify-between rounded-2xl border border-slate-200 bg-white p-4"
          >
            <View>
              <Text className="font-bold text-slate-900">{item.clean_date ? formatDayLabel(item.clean_date) : "Flexible date"}</Text>
              <Text className="mt-0.5 text-sm text-slate-500">{item.customer?.full_name ?? "Customer"}</Text>
            </View>
            {item.quote_total != null && <Text className="font-bold text-brand-green-700">{formatCurrency(item.quote_total)}</Text>}
          </Pressable>
        )}
        ListEmptyComponent={
          <View className="mt-16 items-center">
            <Text className="text-slate-400">No upcoming jobs.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
