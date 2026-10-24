import { Pressable, ScrollView, View } from 'react-native';

import type { HeatCell } from '@/engine/heatmap';
import { useAcademy } from '@/state/AppProvider';
import { AppText } from '@/ui/components';

const levelLabel = ['No completed learning', 'One completed activity', 'Two completed activities', 'Three or more activities'];

export function Heatmap({
  weeks,
  monthLabels,
  selected,
  onSelect,
}: {
  weeks: HeatCell[][];
  monthLabels: { column: number; label: string }[];
  selected: string | null;
  onSelect: (date: string) => void;
}) {
  const { colors } = useAcademy();
  const fills = [colors.heat0, colors.heat1, colors.heat2, colors.heat3];
  const chartWidth = Math.max(weeks.length, 1) * 16;
  return (
    <View accessibilityRole="summary" accessibilityLabel="Learning activity for the past 12 months">
      <ScrollView horizontal showsHorizontalScrollIndicator nestedScrollEnabled>
        <View style={{ width: chartWidth }}>
      <View style={{ height: 18, marginBottom: 4, position: 'relative' }}>
        {monthLabels.map((month) => (
          <AppText key={`${month.column}-${month.label}`} role="label" style={{ position: 'absolute', left: month.column * 16 }}>
            {month.label}
          </AppText>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 3 }}>
        {weeks.map((week, weekIndex) => (
          <View key={week[0]?.date ?? weekIndex} style={{ gap: 3 }}>
            {week.map((cell) => {
              const fill = cell.future ? colors.future : fills[cell.level];
              const label = cell.future
                ? `${cell.date}, upcoming`
                : `${cell.date}, ${levelLabel[cell.level]}${cell.rest ? ', marked rest day' : ''}`;
              return (
                <Pressable
                  key={cell.date}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityState={{ selected: selected === cell.date }}
                  onPress={() => onSelect(cell.date)}
                  style={{
                    width: 13,
                    height: 13,
                    borderRadius: 3,
                    backgroundColor: fill,
                    borderWidth: selected === cell.date ? 1.5 : 0,
                    borderColor: colors.ink,
                  }}
                />
              );
            })}
          </View>
        ))}
      </View>
        </View>
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
        {levelLabel.map((label, level) => (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: fills[level] }} />
            <AppText role="small">{label}</AppText>
          </View>
        ))}
      </View>
    </View>
  );
}
