---
description: How to improve Quest codebase using Gemini CLI
---

# Improving Quest

This workflow guides agents on how to improve the Quest game codebase.

## Project Structure
Quest is a React + Three.js game with the following structure:

```
/Users/dalnk/quest/
├── src/
│   ├── state/          # Zustand stores and types
│   │   ├── types.ts    # Core type definitions
│   │   ├── gameStore.ts
│   │   └── memoryStore.ts
│   ├── game/           # 3D scene and registry
│   │   ├── Village.tsx
│   │   ├── Environment.tsx
│   │   └── registry.ts # Building definitions
│   ├── tasks/          # Agent task system
│   │   ├── TaskDefinition.ts
│   │   └── taskStore.ts
│   ├── ui/             # React UI components
│   │   ├── HUD.tsx
│   │   └── TaskEditor.tsx
│   ├── buildings/      # 3D building components
│   ├── villagers/      # Villager components
│   └── cli/            # CLI integration (this)
└── package.json
```

## Key Files to Modify

### Adding a New Building Type
1. Add type to `src/state/types.ts` BuildingType union
2. Add definition to `src/game/registry.ts` BUILDING_REGISTRY
3. Optionally add visual in `src/buildings/Building.tsx`

### Adding a New Task Type  
1. Add to TaskType union in `src/tasks/TaskDefinition.ts`
2. Add template to TASK_TEMPLATES array

### Modifying UI
- Main HUD: `src/ui/HUD.tsx`
- Task creation: `src/ui/TaskEditor.tsx`
- Styles: `src/index.css`

## Guidelines
- Keep changes modular and focused
- Run `npm run build` to verify no errors
- The dev server has HMR, so changes reload automatically
