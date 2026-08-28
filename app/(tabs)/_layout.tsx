import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Operations",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen name="queue" options={{ title: "Queue", tabBarIcon: ({ color }) => <IconSymbol size={26} name="list.bullet" color={color} /> }} />
      <Tabs.Screen name="patients" options={{ title: "Patients", tabBarIcon: ({ color }) => <IconSymbol size={26} name="person.2.fill" color={color} /> }} />
      <Tabs.Screen name="referrals" options={{ title: "Referrals", tabBarIcon: ({ color }) => <IconSymbol size={26} name="arrow.triangle.2.circlepath" color={color} /> }} />
      <Tabs.Screen name="medicines" options={{ title: "Medicines", tabBarIcon: ({ color }) => <IconSymbol size={26} name="pills.fill" color={color} /> }} />
    </Tabs>
  );
}
