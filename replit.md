# مَعرِفة — Marifa Game

An Arabic-language educational RPG web game built with React + Vite + TypeScript + Tailwind CSS. Players answer Arabic grammar questions to progress through a space-themed solar system (Neptune to the Sun), fighting monsters in turn-based combat.

## Architecture

- **Framework**: React 18 + Vite 5 + TypeScript
- **Styling**: Tailwind CSS v3 + Framer Motion
- **UI**: Radix UI / Shadcn components
- **State**: React Context (`src/context/GameContext.tsx`) + localStorage persistence
- **Routing**: Internal state machine in `src/pages/Index.tsx` (no React Router for screen transitions)

## Screen Flow

```
entry → planets → islands → battle
                     ↑         ↓
                   scroll ←──────
```

- **entry**: First-time registration (hero selection, name, email)
- **scroll**: Parchment home screen for already-logged-in players
- **planets**: Solar system planet map
- **islands**: Zig-zag island map per planet
- **battle**: Turn-based combat with sprite animations

## Key Files

| File | Purpose |
|------|---------|
| `src/pages/Index.tsx` | Main screen state machine + navigation |
| `src/components/EntryScreen.tsx` | Parchment scroll intro + registration wizard |
| `src/components/BattleScreen.tsx` | Full combat engine — DynamicSprite is pixel-perfect, do NOT modify getSpritePath or DynamicSprite logic |
| `src/components/IslandMap.tsx` | Zig-zag island selection |
| `src/components/PlanetMap.tsx` | Planet selection screen |
| `src/lib/gameState.ts` | All game data: planets, islands, questions, characters, battle settings |
| `src/context/GameContext.tsx` | Global player state |
| `src/components/AdminPanel.tsx` | Admin dashboard — edit islands, questions, players, per-hero/per-monster attack, shop |

## Admin → Battle Wiring

The admin "⚔️ القتال" tab now controls real damage:
- `battleSettings.heroAttack[heroFolder]` — damage each hero deals (hero1/hero2/hero3)
- `battleSettings.monsterAttack[monsterFolder]` — damage each monster deals (monster1–monster4)
- Falls back to `playerAttack` / `guardAttack` defaults if a specific value is missing
- `BattleScreen` reads these from `useGame().state.battleSettings` at attack time

## Sprite System (BattleScreen — STRICT CONSTRAINTS)

- `DynamicSprite` component is pixel-perfect — do NOT modify
- `getSpritePath` logic is correct — do NOT change file name mappings
- `monster3` uses `Take hit.png` (lowercase 'h') — intentional
- `monster2` uses individual frame files (not sprite sheets)
- Heroes always on LEFT, monsters on RIGHT, facing each other via `facesRight` + `scaleX` flip logic
- `DISPLAY_H = 256` logical pixels, CSS `--sprite-scale` scales up for larger screens

## Combat Asset Paths

All under `/src/assets/combat/`:
- `hero1/`, `hero2/`, `hero3/Sprites/` — player characters
- `monster1/Sprites/`, `monster2/Individual Sprite/`, `monster3/Sprites/`, `monster4/Sprites/` — enemies
- `monster4/islands/island{n}.png` — battle backgrounds + island thumbnails

## UI Design Principles

- **Scroll screen**: Parchment aesthetic with leather-styled narrow buttons
- **Health bars**: Metallic gradient with ghost delay effect and scan shimmer
- **Question panel**: Glassmorphism with animated cyan glow borders and corner accents
- **Victory/Defeat**: Full-screen epic overlay sliding up from bottom on mobile
- **Mobile-first**: All layouts use responsive clamps and `min-h-screen` with safe padding

## Running

```bash
npm run dev   # starts Vite dev server on port 5000
npm run build # production build
```
