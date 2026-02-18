# Performance Profiling (Bun/Node)

Use this skill when:
- a hot path feels slow
- CPU usage is high
- you suspect accidental O(n²) or repeated work
- you need evidence before optimizing

## Node CPU profiling
- `node --cpu-prof ./script.js` writes a `.cpuprofile` file.
- Open in Chrome DevTools → Performance → Load profile.

## Rules
- Optimize based on measured hotspots, not vibes.
- Prefer algorithmic wins (remove repeated work) over micro-optimizations.
- Keep profiling artifacts out of git unless explicitly needed (use `.gitignore`).
