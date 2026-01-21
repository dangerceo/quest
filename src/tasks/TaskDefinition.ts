// Task types for Quest agent system

export type TaskType = 'code' | 'review' | 'debug' | 'research' | 'refactor' | 'custom';
export type TaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'paused';

export interface TaskLog {
    id: string;
    timestamp: number;
    type: 'info' | 'action' | 'result' | 'error' | 'thought';
    message: string;
    data?: unknown;
}

export interface TaskResult {
    success: boolean;
    summary: string;
    filesModified?: string[];
    error?: string;
}

export interface AgentTask {
    id: string;
    type: TaskType;
    title: string;
    prompt: string;
    context: string[];        // File paths or context references
    expectedOutput?: string;  // Description of success criteria

    // Execution state
    status: TaskStatus;
    progress: number;         // 0-100
    startTime?: number;
    endTime?: number;
    estimatedDuration: number;

    // Logs and results
    logs: TaskLog[];
    result?: TaskResult;

    // Assignment
    buildingId: string;
    assignedVillagerId?: string;
}

// Predefined task templates for common operations
export interface TaskTemplate {
    type: TaskType;
    title: string;
    promptTemplate: string;
    icon: string;
    defaultDuration: number;
    requiredContext: ('files' | 'prompt' | 'target')[];
}

export const TASK_TEMPLATES: TaskTemplate[] = [
    {
        type: 'code',
        title: 'Write Code',
        promptTemplate: 'Implement the following: {prompt}',
        icon: '💻',
        defaultDuration: 30000,
        requiredContext: ['prompt'],
    },
    {
        type: 'debug',
        title: 'Debug Issue',
        promptTemplate: 'Debug and fix: {prompt}. Context files: {files}',
        icon: '🐛',
        defaultDuration: 45000,
        requiredContext: ['prompt', 'files'],
    },
    {
        type: 'review',
        title: 'Code Review',
        promptTemplate: 'Review the following files for issues: {files}',
        icon: '👁️',
        defaultDuration: 20000,
        requiredContext: ['files'],
    },
    {
        type: 'refactor',
        title: 'Refactor',
        promptTemplate: 'Refactor {target}: {prompt}',
        icon: '🔧',
        defaultDuration: 40000,
        requiredContext: ['target', 'prompt'],
    },
    {
        type: 'research',
        title: 'Research',
        promptTemplate: 'Research and summarize: {prompt}',
        icon: '🔍',
        defaultDuration: 25000,
        requiredContext: ['prompt'],
    },
    {
        type: 'custom',
        title: 'Custom Task',
        promptTemplate: '{prompt}',
        icon: '⚡',
        defaultDuration: 30000,
        requiredContext: ['prompt'],
    },
];

// Helper to generate a unique ID
export const generateTaskId = () => `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Helper to create a new log entry
export const createTaskLog = (
    type: TaskLog['type'],
    message: string,
    data?: unknown
): TaskLog => ({
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    timestamp: Date.now(),
    type,
    message,
    data,
});
