import { useState } from 'react';
import { useGameStore } from '../state/gameStore';
import { useTaskStore } from '../tasks/taskStore';
import { TASK_TEMPLATES } from '../tasks/TaskDefinition';
import type { AgentTask } from '../tasks/TaskDefinition';

// Welcome/Onboarding Component
export function WelcomePanel({ onDismiss }: { onDismiss: () => void }) {
    return (
        <div className="welcome-panel">
            <div className="welcome-header">
                <span className="welcome-icon">🏰</span>
                <h2>Welcome to Quest</h2>
            </div>
            <div className="welcome-content">
                <p>Build your agent village and manage AI coding tasks!</p>
                <div className="welcome-steps">
                    <div className="step">
                        <span className="step-num">1</span>
                        <span>Click buildings to select them</span>
                    </div>
                    <div className="step">
                        <span className="step-num">2</span>
                        <span>Use the build menu to place new structures</span>
                    </div>
                    <div className="step">
                        <span className="step-num">3</span>
                        <span>Create tasks for your villagers to work on</span>
                    </div>
                </div>
            </div>
            <button className="welcome-btn" onClick={onDismiss}>
                Get Started →
            </button>
        </div>
    );
}

// Main Task Panel - shows all active tasks
export function TaskPanel() {
    const tasks = useTaskStore((s) => s.tasks);
    const villagers = useGameStore((s) => s.villagers);
    const removeTask = useTaskStore((s) => s.removeTask);
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

    if (tasks.length === 0) {
        return (
            <div className="task-panel empty">
                <div className="empty-state">
                    <span className="empty-icon">📋</span>
                    <p>No active tasks</p>
                    <span className="empty-hint">Click a building to create one</span>
                </div>
            </div>
        );
    }

    return (
        <div className="task-panel">
            <div className="task-panel-header">
                <h3>🤖 Agent Tasks</h3>
                <span className="task-count">{tasks.length}</span>
            </div>
            <div className="task-panel-list">
                {tasks.map((task) => (
                    <TaskCard
                        key={task.id}
                        task={task}
                        villager={villagers.find(v => v.assignedTaskId === task.id)}
                        expanded={expandedTaskId === task.id}
                        onToggle={() => setExpandedTaskId(
                            expandedTaskId === task.id ? null : task.id
                        )}
                        onRemove={() => removeTask(task.id)}
                    />
                ))}
            </div>
        </div>
    );
}

// Individual Task Card
function TaskCard({
    task,
    villager,
    expanded,
    onToggle,
    onRemove
}: {
    task: AgentTask;
    villager?: { name: string };
    expanded: boolean;
    onToggle: () => void;
    onRemove: () => void;
}) {
    const template = TASK_TEMPLATES.find(t => t.type === task.type);

    const statusColors: Record<string, string> = {
        queued: '#666',
        running: 'var(--ui-accent)',
        completed: 'var(--ui-success)',
        failed: '#e74c3c',
        paused: '#9b59b6',
    };

    return (
        <div className={`task-card ${task.status}`}>
            <div className="task-card-main" onClick={onToggle}>
                <span className="task-type-icon">{template?.icon || '⚡'}</span>
                <div className="task-info">
                    <div className="task-title">{task.title}</div>
                    <div className="task-meta">
                        {villager && <span className="villager-badge">👤 {villager.name}</span>}
                        <span
                            className="status-badge"
                            style={{ color: statusColors[task.status] }}
                        >
                            {task.status}
                        </span>
                    </div>
                </div>
                {task.status === 'running' && (
                    <div className="task-progress-ring">
                        <svg viewBox="0 0 36 36">
                            <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="#333"
                                strokeWidth="3"
                            />
                            <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="var(--ui-accent)"
                                strokeWidth="3"
                                strokeDasharray={`${task.progress}, 100`}
                            />
                        </svg>
                        <span>{Math.round(task.progress)}%</span>
                    </div>
                )}
            </div>

            {expanded && (
                <div className="task-card-expanded">
                    <div className="task-prompt">
                        <label>Prompt</label>
                        <p>{task.prompt}</p>
                    </div>
                    {task.context.length > 0 && (
                        <div className="task-context">
                            <label>Context Files</label>
                            <ul>
                                {task.context.map((f, i) => (
                                    <li key={i}>{f}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <div className="task-logs">
                        <label>Logs ({task.logs.length})</label>
                        <div className="logs-scroll">
                            {task.logs.slice(-5).map((log) => (
                                <div key={log.id} className={`log-line ${log.type}`}>
                                    <span className="log-time">
                                        {new Date(log.timestamp).toLocaleTimeString()}
                                    </span>
                                    {log.message}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="task-actions">
                        <button className="action-btn danger" onClick={onRemove}>
                            🗑️ Remove
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
