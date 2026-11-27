Desktop packaging uses the original NEON VELOCITY game in itch/app mode.

Build flow:
- VITE_ITCH_BUILD=1 pnpm build:client
- pnpm build:exe

The packaged app intentionally omits online leaderboard, NEON ID, and cross-game navigation.
