// Agent Task Store - manages active and queued tasks

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AgentTask, TaskStatus, TaskType, TaskLog } from '../tasks/TaskDefinition';
import { generateTaskId, createTaskLog } from '../tasks/TaskDefinition';

interface TaskStoreState {
    tasks: AgentTask[];
    activeTaskId: string | null;

    // Actions
    createTask: (params: {
        type: TaskType;
        title: string;
        prompt: string;
        buildingId: string;
        context?: string[];
        estimatedDuration?: number;
    }) => AgentTask;

    assignTask: (taskId: string, villagerId: string) => void;
    startTask: (taskId: string) => void;
    pauseTask: (taskId: string) => void;
    completeTask: (taskId: string, success: boolean, summary: string, filesModified?: string[]) => void;
    addTaskLog: (taskId: string, log: TaskLog) => void;
    updateTaskProgress: (taskId: string, progress: number) => void;
    removeTask: (taskId: string) => void;
    getTaskById: (taskId: string) => AgentTask | undefined;
    getTasksForBuilding: (buildingId: string) => AgentTask[];
}

export const useTaskStore = create<TaskStoreState>()(
    persist(
        (set, get) => ({
            tasks: [],
            activeTaskId: null,

            createTask: (params) => {
                const newTask: AgentTask = {
                    id: generateTaskId(),
                    type: params.type,
                    title: params.title,
                    prompt: params.prompt,
                    context: params.context || [],
                    buildingId: params.buildingId,
                    status: 'queued',
                    progress: 0,
                    estimatedDuration: params.estimatedDuration || 30000,
                    logs: [createTaskLog('info', `Task created: ${params.title}`)],
                };

                set((state) => ({
                    tasks: [...state.tasks, newTask],
                }));

                return newTask;
            },

            assignTask: (taskId, villagerId) => {
                set((state) => ({
                    tasks: state.tasks.map((t) =>
                        t.id === taskId
                            ? {
                                ...t,
                                assignedVillagerId: villagerId,
                                logs: [...t.logs, createTaskLog('info', `Assigned to villager: ${villagerId}`)],
                            }
                            : t
                    ),
                }));
            },

            startTask: (taskId) => {
                set((state) => ({
                    tasks: state.tasks.map((t) =>
                        t.id === taskId
                            ? {
                                ...t,
                                status: 'running' as TaskStatus,
                                startTime: Date.now(),
                                logs: [...t.logs, createTaskLog('action', 'Task started')],
                            }
                            : t
                    ),
                    activeTaskId: taskId,
                }));
            },

            pauseTask: (taskId) => {
                set((state) => ({
                    tasks: state.tasks.map((t) =>
                        t.id === taskId
                            ? {
                                ...t,
                                status: 'paused' as TaskStatus,
                                logs: [...t.logs, createTaskLog('info', 'Task paused')],
                            }
                            : t
                    ),
                    activeTaskId: state.activeTaskId === taskId ? null : state.activeTaskId,
                }));
            },

            completeTask: (taskId, success, summary, filesModified) => {
                set((state) => ({
                    tasks: state.tasks.map((t) =>
                        t.id === taskId
                            ? {
                                ...t,
                                status: (success ? 'completed' : 'failed') as TaskStatus,
                                progress: 100,
                                endTime: Date.now(),
                                result: { success, summary, filesModified },
                                logs: [
                                    ...t.logs,
                                    createTaskLog(
                                        success ? 'result' : 'error',
                                        success ? `Completed: ${summary}` : `Failed: ${summary}`
                                    ),
                                ],
                            }
                            : t
                    ),
                    activeTaskId: state.activeTaskId === taskId ? null : state.activeTaskId,
                }));
            },

            addTaskLog: (taskId, log) => {
                set((state) => ({
                    tasks: state.tasks.map((t) =>
                        t.id === taskId ? { ...t, logs: [...t.logs, log] } : t
                    ),
                }));
            },

            updateTaskProgress: (taskId, progress) => {
                set((state) => ({
                    tasks: state.tasks.map((t) =>
                        t.id === taskId ? { ...t, progress: Math.min(100, Math.max(0, progress)) } : t
                    ),
                }));
            },

            removeTask: (taskId) => {
                set((state) => ({
                    tasks: state.tasks.filter((t) => t.id !== taskId),
                    activeTaskId: state.activeTaskId === taskId ? null : state.activeTaskId,
                }));
            },

            getTaskById: (taskId) => {
                return get().tasks.find((t) => t.id === taskId);
            },

            getTasksForBuilding: (buildingId) => {
                return get().tasks.filter((t) => t.buildingId === buildingId);
            },
        }),
        {
            name: 'quest-tasks-storage',
            partialize: (state) => ({
                tasks: state.tasks.filter((t) => t.status !== 'completed'), // Only persist non-completed
            }),
        }
    )
);
