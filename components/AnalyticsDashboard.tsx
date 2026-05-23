import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Svg, Rect, G, Text as SvgText, Circle } from 'react-native-svg';
import { COLORS, FONT_SIZE, SPACING, BORDER_RADIUS } from '../constants/theme';
import { useUserStore } from '../store/userStore';
import { MOVEMENTS } from '../app/(tabs)/workouts';

export default function AnalyticsDashboard() {
  const { workoutHistory } = useUserStore();

  const {
    volumeData,
    maxVolume,
    currentWeekVolume,
    lastWeekVolume,
    volumeDiffPercent,
    heatmapData,
    muscleBalance
  } = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 1. Weekly Volume Bar Chart
    const volumeData = Array(7).fill(0);
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let maxVolume = 1;
    let currentWeekVolume = 0;
    let lastWeekVolume = 0;

    // 2. Heatmap (Last 30 days)
    const heatmapData = Array(30).fill(false);

    // 3. Muscle Balance
    const muscleMap: Record<string, number> = {
      Core: 0,
      Quads: 0,
      Glutes: 0,
      Chest: 0,
      Shoulders: 0,
      Cardio: 0,
      Triceps: 0,
      Hamstrings: 0,
      'Lower Back': 0,
    };

    workoutHistory.forEach(log => {
      const d = new Date(log.completedAt);
      const logDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const diffTime = Math.abs(today.getTime() - logDay.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      // Bar Chart & Weekly Insights
      if (diffDays < 7) {
        // Last 7 days
        const jsDay = d.getDay(); // 0 = Sun
        volumeData[jsDay] += log.totalDurationSecs / 60;
        currentWeekVolume += log.totalDurationSecs / 60;
      } else if (diffDays >= 7 && diffDays < 14) {
        // Previous 7 days
        lastWeekVolume += log.totalDurationSecs / 60;
      }

      // Heatmap
      if (diffDays < 30) {
        heatmapData[29 - diffDays] = true;
      }

      // Muscle Balance (only recent 30 days)
      if (diffDays < 30) {
        log.exercises.forEach(ex => {
          const dictEx = MOVEMENTS.find(m => m.name === ex.name);
          if (dictEx) {
            dictEx.targetMuscles.forEach(muscle => {
              if (muscleMap[muscle] !== undefined) {
                muscleMap[muscle] += ex.duration / 60; // minutes spent
              } else {
                muscleMap[muscle] = ex.duration / 60;
              }
            });
          }
        });
      }
    });

    maxVolume = Math.max(10, ...volumeData);
    const volumeDiffPercent = lastWeekVolume > 0 
      ? Math.round(((currentWeekVolume - lastWeekVolume) / lastWeekVolume) * 100) 
      : 100;

    // Sort muscle balance to get top 5
    const muscleBalance = Object.entries(muscleMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, val]) => ({ name, value: val }));

    return { volumeData, maxVolume, currentWeekVolume, lastWeekVolume, volumeDiffPercent, heatmapData, muscleBalance };
  }, [workoutHistory]);

  const renderBarChart = () => {
    const CHART_HEIGHT = 150;
    const CHART_WIDTH = 300;
    const BAR_WIDTH = 20;
    const SPACING = (CHART_WIDTH - (7 * BAR_WIDTH)) / 8;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Training Volume</Text>
          <Text style={styles.cardSubtitle}>Last 7 Days (Minutes)</Text>
        </View>
        
        <View style={styles.chartContainer}>
          <Svg width="100%" height={CHART_HEIGHT + 30} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT + 30}`}>
            {volumeData.map((val, idx) => {
              const barHeight = (val / maxVolume) * CHART_HEIGHT;
              const x = SPACING + idx * (BAR_WIDTH + SPACING);
              const y = CHART_HEIGHT - barHeight;
              const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

              return (
                <G key={idx}>
                  {/* Background track */}
                  <Rect x={x} y={0} width={BAR_WIDTH} height={CHART_HEIGHT} rx={4} fill={COLORS.bg.tertiary} />
                  {/* Actual bar */}
                  {barHeight > 0 && (
                    <Rect x={x} y={y} width={BAR_WIDTH} height={barHeight} rx={4} fill={COLORS.brand.orange} />
                  )}
                  {/* Label */}
                  <SvgText
                    x={x + BAR_WIDTH / 2}
                    y={CHART_HEIGHT + 20}
                    fill={COLORS.text.secondary}
                    fontSize="12"
                    textAnchor="middle"
                  >
                    {dayLabels[idx]}
                  </SvgText>
                  {/* Value */}
                  {val > 0 && (
                    <SvgText
                      x={x + BAR_WIDTH / 2}
                      y={y - 5}
                      fill={COLORS.text.primary}
                      fontSize="10"
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      {Math.round(val)}
                    </SvgText>
                  )}
                </G>
              );
            })}
          </Svg>
        </View>

        <View style={styles.insightsRow}>
          <Text style={styles.insightIcon}>{volumeDiffPercent >= 0 ? '📈' : '📉'}</Text>
          <View>
            <Text style={styles.insightValue}>
              {volumeDiffPercent >= 0 ? '+' : ''}{volumeDiffPercent}% {volumeDiffPercent >= 0 ? 'more' : 'less'}
            </Text>
            <Text style={styles.insightLabel}>volume vs last week</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderHeatmap = () => {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Activity Heatmap</Text>
          <Text style={styles.cardSubtitle}>Last 30 Days</Text>
        </View>
        
        <View style={styles.heatmapGrid}>
          {heatmapData.map((isActive, idx) => (
            <View 
              key={idx} 
              style={[
                styles.heatmapCell, 
                isActive && styles.heatmapCellActive
              ]} 
            />
          ))}
        </View>
      </View>
    );
  };

  const renderMuscleBalance = () => {
    const maxMuscleVal = Math.max(1, ...muscleBalance.map(m => m.value));
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Muscle Group Balance</Text>
          <Text style={styles.cardSubtitle}>Last 30 Days (Minutes)</Text>
        </View>
        
        {muscleBalance.filter(m => m.value > 0).length === 0 ? (
          <Text style={styles.emptyText}>No data yet. Keep working out!</Text>
        ) : (
          <View style={styles.muscleList}>
            {muscleBalance.map((item, idx) => {
              if (item.value === 0) return null;
              const pct = (item.value / maxMuscleVal) * 100;
              return (
                <View key={idx} style={styles.muscleRow}>
                  <Text style={styles.muscleName}>{item.name}</Text>
                  <View style={styles.muscleBarBg}>
                    <View style={[styles.muscleBarFill, { width: `${pct}%` }]} />
                  </View>
                  <Text style={styles.muscleVal}>{Math.round(item.value)}m</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Analytics Dashboard 📈</Text>
      {renderBarChart()}
      {renderHeatmap()}
      {renderMuscleBalance()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xs,
  },
  card: {
    backgroundColor: COLORS.bg.secondary,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.bg.accent,
  },
  cardHeader: {
    marginBottom: SPACING.lg,
  },
  cardTitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
  },
  cardSubtitle: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_400Regular',
    color: COLORS.text.secondary,
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg.tertiary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginTop: SPACING.md,
    gap: SPACING.md,
  },
  insightIcon: {
    fontSize: 24,
  },
  insightValue: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
  },
  insightLabel: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_400Regular',
    color: COLORS.text.secondary,
  },
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  heatmapCell: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: COLORS.bg.tertiary,
  },
  heatmapCellActive: {
    backgroundColor: COLORS.brand.orange,
  },
  emptyText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_400Regular',
    color: COLORS.text.secondary,
    textAlign: 'center',
    paddingVertical: SPACING.lg,
  },
  muscleList: {
    gap: SPACING.md,
  },
  muscleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  muscleName: {
    width: 80,
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.text.secondary,
  },
  muscleBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.bg.tertiary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  muscleBarFill: {
    height: '100%',
    backgroundColor: COLORS.brand.gold,
    borderRadius: 4,
  },
  muscleVal: {
    width: 30,
    textAlign: 'right',
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
  },
});
