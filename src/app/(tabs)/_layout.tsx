import { NativeTabs } from 'expo-router/native-tabs';

import { useAcademy } from '@/state/AppProvider';

export default function TabLayout() {
  const { colors } = useAcademy();
  return (
    <NativeTabs
      backgroundColor={colors.surface}
      indicatorColor={colors.surface2}
      iconColor={colors.muted}
      labelStyle={{ selected: { color: colors.ink }, default: { color: colors.muted } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house" md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="curriculum">
        <NativeTabs.Trigger.Label>Curriculum</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="books.vertical" md="menu_book" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="revision">
        <NativeTabs.Trigger.Label>Revision</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="arrow.clockwise" md="history" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="progress">
        <NativeTabs.Trigger.Label>Progress</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.bar" md="bar_chart" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gearshape" md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
