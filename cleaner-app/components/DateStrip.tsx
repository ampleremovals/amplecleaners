import { ScrollView, Pressable, Text, View } from "react-native";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** YYYY-MM-DD from LOCAL date parts (never toISOString, which shifts BST dates). */
export function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function labelFor(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${DAYS[date.getDay()]} ${d} ${MONTHS[m - 1]}`;
}

/** A scrollable strip of upcoming days — a date picker without another native dependency. */
export function DateStrip({ value, onChange, from, days = 90 }: { value: string | null; onChange: (key: string) => void; from?: string; days?: number }) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const items = Array.from({ length: days }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  }).filter((d) => !from || toKey(d) >= from);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
      {items.map((d) => {
        const key = toKey(d);
        const active = key === value;
        return (
          <Pressable key={key} onPress={() => onChange(key)} accessibilityLabel={labelFor(key)} className={`w-16 items-center rounded-xl border py-2 ${active ? "border-brand-green-700 bg-brand-green-700" : "border-slate-200 bg-white"}`}>
            <Text className={`text-xs font-semibold ${active ? "text-green-100" : "text-slate-400"}`}>{DAYS[d.getDay()]}</Text>
            <Text className={`text-lg font-bold ${active ? "text-white" : "text-slate-800"}`}>{d.getDate()}</Text>
            <Text className={`text-xs ${active ? "text-green-100" : "text-slate-400"}`}>{MONTHS[d.getMonth()]}</Text>
          </Pressable>
        );
      })}
      <View style={{ width: 8 }} />
    </ScrollView>
  );
}
