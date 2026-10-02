import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LogOut, User } from "lucide-react-native";
import { signOut } from "@/lib/auth";

export default function ProfileScreen() {
  return (
    <SafeAreaView className="flex-1 bg-slate-50 px-5 pt-4">
      <Text className="text-2xl font-bold text-slate-900">Profile</Text>

      <View className="mt-6 flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-brand-teal-100">
          <User size={22} color="#0f766e" />
        </View>
        <View>
          <Text className="font-bold text-slate-900">Your profile</Text>
          <Text className="text-sm text-slate-500">Name, phone, DBS status — Phase 2</Text>
        </View>
      </View>

      <Pressable
        onPress={() => signOut()}
        className="mt-8 flex-row items-center justify-center gap-2 rounded-xl border-2 border-red-200 bg-white py-3.5"
      >
        <LogOut size={18} color="#dc2626" />
        <Text className="font-bold text-red-600">Sign out</Text>
      </Pressable>
    </SafeAreaView>
  );
}
