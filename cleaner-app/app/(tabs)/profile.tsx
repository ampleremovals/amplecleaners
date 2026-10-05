import { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, Minus, Plus, ShieldCheck, ShieldAlert, Star, Trash2, X } from "lucide-react-native";
import { signOut } from "@/lib/auth";
import {
  addTimeOff, deleteTimeOff, getAvailability, getProfile, getTimeOff, saveAvailability,
  type AvailabilitySlot,
} from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { DateStrip, labelFor } from "@/components/DateStrip";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const STEP = 30;

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

function Stepper({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number }) {
  return (
    <View className="flex-row items-center gap-2">
      <Text className="w-9 text-xs text-slate-400">{label}</Text>
      <Pressable accessibilityLabel={`Earlier ${label}`} disabled={value - STEP < min} onPress={() => onChange(value - STEP)} className="h-8 w-8 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-30"><Minus size={14} color="#475569" /></Pressable>
      <Text className="w-12 text-center font-semibold text-slate-800">{fmt(value)}</Text>
      <Pressable accessibilityLabel={`Later ${label}`} disabled={value + STEP > max} onPress={() => onChange(value + STEP)} className="h-8 w-8 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-30"><Plus size={14} color="#475569" /></Pressable>
    </View>
  );
}

export default function ProfileScreen() {
  const cleanerId = useAuthStore((s) => s.cleanerId);
  const queryClient = useQueryClient();

  const profile = useQuery({ queryKey: ["profile", cleanerId], queryFn: () => getProfile(cleanerId!), enabled: !!cleanerId });
  const avail = useQuery({ queryKey: ["availability"], queryFn: getAvailability });
  const timeOff = useQuery({ queryKey: ["time-off"], queryFn: getTimeOff });

  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (avail.data && !dirty) setSlots(avail.data); }, [avail.data, dirty]);

  const [adding, setAdding] = useState(false);
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const change = (next: AvailabilitySlot[]) => { setSlots(next); setDirty(true); };
  const update = (i: number, patch: Partial<AvailabilitySlot>) => change(slots.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  function addSlot(day: number) {
    const taken = slots.filter((s) => s.dayOfWeek === day).map((s) => toMin(s.endTime));
    const start = taken.length ? Math.min(Math.max(...taken), 20 * 60) : 9 * 60;
    change([...slots, { dayOfWeek: day, startTime: fmt(start), endTime: fmt(Math.min(start + 8 * 60, 23 * 60)) }]);
  }

  async function saveSlots() {
    setSaving(true);
    try {
      await saveAvailability(slots);
      setDirty(false);
      await queryClient.invalidateQueries({ queryKey: ["availability"] });
      Alert.alert("Saved", "Your weekly availability is updated. New jobs will only be offered inside these hours.");
    } catch (e) {
      Alert.alert("Couldn't save", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function submitTimeOff() {
    if (!from) return;
    const end = to && to >= from ? to : from;
    setBusy(true);
    try {
      const r = await addTimeOff(from, end, reason.trim() || undefined);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["time-off"] }),
        queryClient.invalidateQueries({ queryKey: ["today-jobs"] }),
        queryClient.invalidateQueries({ queryKey: ["upcoming-jobs"] }),
      ]);
      setAdding(false); setFrom(null); setTo(null); setReason("");
      Alert.alert("Time off booked", r.released > 0 ? `${r.released} job${r.released === 1 ? "" : "s"} in that period ${r.released === 1 ? "has" : "have"} been given back to the office${r.reassigned ? ` (${r.reassigned} already covered by someone else)` : ""}.` : "You won't be offered jobs on those days.");
    } catch (e) {
      Alert.alert("Couldn't book time off", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function confirmRemove(id: string) {
    Alert.alert("Remove this time off?", "You may be offered jobs on those days again.", [
      { text: "Keep it", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => { try { await deleteTimeOff(id); await queryClient.invalidateQueries({ queryKey: ["time-off"] }); } catch (e) { Alert.alert("Couldn't remove", e instanceof Error ? e.message : "Please try again."); } } },
    ]);
  }

  const p = profile.data;

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <Text className="text-2xl font-bold text-slate-900">Profile</Text>

        <View className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
          {profile.isLoading ? <ActivityIndicator color="#15803d" /> : !p ? <Text className="text-slate-500">We couldn&apos;t load your profile.</Text> : (
            <>
              <Text className="text-lg font-bold text-slate-900">{p.full_name}</Text>
              <Text className="text-sm text-slate-500">{p.email}</Text>
              <Text className="text-sm text-slate-500">{p.phone}</Text>
              <View className="mt-3 flex-row flex-wrap gap-2">
                <View className={`flex-row items-center gap-1.5 rounded-full px-3 py-1.5 ${p.dbs_verified ? "bg-brand-green-100" : "bg-amber-100"}`}>
                  {p.dbs_verified ? <ShieldCheck size={14} color="#166534" /> : <ShieldAlert size={14} color="#92400e" />}
                  <Text className={`text-xs font-semibold ${p.dbs_verified ? "text-brand-green-800" : "text-amber-800"}`}>{p.dbs_verified ? "DBS verified" : "DBS pending — you'll get jobs once verified"}</Text>
                </View>
                {p.rating_avg != null && (
                  <View className="flex-row items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5">
                    <Star size={14} color="#f59e0b" fill="#f59e0b" />
                    <Text className="text-xs font-semibold text-slate-700">{p.rating_avg.toFixed(1)} average rating</Text>
                  </View>
                )}
              </View>
              <Text className="mt-3 text-xs text-slate-400">Areas you cover: {p.areas.length ? p.areas.join(", ") : "none set yet — the office adds these"}</Text>
            </>
          )}
        </View>

        <Text className="mb-2 mt-7 text-lg font-bold text-slate-900">Weekly availability</Text>
        <Text className="mb-3 text-xs text-slate-500">You&apos;re only offered jobs that fit inside these hours.</Text>
        {avail.isLoading ? <ActivityIndicator color="#15803d" /> : avail.isError ? (
          <Pressable onPress={() => avail.refetch()}><Text className="text-brand-green-700">Couldn&apos;t load — tap to retry</Text></Pressable>
        ) : (
          <View className="rounded-2xl border border-slate-200 bg-white">
            {WEEK_ORDER.map((day, idx) => {
              const daySlots = slots.map((s, i) => ({ s, i })).filter((x) => x.s.dayOfWeek === day);
              return (
                <View key={day} className={`p-4 ${idx > 0 ? "border-t border-slate-100" : ""}`}>
                  <View className="flex-row items-center justify-between">
                    <Text className="font-semibold text-slate-800">{DAY_NAMES[day]}</Text>
                    <Pressable onPress={() => addSlot(day)} accessibilityLabel={`Add hours on ${DAY_NAMES[day]}`} className="flex-row items-center gap-1 rounded-lg bg-brand-green-50 px-2.5 py-1.5"><Plus size={14} color="#15803d" /><Text className="text-xs font-bold text-brand-green-700">Add hours</Text></Pressable>
                  </View>
                  {daySlots.length === 0 && <Text className="mt-1 text-xs text-slate-400">Not available</Text>}
                  {daySlots.map(({ s, i }) => (
                    <View key={i} className="mt-3 flex-row items-center justify-between">
                      <View className="gap-2">
                        <Stepper label="From" value={toMin(s.startTime)} min={0} max={toMin(s.endTime) - 60} onChange={(v) => update(i, { startTime: fmt(v) })} />
                        <Stepper label="To" value={toMin(s.endTime)} min={toMin(s.startTime) + 60} max={23 * 60 + 30} onChange={(v) => update(i, { endTime: fmt(v) })} />
                      </View>
                      <Pressable onPress={() => change(slots.filter((_, idx2) => idx2 !== i))} accessibilityLabel="Remove these hours" className="h-10 w-10 items-center justify-center rounded-lg bg-red-50"><Trash2 size={16} color="#dc2626" /></Pressable>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        )}
        {dirty && (
          <Pressable onPress={saveSlots} disabled={saving} className="mt-4 items-center rounded-xl bg-brand-green-700 py-3.5 disabled:opacity-60">
            {saving ? <ActivityIndicator color="#fff" /> : <Text className="font-bold text-white">Save availability</Text>}
          </Pressable>
        )}

        <View className="mb-2 mt-8 flex-row items-center justify-between">
          <Text className="text-lg font-bold text-slate-900">Time off</Text>
          {!adding && <Pressable onPress={() => setAdding(true)} className="flex-row items-center gap-1 rounded-lg bg-brand-green-700 px-3 py-2"><Plus size={14} color="#fff" /><Text className="text-sm font-bold text-white">Book time off</Text></Pressable>}
        </View>

        {adding && (
          <View className="mb-3 rounded-2xl border border-slate-200 bg-white p-4">
            <View className="flex-row items-center justify-between"><Text className="font-semibold text-slate-800">First day off</Text><Pressable onPress={() => setAdding(false)} accessibilityLabel="Close"><X size={18} color="#94a3b8" /></Pressable></View>
            <DateStrip value={from} onChange={(k) => { setFrom(k); if (to && to < k) setTo(null); }} />
            <Text className="mt-3 font-semibold text-slate-800">Last day off <Text className="font-normal text-slate-400">(optional)</Text></Text>
            <DateStrip value={to} onChange={setTo} from={from ?? undefined} />
            <TextInput value={reason} onChangeText={setReason} maxLength={200} placeholder="Reason (optional)" className="mt-3 rounded-xl border border-slate-300 px-4 py-3 text-slate-900" />
            {from && <Text className="mt-3 text-xs text-slate-500">{labelFor(from)}{to && to !== from ? ` → ${labelFor(to)}` : ""}. Any jobs you already have in this period will be given back to the office.</Text>}
            <Pressable onPress={submitTimeOff} disabled={!from || busy} className="mt-3 items-center rounded-xl bg-brand-green-700 py-3.5 disabled:opacity-50">
              {busy ? <ActivityIndicator color="#fff" /> : <Text className="font-bold text-white">Confirm time off</Text>}
            </Pressable>
          </View>
        )}

        {timeOff.isLoading ? <ActivityIndicator color="#15803d" /> : (timeOff.data ?? []).length === 0 && !adding ? (
          <Text className="text-sm text-slate-400">No time off booked.</Text>
        ) : (
          (timeOff.data ?? []).map((t) => (
            <View key={t.id} className="mb-2 flex-row items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
              <View>
                <Text className="text-sm font-semibold text-slate-800">{labelFor(t.start_date)}{t.end_date !== t.start_date ? ` → ${labelFor(t.end_date)}` : ""}</Text>
                {t.reason ? <Text className="text-xs text-slate-400">{t.reason}</Text> : null}
              </View>
              <Pressable onPress={() => confirmRemove(t.id)} accessibilityLabel="Remove time off" className="h-9 w-9 items-center justify-center rounded-lg bg-red-50"><Trash2 size={15} color="#dc2626" /></Pressable>
            </View>
          ))
        )}

        <Pressable onPress={() => signOut()} className="mt-10 flex-row items-center justify-center gap-2 rounded-xl border-2 border-red-200 bg-white py-3.5">
          <LogOut size={18} color="#dc2626" />
          <Text className="font-bold text-red-600">Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
