# Lottie Animation Files

## 📁 Current Files
```
assets/lottie/
├── fox/
│   ├── fox_idle.json          ← Default state (Fox Hello)
│   ├── fox_happy.json         ← After workout (Fox Running)
│   └── fox_sleeping.json      ← Nighttime (Meditating Fox)
│
└── backgrounds/
    ├── forest_day.json        ← Daytime habitat (Forest Morning)
    ├── forest_night.json      ← Nighttime habitat (UFO Camping Scene)
    └── forest_campfire.json   ← Evening habitat (Warm Nature Scenery)
```

## 🔗 Mood Mapping
| Pet Mood | Lottie File Used | Playback Speed |
|----------|-----------------|----------------|
| idle     | fox_idle.json    | 1x             |
| happy    | fox_happy.json   | 1.3x (faster)  |
| tired    | fox_idle.json    | 0.5x (slower)  |
| sleeping | fox_sleeping.json| 0.7x (slower)  |
| eating   | fox_happy.json   | 1x             |

## 🌲 Background Mapping
| Time of Day  | Lottie File Used      |
|-------------|----------------------|
| 6am – 5pm   | forest_day.json       |
| 5pm – 8pm   | forest_campfire.json  |
| 8pm – 6am   | forest_night.json     |

## ⚠️ Adding New Files
1. File format must be **Lottie JSON** (`.json`)
2. Update `components/PetAvatar.tsx` → add `require()` in LOTTIE_FILES
3. Update `components/ForestBackground.tsx` → add `require()` at top
4. Keep files under 500KB for smooth performance
