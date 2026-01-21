import { useState } from 'react';
import { useGameStore } from '../state/gameStore';
import { useTaskStore } from '../tasks/taskStore';
import { TASK_TEMPLATES } from '../tasks/TaskDefinition';
import { useAgentServer } from '../hooks/useAgentServer';
import type { TaskType } from '../tasks/TaskDefinition';

interface TaskEditorProps {
    buildingId: string;
    onClose: () => void;
}

export function TaskEditor({ buildingId, onClose }: TaskEditorProps) {
    const [selectedType, setSelectedType] = useState<TaskType>('code');
    const [title, setTitle] = useState('');
    const [prompt, setPrompt] = useState('');
    const [contextFiles, setContextFiles] = useState('');

    const createTask = useTaskStore((s) => s.createTask);
    const villagers = useGameStore((s) => s.villagers);
    const assignVillagerToTask = useGameStore((s) => s.assignVillagerToTask);
    const { createTask: createServerTask } = useAgentServer();

    const template = TASK_TEMPLATES.find((t) => t.type === selectedType);

    const handleSubmit = () => {
        if (!prompt.trim()) return;

        const task = createTask({
            type: selectedType,
            title: title || template?.title || 'New Task',
            prompt: prompt.trim(),
            buildingId,
            context: contextFiles.split('\n').filter((f) => f.trim()),
            estimatedDuration: template?.defaultDuration || 30000,
        });

        // Auto-assign an idle villager
        const idleVillager = villagers.find((v) => v.state === 'idle' && !v.assignedTaskId);
        if (idleVillager) {
            assignVillagerToTask(idleVillager.id, task.id);
        }

        // Trigger real Gemini task on server
        createServerTask({
            id: task.id,
            type: selectedType,
            title: task.title,
            prompt: task.prompt,
            context: task.context
        });

        onClose();
    };

    return (
        <div className="task-editor-overlay" onClick={onClose}>
            <div className="task-editor" onClick={(e) => e.stopPropagation()}>
                <div className="task-editor-header">
                    <h2>Create Agent Task</h2>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                <div className="task-type-selector">
                    {TASK_TEMPLATES.map((t) => (
                        <button
                            key={t.type}
                            className={`type-btn ${selectedType === t.type ? 'active' : ''}`}
                            onClick={() => setSelectedType(t.type)}
                            title={t.title}
                        >
                            <span className="type-icon">{t.icon}</span>
                            <span className="type-label">{t.title}</span>
                        </button>
                    ))}
                </div>

                <div className="task-form">
                    <label>
                        Title (optional)
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={template?.title || 'Task title...'}
                        />
                    </label>

                    <label>
                        Prompt / Instructions
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Describe what the agent should do..."
                            rows={4}
                        />
                    </label>

                    <label>
                        Context Files (one per line)
                        <textarea
                            value={contextFiles}
                            onChange={(e) => setContextFiles(e.target.value)}
                            placeholder="/path/to/file.ts&#10;/another/file.tsx"
                            rows={3}
                        />
                    </label>
                </div>

                <div className="task-editor-footer">
                    <button className="cancel-btn" onClick={onClose}>Cancel</button>
                    <button
                        className="submit-btn"
                        onClick={handleSubmit}
                        disabled={!prompt.trim()}
                    >
                        {template?.icon} Create Task
                    </button>
                </div>
            </div>
        </div>
    );
}

// Task Log Viewer component
export function TaskLogViewer({ taskId }: { taskId: string }) {
    const task = useTaskStore((s) => s.getTaskById(taskId));

    if (!task) return null;

    const getLogIcon = (type: string) => {
        switch (type) {
            case 'info': return 'ℹ️';
            case 'action': return '⚡';
            case 'result': return '✅';
            case 'error': return '❌';
            case 'thought': return '💭';
            default: return '•';
        }
    };

    return (
        <div className="task-log-viewer">
            <div className="log-header">
                <span className="log-title">{task.title}</span>
                <span className={`log-status ${task.status}`}>{task.status}</span>
            </div>
            <div className="log-entries">
                {task.logs.map((log) => (
                    <div key={log.id} className={`log-entry ${log.type}`}>
                        <span className="log-icon">{getLogIcon(log.type)}</span>
                        <span className="log-time">
                            {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="log-message">{log.message}</span>
                    </div>
                ))}
            </div>
            {task.status === 'running' && (
                <div className="log-progress">
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${task.progress}%` }}
                        />
                    </div>
                    <span>{Math.round(task.progress)}%</span>
                </div>
            )}
        </div>
    );
}
