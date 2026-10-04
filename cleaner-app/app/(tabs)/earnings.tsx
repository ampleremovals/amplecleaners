import { View, Text, ScrollView, RefreshControl, ActivityIndicator, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Wallet } from "lucide-react-native";
import { getEarnings } from "@/lib/api";
import { formatCurrency, formatDayLabel } from "@/lib/format";

function StatCard({ label, hours, earned }: { label: string; hours: number; earned: number }) {
  return (
    <View className="flex-1 rounded-2xl border border-slate-200 bg-white p-4">
      <Text className="text-xs font-semibold uppercase text-slate-500">{label}</Text>
      <Text className="mt-1 text-xl font-bold text-brand-green-800">{formatCurrency(earned)}</Text>
      <Text className="text-xs text-slate-400">{hours}h worked</Text>
    </View>
  );
}

/** Earned = clocked hours × the pay rate the office has set. Payroll itself runs outside the app. */
export default function EarningsScreen() {
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({ queryKey: ["earnings"], queryFn: getEarnings });

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView contentContainerStyle={{ padding: 20 }} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor="#15803d" />}>
        <Text className="text-2xl font-bold text-slate-900">Earnings</Text>

        {isLoading ? (
          <View className="mt-16 items-center"><ActivityIndicator color="#15803d" /></View>
        ) : isError || !data ? (
          <View className="mt-8 items-center rounded-2xl border border-slate-200 bg-white p-8">
            <Text className="text-center text-slate-600">We couldn&apos;t load your earnings.</Text>
            <Pressable onPress={() => refetch()} className="mt-4 rounded-xl bg-brand-green-700 px-6 py-3"><Text className="font-bold text-white">Try again</Text></Pressable>
          </View>
        ) : (
          <>
            {data.payRate == null && (
              <View className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <Text className="text-sm text-amber-800">Your hourly pay rate hasn&apos;t been set yet, so only your hours are shown. The office will add it.</Text>
              </View>
            )}
            <View className="mt-4 flex-row gap-3">
              <StatCard label="This week" hours={data.week.hours} earned={data.week.earned} />
              <StatCard label="This month" hours={data.month.hours} earned={data.month.earned} />
            </View>
            <View className="mt-3 flex-row gap-3">
              <StatCard label="All time" hours={data.allTime.hours} earned={data.allTime.earned} />
              <View className="flex-1 rounded-2xl border border-slate-200 bg-white p-4">
                <Text className="text-xs font-semibold uppercase text-slate-500">Your rate</Text>
                <Text className="mt-1 text-xl font-bold text-slate-800">{data.payRate != null ? `${formatCurrency(data.payRate)}/hr` : "—"}</Text>
              </View>
            </View>

            <Text className="mb-2 mt-6 font-bold text-slate-900">Recent jobs</Text>
            {data.recent.length === 0 ? (
              <View className="items-center rounded-2xl border border-dashed border-slate-300 bg-white p-8">
                <Wallet size={28} color="#94a3b8" />
                <Text className="mt-3 text-center text-slate-400">Completed jobs show up here once you&apos;ve clocked in and out.</Text>
              </View>
            ) : (
              data.recent.map((j) => (
                <View key={j.id} className="mb-2 flex-row items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
                  <View>
                    <Text className="text-sm font-semibold text-slate-800">{formatDayLabel(j.date)}</Text>
                    <Text className="text-xs text-slate-400">{j.reference} · {j.hours}h</Text>
                  </View>
                  <Text className="font-bold text-brand-green-800">{data.payRate != null ? formatCurrency(j.earned) : "—"}</Text>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
