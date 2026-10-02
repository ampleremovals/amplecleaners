import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Wallet } from "lucide-react-native";

/**
 * Placeholder — real earnings (completed jobs × pay rate, pending/paid
 * breakdown) land in Phase 5 once invoicing/payroll is built. Keeping this
 * screen in the tab bar now so the navigation shape is final from day one.
 */
export default function EarningsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text className="text-2xl font-bold text-slate-900">Earnings</Text>
        <View className="mt-6 items-center rounded-2xl border border-dashed border-slate-300 bg-white p-8">
          <Wallet size={28} color="#94a3b8" />
          <Text className="mt-3 text-center text-slate-400">
            Earnings tracking lands in a later phase — see tasks/todo.md (Phase 5).
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
