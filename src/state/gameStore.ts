import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Building, Villager, Task, Toast, GameState } from './types';
import { getBuildingDef } from '../game/registry';

const VILLAGER_NAMES = [
  'Chip', 'Dash', 'Fizz', 'Gizmo', 'Jinx', 'Koda', 'Luna', 'Milo',
  'Nova', 'Ozzy', 'Pip', 'Quinn', 'Rex', 'Sox', 'Tux', 'Vex', 'Wren', 'Zep'
];

const generateId = () => Math.random().toString(36).substring(2, 9);

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      // Initial state
      gold: 500,
      elixir: 250,
      completedTasks: 0,

      buildings: [
        {
          id: 'townhall-1',
          type: 'townhall',
          position: [0, 0, 0],
          level: 1,
          isConstructing: false,
          constructionProgress: 100,
        },
      ],

      villagers: [
        {
          id: 'villager-1',
          name: 'Chip',
          position: [2, 0, 2],
          state: 'idle',
        },
        {
          id: 'villager-2',
          name: 'Luna',
          position: [-2, 0, 1],
          state: 'idle',
        },
      ],

      tasks: [],

      selectedBuildingId: null,
      isPlacingBuilding: null,
      toasts: [],

      gameTime: 10, // Start at 10am
      timeSpeed: 1,

      // Actions
      addBuilding: (type, position) => {
        const def = getBuildingDef(type);
        const state = get();

        if (state.gold < def.cost.gold || state.elixir < def.cost.elixir) {
          get().addToast('Not enough resources!', 'warning');
          return;
        }

        const newBuilding: Building = {
          id: generateId(),
          type,
          position,
          level: 1,
          isConstructing: true,
          constructionProgress: 0,
          constructionStartTime: Date.now(),
        };

        set((state) => ({
          buildings: [...state.buildings, newBuilding],
          gold: state.gold - def.cost.gold,
          elixir: state.elixir - def.cost.elixir,
          isPlacingBuilding: null,
        }));

        get().addToast(`Building ${def.label} started!`, 'success');
      },

      selectBuilding: (id) => set({ selectedBuildingId: id }),

      startPlacingBuilding: (type) => set({ isPlacingBuilding: type }),

      upgradeBuilding: (id) => {
        set((state) => ({
          buildings: state.buildings.map((b) =>
            b.id === id
              ? { ...b, level: b.level + 1, isConstructing: true, constructionProgress: 0 }
              : b
          ),
        }));
        get().addToast('Upgrade started!', 'success');
      },

      addTask: (buildingId, name, duration) => {
        const newTask: Task = {
          id: generateId(),
          name,
          buildingId,
          progress: 0,
          status: 'queued',
          startTime: Date.now(),
          estimatedDuration: duration,
        };

        set((state) => ({
          tasks: [...state.tasks, newTask],
        }));

        // Auto-assign an idle villager
        const state = get();
        const idleVillager = state.villagers.find((v) => v.state === 'idle' && !v.assignedTaskId);
        if (idleVillager) {
          get().assignVillagerToTask(idleVillager.id, newTask.id);
        }
      },

      updateTaskProgress: (taskId, progress) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? { ...t, progress: Math.min(100, progress), status: progress >= 100 ? 'completed' : 'running' }
              : t
          ),
        }));
      },

      completeTask: (taskId) => {
        const task = get().tasks.find((t) => t.id === taskId);
        if (!task) return;

        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== taskId),
          completedTasks: state.completedTasks + 1,
          gold: state.gold + 25,
          elixir: state.elixir + 10,
          villagers: state.villagers.map((v) =>
            v.assignedTaskId === taskId
              ? { ...v, assignedTaskId: undefined, state: 'celebrating' as const }
              : v
          ),
        }));

        get().addToast(`Task "${task.name}" completed! +25 gold +10 elixir`, 'success');

        // Reset celebrating villagers after delay
        setTimeout(() => {
          set((state) => ({
            villagers: state.villagers.map((v) =>
              v.state === 'celebrating' ? { ...v, state: 'idle' as const } : v
            ),
          }));
        }, 2000);
      },

      spawnVillager: (name, position) => {
        const newVillager: Villager = {
          id: generateId(),
          name: name || VILLAGER_NAMES[Math.floor(Math.random() * VILLAGER_NAMES.length)],
          position,
          state: 'idle',
        };

        set((state) => ({
          villagers: [...state.villagers, newVillager],
        }));
      },

      moveVillager: (id, target) => {
        set((state) => ({
          villagers: state.villagers.map((v) =>
            v.id === id ? { ...v, targetPosition: target, state: 'walking' as const } : v
          ),
        }));
      },

      assignVillagerToTask: (villagerId, taskId) => {
        const task = get().tasks.find((t) => t.id === taskId);
        const building = task ? get().buildings.find((b) => b.id === task.buildingId) : null;

        set((state) => ({
          villagers: state.villagers.map((v) =>
            v.id === villagerId
              ? {
                ...v,
                assignedTaskId: taskId,
                state: 'walking' as const,
                targetPosition: building?.position,
              }
              : v
          ),
          tasks: state.tasks.map((t) =>
            t.id === taskId ? { ...t, status: 'running' as const } : t
          ),
        }));
      },

      addToast: (message, type) => {
        const toast: Toast = {
          id: generateId(),
          message,
          type,
          timestamp: Date.now(),
        };

        set((state) => ({
          toasts: [...state.toasts, toast],
        }));

        // Auto-remove after 4 seconds
        setTimeout(() => {
          get().removeToast(toast.id);
        }, 4000);
      },

      removeToast: (id) => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      },

      tick: (delta) => {
        const state = get();

        // Update game time (1 real second = 1 game minute)
        const newTime = (state.gameTime + (delta / 60) * state.timeSpeed) % 24;

        // Update construction progress
        const updatedBuildings = state.buildings.map((b) => {
          if (b.isConstructing) {
            const newProgress = b.constructionProgress + delta * 10; // 10% per second
            if (newProgress >= 100) {
              return { ...b, isConstructing: false, constructionProgress: 100 };
            }
            return { ...b, constructionProgress: newProgress };
          }
          return b;
        });

        // Update task progress and collect completed task IDs
        const completedTaskIds: string[] = [];
        const updatedTasks = state.tasks.map((t) => {
          if (t.status === 'running') {
            const elapsed = Date.now() - t.startTime;
            const progress = Math.min(100, (elapsed / t.estimatedDuration) * 100);
            if (progress >= 100) {
              completedTaskIds.push(t.id);
              return { ...t, progress: 100, status: 'completed' as const };
            }
            return { ...t, progress };
          }
          return t;
        });

        // Passive resources from registry-defined production
        let passiveGold = 0;
        let passiveElixir = 0;
        state.buildings.forEach(b => {
          if (!b.isConstructing) {
            const def = getBuildingDef(b.type);
            if (def.production) {
              passiveGold += (def.production.gold || 0) * delta;
              passiveElixir += (def.production.elixir || 0) * delta;
            }
          }
        });

        // Calculate task completion rewards
        let taskRewardGold = 0;
        let taskRewardElixir = 0;
        const completedTaskNames: string[] = [];

        completedTaskIds.forEach(taskId => {
          const task = state.tasks.find(t => t.id === taskId);
          if (task) {
            taskRewardGold += 25;
            taskRewardElixir += 10;
            completedTaskNames.push(task.name);
          }
        });

        // Update villagers - free those who completed tasks
        const updatedVillagers = state.villagers.map(v => {
          if (v.assignedTaskId && completedTaskIds.includes(v.assignedTaskId)) {
            return { ...v, assignedTaskId: undefined, state: 'celebrating' as const };
          }
          return v;
        });

        set({
          gameTime: newTime,
          buildings: updatedBuildings,
          tasks: updatedTasks.filter(t => !completedTaskIds.includes(t.id)),
          villagers: updatedVillagers,
          completedTasks: state.completedTasks + completedTaskIds.length,
          gold: state.gold + passiveGold + taskRewardGold,
          elixir: state.elixir + passiveElixir + taskRewardElixir,
        });

        // Show toast for each completed task
        completedTaskNames.forEach(name => {
          get().addToast(`Task "${name}" completed! +25 gold +10 elixir`, 'success');
        });

        // Reset celebrating villagers after delay
        if (completedTaskIds.length > 0) {
          setTimeout(() => {
            set((state) => ({
              villagers: state.villagers.map((v) =>
                v.state === 'celebrating' ? { ...v, state: 'idle' as const } : v
              ),
            }));
          }, 2000);
        }
      },

      addResources: (gold, elixir) => {
        set((state) => ({
          gold: state.gold + gold,
          elixir: state.elixir + elixir,
        }));
      },
    }),
    {
      name: 'agent-village-storage',
      partialize: (state) => ({
        gold: state.gold,
        elixir: state.elixir,
        completedTasks: state.completedTasks,
        buildings: state.buildings,
        villagers: state.villagers,
        gameTime: state.gameTime,
      }),
    }
  )
);

