export type BuildingType = 'townhall' | 'workshop' | 'watchtower' | 'collector' | 'barracks';

export interface Building {
    id: string;
    type: BuildingType;
    position: [number, number, number];
    level: number;
    isConstructing: boolean;
    constructionProgress: number;
    constructionStartTime?: number;
}

export interface Villager {
    id: string;
    name: string;
    assignedTaskId?: string;
    position: [number, number, number];
    targetPosition?: [number, number, number];
    state: 'idle' | 'walking' | 'working' | 'celebrating' | 'thinking';
    memoryId?: string;  // Reference to VillagerMemory in memoryStore
    currentThought?: string;  // What the villager is currently thinking/doing
}

export interface Task {
    id: string;
    name: string;
    buildingId: string;
    progress: number;
    status: 'queued' | 'running' | 'completed' | 'failed';
    startTime: number;
    estimatedDuration: number;
}

export interface Toast {
    id: string;
    message: string;
    type: 'success' | 'warning' | 'info';
    timestamp: number;
}

export interface GameState {
    // Resources
    gold: number;
    elixir: number;
    completedTasks: number;

    // Entities
    buildings: Building[];
    villagers: Villager[];
    tasks: Task[];

    // UI State
    selectedBuildingId: string | null;
    isPlacingBuilding: BuildingType | null;
    toasts: Toast[];

    // Time
    gameTime: number; // 0-24 hours
    timeSpeed: number;

    // Actions
    addBuilding: (type: BuildingType, position: [number, number, number]) => void;
    selectBuilding: (id: string | null) => void;
    startPlacingBuilding: (type: BuildingType | null) => void;
    upgradeBuilding: (id: string) => void;

    addTask: (buildingId: string, name: string, duration: number) => void;
    updateTaskProgress: (taskId: string, progress: number) => void;
    completeTask: (taskId: string) => void;

    spawnVillager: (name: string, position: [number, number, number]) => void;
    moveVillager: (id: string, target: [number, number, number]) => void;
    assignVillagerToTask: (villagerId: string, taskId: string, buildingId?: string) => void;

    addToast: (message: string, type: Toast['type']) => void;
    removeToast: (id: string) => void;

    tick: (delta: number) => void;
    addResources: (gold: number, elixir: number) => void;
}
