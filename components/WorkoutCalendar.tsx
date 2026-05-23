import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { COLORS, FONT_SIZE, SPACING, BORDER_RADIUS, CARD_SHADOW } from '../constants/theme';
import { useUserStore } from '../store/userStore';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PRESET_OPTIONS = [
  { id: 'full_body', name: 'Full Body', icon: '🔥', color: COLORS.brand.orange },
  { id: 'upper_body', name: 'Upper Body', icon: '💪', color: '#A78BFA' },
  { id: 'lower_body', name: 'Lower Body', icon: '🦵', color: '#60A5FA' },
  { id: 'core', name: 'Core Burn', icon: '⚡', color: COLORS.brand.gold },
];

export default function WorkoutCalendar() {
  const { workoutSchedule, updateSchedule, workoutHistory } = useUserStore();
  const [editingDay, setEditingDay] = useState<number | null>(null);

  const getDayStatus = (date: Date) => {
    const dayOfWeek = date.getDay();
    const presetId = workoutSchedule[dayOfWeek];
    const isScheduled = presetId !== null;

    const hasCompleted = workoutHistory.some(w => {
      const d = new Date(w.completedAt);
      return d.toDateString() === date.toDateString();
    });

    return { isScheduled, hasCompleted, presetId };
  };

  const renderWeekView = () => {
    const today = new Date();
    const currentDayIndex = today.getDay();
    
    return (
      <View style={styles.calendarCard}>
        <View style={styles.calendarHeader}>
          <Text style={styles.calendarTitle}>Weekly Schedule</Text>
          <Text style={styles.calendarSubtitle}>Tap a day to edit your plan</Text>
        </View>

        <View style={styles.weekGrid}>
          {DAYS_OF_WEEK.map((dayName, idx) => {
            const date = new Date();
            date.setDate(today.getDate() - currentDayIndex + idx);
            const { isScheduled, hasCompleted, presetId } = getDayStatus(date);
            const isToday = idx === currentDayIndex;

            const presetColor = isScheduled 
              ? PRESET_OPTIONS.find(p => p.id === presetId)?.color || COLORS.brand.orange
              : COLORS.bg.tertiary;

            return (
              <TouchableOpacity 
                key={idx} 
                style={[styles.dayColumn, isToday && styles.dayColumnToday]}
                onPress={() => setEditingDay(idx)}
              >
                <Text style={[styles.dayName, isToday && styles.dayNameToday]}>{dayName}</Text>
                
                <View style={[
                  styles.dayCircle,
                  isScheduled && { borderColor: presetColor, borderWidth: 2 },
                  hasCompleted && { backgroundColor: presetColor }
                ]}>
                  {hasCompleted ? (
                    <Text style={styles.dayIcon}>✓</Text>
                  ) : isScheduled ? (
                    <Text style={[styles.dayIcon, { color: presetColor }]}>•</Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderEditModal = () => {
    if (editingDay === null) return null;
    const currentPreset = workoutSchedule[editingDay];

    return (
      <Modal transparent animationType="fade" visible={editingDay !== null} onRequestClose={() => setEditingDay(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set {DAYS_OF_WEEK[editingDay]}'s Workout</Text>
            
            <ScrollView style={styles.modalScroll}>
              <TouchableOpacity
                style={[styles.presetOption, currentPreset === null && styles.presetOptionActive]}
                onPress={() => {
                  updateSchedule(editingDay, null);
                  setEditingDay(null);
                }}
              >
                <Text style={styles.presetOptionIcon}>💤</Text>
                <Text style={styles.presetOptionText}>Rest Day</Text>
              </TouchableOpacity>

              {PRESET_OPTIONS.map(preset => (
                <TouchableOpacity
                  key={preset.id}
                  style={[styles.presetOption, currentPreset === preset.id && styles.presetOptionActive]}
                  onPress={() => {
                    updateSchedule(editingDay, preset.id);
                    setEditingDay(null);
                  }}
                >
                  <Text style={styles.presetOptionIcon}>{preset.icon}</Text>
                  <Text style={styles.presetOptionText}>{preset.name}</Text>
                  <View style={[styles.presetColorIndicator, { backgroundColor: preset.color }]} />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.closeButton} onPress={() => setEditingDay(null)}>
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      {renderWeekView()}
      {renderEditModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.md,
  },
  calendarCard: {
    backgroundColor: COLORS.bg.secondary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.bg.accent,
    ...CARD_SHADOW,
  },
  calendarHeader: {
    marginBottom: SPACING.md,
  },
  calendarTitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
  },
  calendarSubtitle: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_400Regular',
    color: COLORS.text.secondary,
  },
  weekGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayColumn: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  dayColumnToday: {
    backgroundColor: 'rgba(255, 107, 53, 0.05)',
  },
  dayName: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.text.tertiary,
    marginBottom: SPACING.xs,
  },
  dayNameToday: {
    color: COLORS.brand.orange,
  },
  dayCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.bg.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayIcon: {
    fontSize: 14,
    color: '#FFF',
    fontFamily: 'Inter_700Bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  modalContent: {
    backgroundColor: COLORS.bg.secondary,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: FONT_SIZE.lg,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  modalScroll: {
    marginBottom: SPACING.md,
  },
  presetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.bg.tertiary,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  presetOptionActive: {
    borderColor: COLORS.brand.orange,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
  },
  presetOptionIcon: {
    fontSize: 24,
    marginRight: SPACING.md,
  },
  presetOptionText: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.text.primary,
  },
  presetColorIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  closeButton: {
    alignItems: 'center',
    padding: SPACING.md,
  },
  closeButtonText: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.text.secondary,
  },
});
