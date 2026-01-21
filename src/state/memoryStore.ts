// Villager Memory System for Quest

export interface MemoryEntry {
    id: string;
    timestamp: number;
    type: 'task_completed' | 'task_failed' | 'skill_learned' | 'interaction' | 'observation';
    summary: string;
    importance: number;  // 1-10, affects retention
    data?: unknown;
}

export interface Skill {
    name: string;
    level: number;       // 1-10
    experience: number;  // Total XP
    lastUsed: number;    // Timestamp
}

export interface VillagerMemory {
    villagerId: string;

    // Short-term (current session, recent context)
    shortTerm: {
        currentTaskId?: string;
        recentActions: string[];      // Last 10 actions
        currentContext: string[];     // Active file/topic context
        mood: 'focused' | 'idle' | 'frustrated' | 'excited';
    };

    // Long-term (persisted)
    longTerm: {
        skills: Skill[];
        memories: MemoryEntry[];
        tasksCompleted: number;
        tasksFailed: number;
        favoriteTaskTypes: string[];  // Most successful types
        personalityTraits: string[];  // e.g., 'thorough', 'fast', 'creative'
    };
}

// Default memory for a new villager
export const createDefaultMemory = (villagerId: string): VillagerMemory => ({
    villagerId,
    shortTerm: {
        recentActions: [],
        currentContext: [],
        mood: 'idle',
    },
    longTerm: {
        skills: [
            { name: 'coding', level: 1, experience: 0, lastUsed: Date.now() },
            { name: 'debugging', level: 1, experience: 0, lastUsed: Date.now() },
            { name: 'research', level: 1, experience: 0, lastUsed: Date.now() },
        ],
        memories: [],
        tasksCompleted: 0,
        tasksFailed: 0,
        favoriteTaskTypes: [],
        personalityTraits: [],
    },
});

// Add a memory entry
export const addMemory = (
    memory: VillagerMemory,
    entry: Omit<MemoryEntry, 'id' | 'timestamp'>
): VillagerMemory => {
    const newEntry: MemoryEntry = {
        ...entry,
        id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        timestamp: Date.now(),
    };

    // Keep only the most important memories (max 100)
    const allMemories = [...memory.longTerm.memories, newEntry];
    const sortedMemories = allMemories
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 100);

    return {
        ...memory,
        longTerm: {
            ...memory.longTerm,
            memories: sortedMemories,
        },
    };
};

// Update a skill based on task completion
export const updateSkill = (
    memory: VillagerMemory,
    skillName: string,
    xpGain: number,
    success: boolean
): VillagerMemory => {
    const skills = memory.longTerm.skills.map(skill => {
        if (skill.name === skillName) {
            const newXp = skill.experience + xpGain;
            const newLevel = Math.min(10, Math.floor(newXp / 100) + 1);
            return {
                ...skill,
                experience: newXp,
                level: newLevel,
                lastUsed: Date.now(),
            };
        }
        return skill;
    });

    return {
        ...memory,
        longTerm: {
            ...memory.longTerm,
            skills,
            tasksCompleted: success
                ? memory.longTerm.tasksCompleted + 1
                : memory.longTerm.tasksCompleted,
            tasksFailed: !success
                ? memory.longTerm.tasksFailed + 1
                : memory.longTerm.tasksFailed,
        },
    };
};

// Add recent action to short-term memory
export const addRecentAction = (
    memory: VillagerMemory,
    action: string
): VillagerMemory => ({
    ...memory,
    shortTerm: {
        ...memory.shortTerm,
        recentActions: [action, ...memory.shortTerm.recentActions].slice(0, 10),
    },
});
