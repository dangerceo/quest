// React hook for connecting to Quest Agent Server via WebSocket

import { useState, useEffect, useCallback, useRef } from 'react';

const SERVER_URL = 'ws://localhost:3001';
const API_URL = 'http://localhost:3001';

export interface TaskOutput {
    type: 'stdout' | 'stderr' | 'system' | 'message' | 'tool_use' | 'tool_result' | 'tool_error' | 'result';
    text?: string;
    role?: 'user' | 'assistant';
    tool?: string;
    toolId?: string;
    params?: Record<string, unknown>;
    status?: string;
    stats?: { total_tokens?: number; tool_calls?: number };
    time?: number;
}

export interface ServerTask {
    id: string;
    type: string;
    title: string;
    prompt: string;
    context: string[];
    state: 'queued' | 'running' | 'thinking' | 'completed' | 'failed' | 'crashed';
    output: TaskOutput[];
    error: string | null;
    startTime: number | null;
    endTime: number | null;
    preview: string | null;
}

export interface AgentServerState {
    connected: boolean;
    tasks: Record<string, ServerTask>;
}

export function useAgentServer() {
    const [state, setState] = useState<AgentServerState>({
        connected: false,
        tasks: {},
    });

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<number | null>(null);

    // Connect to WebSocket
    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        try {
            const ws = new WebSocket(SERVER_URL);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('Connected to Quest Agent Server');
                setState(s => ({ ...s, connected: true }));
            };

            ws.onclose = () => {
                console.log('Disconnected from Quest Agent Server');
                setState(s => ({ ...s, connected: false }));

                // Attempt reconnect after 3 seconds
                reconnectTimeoutRef.current = window.setTimeout(() => {
                    connect();
                }, 3000);
            };

            ws.onerror = (err) => {
                console.error('WebSocket error:', err);
            };

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    handleMessage(message);
                } catch (e) {
                    console.error('Failed to parse message:', e);
                }
            };
        } catch (e) {
            console.error('Failed to connect:', e);
        }
    }, []);

    // Handle incoming WebSocket messages
    const handleMessage = (message: any) => {
        switch (message.type) {
            case 'init':
                setState(s => ({ ...s, tasks: message.tasks || {} }));
                break;

            case 'task_created':
            case 'task_started':
            case 'task_completed':
            case 'task_failed':
            case 'task_crashed':
            case 'task_thinking':
                if (message.task) {
                    setState(s => ({
                        ...s,
                        tasks: { ...s.tasks, [message.task.id]: message.task },
                    }));
                } else if (message.taskId) {
                    // Fetch updated task
                    fetchTask(message.taskId);
                }
                break;

            case 'task_output':
                setState(s => {
                    const task = s.tasks[message.taskId];
                    if (!task) return s;
                    return {
                        ...s,
                        tasks: {
                            ...s.tasks,
                            [message.taskId]: {
                                ...task,
                                output: [...task.output, message.output],
                            },
                        },
                    };
                });
                break;

            case 'task_cancelled':
                fetchTask(message.taskId);
                break;

            case 'task_preview_ready':
                setState(s => {
                    const task = s.tasks[message.taskId];
                    if (!task) return s;
                    return {
                        ...s,
                        tasks: {
                            ...s.tasks,
                            [message.taskId]: {
                                ...task,
                                preview: message.preview,
                            },
                        },
                    };
                });
                break;
        }
    };

    // Fetch single task from API
    const fetchTask = async (taskId: string) => {
        try {
            const res = await fetch(`${API_URL}/api/tasks/${taskId}`);
            if (res.ok) {
                const task = await res.json();
                setState(s => ({
                    ...s,
                    tasks: { ...s.tasks, [taskId]: task },
                }));
            }
        } catch (e) {
            console.error('Failed to fetch task:', e);
        }
    };

    // Create a new task
    const createTask = async (params: {
        id: string;
        type: string;
        title: string;
        prompt: string;
        context?: string[];
    }) => {
        try {
            const res = await fetch(`${API_URL}/api/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params),
            });
            if (res.ok) {
                const task = await res.json();
                setState(s => ({
                    ...s,
                    tasks: { ...s.tasks, [task.id]: task },
                }));
                return task;
            }
        } catch (e) {
            console.error('Failed to create task:', e);
        }
        return null;
    };

    // Cancel a task
    const cancelTask = async (taskId: string) => {
        try {
            await fetch(`${API_URL}/api/tasks/${taskId}`, { method: 'DELETE' });
        } catch (e) {
            console.error('Failed to cancel task:', e);
        }
    };

    // Retry a task
    const retryTask = async (taskId: string) => {
        try {
            await fetch(`${API_URL}/api/tasks/${taskId}/retry`, { method: 'POST' });
        } catch (e) {
            console.error('Failed to retry task:', e);
        }
    };

    // Connect on mount
    useEffect(() => {
        connect();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            wsRef.current?.close();
        };
    }, [connect]);

    return {
        ...state,
        createTask,
        cancelTask,
        retryTask,
        reconnect: connect,
    };
}

// Get preview URL for a task
export function getPreviewUrl(taskId: string) {
    return `${API_URL}/preview/${taskId}`;
}
