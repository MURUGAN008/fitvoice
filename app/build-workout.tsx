import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Modal } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GripVertical, X } from 'lucide-react-native';
import { COLORS, FONT_SIZE, SPACING, BORDER_RADIUS, CARD_SHADOW } from '../constants/theme';
import { useUserStore } from '../store/userStore';
import { MOVEMENTS } from './(tabs)/workouts';
import { CustomWorkoutPlan } from '../types';

interface BuilderExercise {
  tempId: string;
  exerciseId: string;
  name: string;
  duration: number; // in seconds
}

export default function BuildWorkoutScreen() {
  const { saveCustomWorkout } = useUserStore();
  
  const [workoutName, setWorkoutName] = useState('');
  const [exercises, setExercises] = useState<BuilderExercise[]>([]);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);

  // Global settings
  const [defaultWorkSecs, setDefaultWorkSecs] = useState(45);
  const [defaultRestSecs, setDefaultRestSecs] = useState(15);

  const handleSave = () => {
    if (!workoutName.trim()) {
      alert('Please name your workout.');
      return;
    }
    
    if (exercises.length === 0) {
      alert('Add at least one exercise.');
      return;
    }

    const plan: CustomWorkoutPlan = {
      id: `custom_${Date.now()}`,
      name: workoutName,
      createdAt: new Date().toISOString(),
      exercises: exercises.map(ex => ({
        id: ex.exerciseId,
        duration: ex.duration,
      })),
      restDuration: defaultRestSecs,
    };

    saveCustomWorkout(plan);
    router.back();
  };

  const addExercise = (exerciseId: string, name: string) => {
    setExercises(prev => [
      ...prev,
      {
        tempId: `ex_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        exerciseId,
        name,
        duration: defaultWorkSecs,
      }
    ]);
    setIsAddModalVisible(false);
  };

  const removeExercise = (tempId: string) => {
    setExercises(prev => prev.filter(ex => ex.tempId !== tempId));
  };

  const updateDuration = (tempId: string, delta: number) => {
    setExercises(prev => prev.map(ex => {
      if (ex.tempId === tempId) {
        return { ...ex, duration: Math.max(5, ex.duration + delta) };
      }
      return ex;
    }));
  };

  const handleDefaultRestChange = (newVal: number) => {
    setDefaultRestSecs(newVal);
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<BuilderExercise>) => {
    return (
      <ScaleDecorator>
        <TouchableOpacity
          onLongPress={drag}
          disabled={isActive}
          style={[styles.exerciseCard, isActive && styles.exerciseCardActive]}
        >
          <View style={styles.dragHandle}>
            <GripVertical size={20} color={COLORS.text.tertiary} />
          </View>
          
          <View style={styles.exerciseInfo}>
            <Text style={styles.exerciseName}>{item.name}</Text>
          </View>
          
          <View style={styles.durationControls}>
            <TouchableOpacity onPress={() => updateDuration(item.tempId, -5)} style={styles.ctrlBtn}>
              <Text style={styles.ctrlBtnText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.durationText}>{item.duration}s</Text>
            <TouchableOpacity onPress={() => updateDuration(item.tempId, 5)} style={styles.ctrlBtn}>
              <Text style={styles.ctrlBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => removeExercise(item.tempId)} style={styles.removeBtn}>
            <X size={20} color={COLORS.state.error} />
          </TouchableOpacity>
        </TouchableOpacity>
      </ScaleDecorator>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Builder</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.configSection}>
        <TextInput
          style={styles.nameInput}
          placeholder="Workout Name (e.g. Core Crusher)"
          placeholderTextColor={COLORS.text.tertiary}
          value={workoutName}
          onChangeText={setWorkoutName}
        />
        
        <View style={styles.globalSettings}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Default Work</Text>
            <View style={styles.durationControls}>
              <TouchableOpacity onPress={() => setDefaultWorkSecs(Math.max(5, defaultWorkSecs - 5))} style={styles.ctrlBtn}>
                <Text style={styles.ctrlBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.durationText}>{defaultWorkSecs}s</Text>
              <TouchableOpacity onPress={() => setDefaultWorkSecs(defaultWorkSecs + 5)} style={styles.ctrlBtn}>
                <Text style={styles.ctrlBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Default Rest</Text>
            <View style={styles.durationControls}>
              <TouchableOpacity onPress={() => handleDefaultRestChange(Math.max(0, defaultRestSecs - 5))} style={styles.ctrlBtn}>
                <Text style={styles.ctrlBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.durationText}>{defaultRestSecs}s</Text>
              <TouchableOpacity onPress={() => handleDefaultRestChange(defaultRestSecs + 5)} style={styles.ctrlBtn}>
                <Text style={styles.ctrlBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.listContainer}>
        {exercises.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No exercises added yet.</Text>
            <Text style={styles.emptySubtext}>Tap the + button below to start building your custom routine.</Text>
          </View>
        ) : (
          <DraggableFlatList
            data={exercises}
            onDragEnd={({ data }) => setExercises(data)}
            keyExtractor={(item) => item.tempId}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.addExerciseBtn} onPress={() => setIsAddModalVisible(true)}>
          <Text style={styles.addExerciseBtnText}>+ Add Exercise</Text>
        </TouchableOpacity>
      </View>

      {/* Add Exercise Modal */}
      <Modal visible={isAddModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <Animated.View entering={SlideInDown} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Movement</Text>
              <TouchableOpacity onPress={() => setIsAddModalVisible(false)}>
                <Text style={styles.modalCloseText}>Done</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.movementsList}>
              {MOVEMENTS.filter(m => m.id !== 'rest' && m.name.toLowerCase() !== 'rest').map(m => (
                <TouchableOpacity 
                  key={m.id} 
                  style={styles.movementOption} 
                  onPress={() => addExercise(m.id, m.name)}
                >
                  <Text style={styles.movementOptionName}>{m.name}</Text>
                  <Text style={styles.movementOptionTarget}>{m.targetMuscles.join(', ')}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.bg.secondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bg.accent,
  },
  backBtn: {
    padding: SPACING.xs,
  },
  backBtnText: {
    color: COLORS.text.secondary,
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_500Medium',
  },
  headerTitle: {
    color: COLORS.text.primary,
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_700Bold',
  },
  saveBtn: {
    backgroundColor: COLORS.brand.orange,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_600SemiBold',
  },
  configSection: {
    padding: SPACING.lg,
    backgroundColor: COLORS.bg.secondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bg.accent,
    marginBottom: SPACING.md,
  },
  nameInput: {
    fontSize: FONT_SIZE.xl,
    fontFamily: 'Inter_700Bold',
    color: COLORS.text.primary,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.brand.orange,
    paddingBottom: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  globalSettings: {
    gap: SPACING.md,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabel: {
    color: COLORS.text.secondary,
    fontFamily: 'Inter_500Medium',
    fontSize: FONT_SIZE.sm,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: SPACING.lg,
    paddingBottom: 100, // Make room for footer
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    color: COLORS.text.primary,
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: SPACING.sm,
  },
  emptySubtext: {
    color: COLORS.text.tertiary,
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg.secondary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.bg.accent,
    ...CARD_SHADOW,
  },
  exerciseCardActive: {
    borderColor: COLORS.brand.orange,
    transform: [{ scale: 1.02 }],
  },
  dragHandle: {
    padding: SPACING.sm,
    marginRight: SPACING.sm,
  },
  dragIcon: {
    color: COLORS.text.tertiary,
    fontSize: 20,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    color: COLORS.text.primary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: FONT_SIZE.sm,
  },
  durationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg.tertiary,
    borderRadius: BORDER_RADIUS.md,
  },
  ctrlBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  ctrlBtnText: {
    color: COLORS.text.primary,
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_600SemiBold',
  },
  durationText: {
    color: COLORS.text.primary,
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_700Bold',
    width: 35,
    textAlign: 'center',
  },
  removeBtn: {
    padding: SPACING.sm,
    marginLeft: SPACING.sm,
  },
  removeBtnText: {
    color: COLORS.state.error,
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_700Bold',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.lg,
    paddingBottom: 40,
    backgroundColor: COLORS.bg.secondary,
    borderTopWidth: 1,
    borderTopColor: COLORS.bg.accent,
  },
  addExerciseBtn: {
    backgroundColor: COLORS.brand.orange,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  addExerciseBtnText: {
    color: '#fff',
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_700Bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.bg.secondary,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    height: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bg.accent,
  },
  modalTitle: {
    color: COLORS.text.primary,
    fontSize: FONT_SIZE.lg,
    fontFamily: 'Inter_700Bold',
  },
  modalCloseText: {
    color: COLORS.brand.orange,
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_600SemiBold',
  },
  movementsList: {
    padding: SPACING.lg,
  },
  movementOption: {
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bg.tertiary,
  },
  movementOptionName: {
    color: COLORS.text.primary,
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_600SemiBold',
  },
  movementOptionTarget: {
    color: COLORS.text.secondary,
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
});
