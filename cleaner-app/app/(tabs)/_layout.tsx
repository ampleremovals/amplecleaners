import { Tabs } from "expo-router";
import { Home, CalendarDays, Wallet, User } from "lucide-react-native";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#15803d",
        tabBarInactiveTintColor: "#94a3b8",
        tabBarStyle: { height: 84, paddingTop: 6 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Today", tabBarIcon: ({ color }) => <Home size={22} color={color} /> }} />
      <Tabs.Screen name="schedule" options={{ title: "Schedule", tabBarIcon: ({ color }) => <CalendarDays size={22} color={color} /> }} />
      <Tabs.Screen name="earnings" options={{ title: "Earnings", tabBarIcon: ({ color }) => <Wallet size={22} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color }) => <User size={22} color={color} /> }} />
    </Tabs>
  );
}
