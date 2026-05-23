# FitVoice (Blaze) — Complete Development Handoff

## Project Overview
**FitVoice** (brand name: **Blaze**) is an Expo React Native fitness app with a virtual pet (fox) companion that motivates users to work out. The pet gains energy, XP, and evolves as users complete workouts. The app uses gamification (streaks, coins, quests, personal records) to drive retention.

**Tech Stack:**
- Expo SDK 54 / React Native 0.81.5 / React 19
- TypeScript
- Expo Router (file-based routing)
- Zustand (state) + AsyncStorage (local persistence) + Supabase (cloud sync + auth)
- Lottie (pet animations + forest backgrounds)
- expo-video (exercise demo videos from Supabase Storage)
- expo-av (background music)
- expo-haptics, expo-notifications, expo-linear-gradient
- react-native-reanimated, react-native-gesture-handler, react-native-svg

---

## Current App Structure

```
app/
  _layout.tsx           — Root: fonts, auth listener, splash screen
  index.tsx             — Auth redirect gate
  workout.tsx           — Full workout flow (preview → active → rest → finished)
  (auth)/
    _layout.tsx         — Stack for auth screens
    login.tsx           — Email/password + Google OAuth
    signup.tsx          — Email signup
    onboarding.tsx      — 6-step story-driven onboarding (name → pet → goals → schedule)
  (tabs)/
    _layout.tsx         — Bottom tab navigator (Home, Workout, Progress, Profile)
    index.tsx           — Home: Forest habitat + pet + energy bars + missions + quests + workout cards
    workouts.tsx        — Workout library: Presets tab + Movements dictionary tab
    progress.tsx        — Pet level, weekly calendar, streak shields, badges, PRs, workout history
    profile.tsx         — Bio metrics, training commitment, shop (accessories + habitats), account actions

components/
  CircularTimer.tsx     — SVG animated ring timer
  ConfettiBlast.tsx     — Celebration particle effect
  ForestBackground.tsx  — Lottie forest (day/night/campfire) with seamless color matching
  GradientHeader.tsx    — Reusable screen header
  PetAvatar.tsx         — Lottie fox with evolution stages (6 tiers), glow, badges
  StrokeText.tsx        — Text with outline/stroke effect

constants/
  images.ts             — Static require() registry for all plan/exercise images
  levels.ts             — 20-level progression table with XP thresholds
  shop.ts               — 10 shop items (6 accessories + 4 habitats) with costs + level locks
  theme.ts              — Colors, spacing, font sizes, border radius, shadows

lib/
  database.ts           — Supabase profile CRUD + workout logging
  notifications.ts      — Push notification scheduling (workout reminders, streak rescue, low energy)
  supabase.ts           — Supabase client config with AsyncStorage auth adapter

store/
  userStore.ts           — Zustand store: auth, onboarding, pet stats, workout/exercise history, shop (buy/equip), progressive overload (PRs)

types/
  index.ts               — All TypeScript types (Profile, PetState, Exercises, Workouts, Badges, Quests, ExerciseRecord, PersonalRecord, OnboardingData, etc.)

assets/
  audio/default.mp3      — Default workout music
  images/exercises/      — 15 exercise thumbnail JPGs
  images/plans/          — 4 workout plan cover images
  lottie/backgrounds/    — forest_day.json, forest_night.json, forest_campfire.json
  lottie/fox/            — fox_idle.json, fox_happy.json, fox_sleeping.json
```

---

## Features Already Implemented

### Core Workout Flow
- 15 bodyweight exercises with video demos (loaded from Supabase Storage)
- 5 preset workouts: Full Body (20min), Core (10min), Lower Body (15min), Upper Body (15min), Streak Saver (2min)
- Drag-to-reorder exercises in preview
- Duration stepper (+/- 5s per exercise)
- Exercise swap modal (pick from full library)
- States: Preview → Prepare (5s) → Active → Rest (5s) → Finished
- Circular animated timer, progress dots, rotating tips
- Pause/resume with sleeping fox warning after 10s idle
- Finish-early (skip) button
- Masterclass modal (target muscles + common mistakes)
- Background music player with 4 tracks + audio settings (coach voice, music, SFX toggles)

### Virtual Pet System
- Lottie-animated fox with 3 moods (idle, happy, sleeping)
- Mood changes based on time of day + energy level
- Dialogue bubble with contextual messages
- 6 evolution stages: Egg → Kit → Young → Athletic → Champion → Legendary
- Visual evolution: glow color/size scaling, evolution ring, stage badge emoji
- Energy (HP) system: 100% after workout, decays on streak break
- Forest habitat background that changes: day / evening (campfire) / night

### Gamification
- XP + Level system (20 levels with increasing XP thresholds)
- Streak tracking with streak break penalty (-20 energy)
- Rest Shield tokens (earned every 3-day streak, protect streak without workout)
- Coins (earned 1/minute per workout, min 3)
- Pet Shop: 6 accessories + 4 habitat themes with coin costs + level requirements
- Buy/equip flow with Alert confirmations
- Daily Quests (3 per day: complete workout, keep streak, earn XP)
- Weekly Challenge (work out 3 days/week with progress bar)
- 4 achievement badges in Progress screen
- Confetti blast on workout completion
- "NEW RECORD!" celebration when beating personal bests

### Progressive Overload Tracking
- Per-exercise history recorded on every workout completion
- Personal Records computed: best duration, last duration, total sessions, improved flag
- "Best: Xs / Last: Xs" shown on preview cards
- "Last: Xs / Best: Xs" banner shown during active exercise
- "NEW RECORD!" banner when beating PR during workout
- "New PR: [exercises]" shown in workout finished reward box
- Full Personal Records section in Progress screen with visual indicators

### Smart Features
- Today's Mission card on home screen (auto-selects workout based on schedule day)
- "Done! ✅" indicator if already worked out today
- Late night streak rescue card (appears after 8 PM on scheduled days)
- Push notifications: workout day reminders (9 AM), streak rescue (8 PM), low energy (6 PM)
- Post-workout mood rating (5 emoji scale: Exhausted → On Fire!)

### Auth & Cloud
- Supabase auth (email/password + Google OAuth)
- Cloud sync for profile + workout logs
- Local-first with AsyncStorage persistence, cloud as backup
- Story-driven 6-step onboarding flow

---

## KNOWN BUGS & ISSUES TO FIX

### Critical Bugs
1. **LinearGradient type error** in `app/workout.tsx` line ~664: `colors={[COLORS.brand.orange, COLORS.brand.flame] as unknown as string[]}` — the `as unknown as string[]` cast is a hack. The correct fix is: `colors={[COLORS.brand.orange, COLORS.brand.flame] as [string, string, ...string[]]}` or just `colors={[COLORS.brand.orange, COLORS.brand.flame]}` if the types align.

2. **Energy decay is too aggressive**: Energy only drops when `calculateStreak()` detects a missed day (-20), but there's no gradual decay over time. The pet can stay at 100% energy forever after one workout. Need a decay mechanism (e.g., -5 energy per day without workout, minimum 0).

3. **`coachVoiceEnabled` state in workout.tsx is unused**: The `coachVoiceEnabled` toggle exists in the audio settings modal but no `expo-speech` TTS is actually implemented. The app name is "FitVoice" but there's no voice coaching. This is a major gap — see P2 features below.

4. **Daily Quest "Earn 30+ XP today" is never auto-completed**: The `done` flag is hardcoded to `false`. Need to track session XP and compare against threshold.

5. **Workout video URLs may fail offline**: Videos are loaded from Supabase Storage with no local caching. If offline or slow connection, users see a loading spinner indefinitely with no fallback.

6. **`exerciseHistory` is not synced to cloud**: Only `workoutHistory` syncs to Supabase. The `exerciseHistory` array (for progressive overload) only exists locally. If user switches devices, PR data is lost.

### UI/UX Issues
7. **Home screen is very long**: With forest hero + bars + mission card + quests + workout rows, there's a lot of scrolling. Consider collapsing sections or using a more compact layout.

8. **Shop items don't visually affect the pet**: Buying a "Fire Crown" or "Cool Shades" doesn't change the fox's appearance — it's just a text label. The accessories need to render as overlays on the PetAvatar.

9. **Habitat themes don't change the background**: Buying "Volcano Peak" or "Sunset Beach" doesn't swap the Lottie animation. The `activeHabitat` is stored but `ForestBackground.tsx` ignores it entirely.

10. **No "Add Exercise" button in workout preview**: Users can swap and reorder, but can't add a new exercise from scratch. They're limited to the preset's exercise count.

11. **Streak Saver workout doesn't have a card in the workout rows**: The horizontal scroll on home shows Full Body, Core, and Streak Saver, but Lower Body and Upper Body are in a separate "Focus Areas" row. The layout is inconsistent.

12. **Onboarding "Skip Login" button is visible in production**: The `handleSkipLogin` function in login.tsx bypasses auth for testing but should be removed or hidden behind a dev flag.

---

## FEATURES TO BUILD (Prioritized)

### P2 — Medium Priority (Build Next)

#### 1. Voice Coach System (HIGH — App is literally called "FitVoice")
**Why**: The app name promises voice coaching but it's completely missing. `expo-speech` is already in dependencies.
**Implementation**:
- Create `lib/voiceCoach.ts` using `expo-speech`
- During workout: announce exercise name at start ("Next up: Squats!")
- Countdown announcements: "3, 2, 1, GO!" at end of prepare phase
- Mid-exercise encouragement: "Halfway there!" when 50% time elapsed
- Rest announcements: "Rest. Next exercise: Push-Ups"
- Motivational phrases on PR beats: "New personal record! Amazing!"
- Respect the `coachVoiceEnabled` toggle (already exists in workout audio settings)
- Voice personality options (gentle/energetic/military) — could be a shop item
- Add `expo-speech` to the actual speech calls (it's in package.json but never used)

#### 2. Exercise Library Browser with Filtering & Search
**Why**: Currently the Movements tab in workouts.tsx shows a flat grid with no search or filtering.
**Implementation**:
- Add search bar at top of Movements tab
- Filter by muscle group (chips: Core, Legs, Chest, Shoulders, Full Body, Cardio)
- Filter by difficulty (Easy / Medium / Hard)
- Sort by: Name A-Z, Difficulty, Most Used
- Show "last performed" date on each exercise card using `getLastPerformance()`
- Add "favorite" exercises (heart icon) stored in user preferences
- Allow building a custom workout from the library (select exercises → go to workout preview)

#### 3. Detailed Analytics Dashboard
**Why**: Serious fitness users expect data. The Progress screen shows basic stats but no trends.
**Implementation**:
- New section in Progress screen or a dedicated "Insights" tab
- Weekly/Monthly workout volume chart (using `react-native-svg` charts or a charting lib)
- Muscle group balance radar chart (% of workouts targeting each muscle group)
- Streak history graph (last 30 days, GitHub-style heatmap)
- "Compared to last week" insights: "+15% more volume", "3 more sessions"
- Personal records timeline (when each PR was set)
- Consider adding `react-native-gifted-charts` or `victory-native` for charts

#### 4. Workout Calendar & Scheduling
**Why**: Users want to plan their week, not just react to reminders.
**Implementation**:
- Calendar view showing past workouts (colored dots) and planned workouts (outlined dots)
- Assign specific presets to specific days (e.g., Mon=Upper, Wed=Lower, Fri=Full Body)
- Store scheduled presets in `onboardingData` or a new `workoutSchedule` field
- "Today's Mission" card should pull from this schedule instead of cycling
- Week/Month view toggle
- Show streak on calendar (consecutive colored days)

#### 5. League System (Duolingo-style)
**Why**: Duolingo's #1 retention mechanic. Creates competitive urgency.
**Implementation**:
- New `league` field in PetStats: bronze, silver, gold, platinum, diamond
- Based on weekly XP earned
- After each week: top 10 in league advance, bottom 3 drop
- Show league badge on home screen near stats
- League leaderboard screen (can mock with local data first, later add Supabase)
- League promotion/demotion animations
- Store: `currentLeague`, `weeklyXp`, `leagueRank`

### P3 — Lower Priority (Build After P2)

#### 6. Social Features
- Friend system via invite codes
- See friends' streaks and pet levels
- "Workout with a friend" — synchronized session
- Share card generation (beautiful post-workout card for Instagram/WhatsApp)
- Friend leaderboard

#### 7. Offline Mode
- Cache exercise videos locally after first load (use `expo-file-system`)
- Full offline workout capability
- Queue cloud sync for when back online
- Show offline indicator in UI

#### 8. Apple Health / Google Fit Integration
- Use `react-native-health` or HealthKit APIs
- Auto-import step count, heart rate
- Show "You walked 8,000 steps today — worth 10 bonus XP!"
- Export workout data to Health app
- Huge for App Store discoverability

#### 9. Wearable Support
- Apple Watch companion (WatchOS via Expo?)
- Show timer + next exercise on wrist
- Haptic cues for rest/start
- Heart rate zones during workout

#### 10. Custom Workout Builder
- Build a workout from scratch (not just modify presets)
- Set custom rest times per exercise
- Set rep targets instead of just duration
- Save custom workouts with names
- Share custom workouts with friends

---

## ARCHITECTURE NOTES FOR THE NEXT DEVELOPER

### State Management
- **Zustand** with `persist` middleware → saves to AsyncStorage automatically
- **Only these keys are persisted**: `isOnboarded`, `onboardingData`, `petStats`, `workoutHistory`, `exerciseHistory`
- Session/auth is NOT persisted (managed by Supabase SecureStore)
- Cloud sync is fire-and-forget (non-blocking), local state is source of truth

### Exercise ID System
- Exercises have numeric `id` fields ("1" through "15") used for images and video URLs
- **Progressive overload uses a DIFFERENT ID**: `name.toLowerCase().replace(/[^a-z0-9]/g, '_')` — e.g., "Standard Push-Up" → "standard_push_up"
- This is a bit messy. Consider unifying to use the numeric IDs for everything, with a name→ID lookup map.

### Lottie Animations
- Only 3 fox moods exist as Lottie files: idle, happy, sleeping
- Tired and eating map to idle and happy respectively
- Only 3 forest backgrounds: day, night, campfire
- **Shop habitat themes have NO Lottie files** — they're just metadata. Need to either:
  a) Create/buy Lottie files for each habitat, or
  b) Use color overlays/filters on the existing forest animation

### Supabase Storage
- Exercise videos are stored in a public bucket called `workouts`
- Music files are stored in a public bucket called `music`
- Video URL format: `${supabaseUrl}/storage/v1/object/public/workouts/${filename}`
- The `supabaseUrl` comes from `process.env.EXPO_PUBLIC_SUPABASE_URL`

### Navigation Flow
```
App Start → _layout.tsx (auth check)
  → Not logged in → (auth)/login.tsx
  → Logged in + not onboarded → (auth)/onboarding.tsx
  → Logged in + onboarded → (tabs)/index.tsx

Workout flow: (tabs)/workouts.tsx → /workout.tsx (separate stack screen)
```

### Key Environment Variables (.env)
```
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### Fonts
Only these 4 are loaded: `Inter_400Regular`, `Inter_500Medium`, `Inter_600SemiBold`, `Inter_700Bold`
Do NOT use `Inter_800ExtraBold` or any other weight — it will silently fall back to system font.

### Color System
All colors are in `constants/theme.ts`:
- Background: `bg.primary` (#0A0A1A), `bg.secondary` (#12122A), `bg.tertiary` (#1A1A3E), `bg.accent` (#252550)
- Brand: `brand.orange` (#FF6B35), `brand.gold` (#FFB347), `brand.ember` (#FF8C42), `brand.flame` (#FF4500), `brand.sunset` (#FF6B6B)
- Text: `text.primary` (#FFFFFF), `text.secondary` (#A0A0C0), `text.tertiary` (#6B6B8A)

---

## SUPABASE DATABASE SCHEMA (Current)

### `profiles` table
```sql
id UUID PRIMARY KEY REFERENCES auth.users,
name TEXT,
gender TEXT,
age INTEGER,
height_cm FLOAT,
weight_kg FLOAT,
goal TEXT,
fitness_level TEXT,
session_duration_mins INTEGER DEFAULT 20,
injuries TEXT[] DEFAULT '{}',
workout_days INTEGER[] DEFAULT '{1,3,5}',
pet_name TEXT DEFAULT 'Blaze',
level INTEGER DEFAULT 1,
xp INTEGER DEFAULT 0,
xp_needed INTEGER DEFAULT 100,
energy INTEGER DEFAULT 20,
streak INTEGER DEFAULT 0,
coins INTEGER DEFAULT 0,
rest_tokens INTEGER DEFAULT 1,
last_workout_date TIMESTAMPTZ,
is_onboarded BOOLEAN DEFAULT false,
created_at TIMESTAMPTZ DEFAULT now(),
updated_at TIMESTAMPTZ DEFAULT now()
```

### `workout_logs` table
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID REFERENCES auth.users NOT NULL,
preset TEXT,
exercises JSONB DEFAULT '[]',
total_duration_secs INTEGER,
total_xp INTEGER,
completed_at TIMESTAMPTZ DEFAULT now()
```

### Missing Tables (need to create)
- `exercise_history` — for cloud-synced progressive overload data
- `shop_purchases` — for cloud-synced owned items
- `leagues` / `league_members` — for league system
- `friends` — for social features

---

## QUICK WINS (Easy fixes that make a big difference)

1. **Fix the LinearGradient type cast** in workout.tsx (2-minute fix)
2. **Add energy decay over time**: In `calculateStreak()`, also reduce energy by 5 per day since last workout
3. **Hide "Skip Login" in production**: Wrap in `__DEV__` check
4. **Complete the daily quest "Earn 30+ XP" tracking**: Compare `sessionXpTotal` from latest workout history entry
5. **Add coin display to workout finished screen**: Show "+X coins earned!" alongside XP
6. **Make shop accessories render on PetAvatar**: Render emoji overlays at specific positions based on `activeAccessory`
7. **Respect `activeHabitat` in ForestBackground.tsx**: Switch Lottie source or apply color tinting based on the equipped habitat
8. **Add a "Quick Start" button on home screen**: One-tap to start Today's Mission without scrolling
9. **Show workout streak on the home screen hero**: Add "🔥 X days" prominently near the pet
10. **Add haptic feedback on quest completion**: When a quest checkbox turns green
