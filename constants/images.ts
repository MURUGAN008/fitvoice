// ============================================
// Blaze — Image Registry
// ============================================
// Central registry for all workout & exercise images.
// Metro requires static require() paths — no dynamic strings.
// ============================================

// Workout Plan Cover Images
export const PLAN_IMAGES: Record<string, any> = {
  full_body: require('../assets/images/plans/full_body.jpg'),
  core: require('../assets/images/plans/core.jpg'),
  lower_body: require('../assets/images/plans/lower_body.jpg'),
  upper_body: require('../assets/images/plans/upper_body.jpg'),
};

// Exercise Thumbnail Images (keyed by exercise ID)
export const EXERCISE_IMAGES: Record<string, any> = {
  '1': require('../assets/images/exercises/squats.jpg'),
  '2': require('../assets/images/exercises/standard_pushup.jpg'),
  '3': require('../assets/images/exercises/reverse_lunge.jpg'),
  '4': require('../assets/images/exercises/forearm_plank.png'),
  '5': require('../assets/images/exercises/bicycle_crunch.jpg'),
  '6': require('../assets/images/exercises/bulgarian_split_squat.jpg'),
  '7': require('../assets/images/exercises/burpees.jpg'),
  '8': require('../assets/images/exercises/chair_dips.jpg'),
  '9': require('../assets/images/exercises/glute_bridge.jpg'),
  '10': require('../assets/images/exercises/hollow_body_hold.jpg'),
  '11': require('../assets/images/exercises/jumping_jacks.jpg'),
  '12': require('../assets/images/exercises/jumping_squats.jpg'),
  '13': require('../assets/images/exercises/mountain_climbers.jpg'),
  '14': require('../assets/images/exercises/pike_pushup.jpg'),
  '15': require('../assets/images/exercises/superman_raises.jpg'),
};
