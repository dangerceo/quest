import { useState, useEffect } from 'react';
import { useGameStore } from '../state/gameStore';
import { useAgentServer } from '../hooks/useAgentServer';
import type { ServerTask, TaskOutput } from '../hooks/useAgentServer';
import { AppPreview, PreviewThumbnail } from './AppPreview';

// Main Agent Dashboard - replaces TaskPanel
export function AgentDashboard() {
    const { connected, tasks, retryTask, cancelTask } = useAgentServer();
    const villagers = useGameStore((s) => s.villagers);
    const gold = useGameStore((s) => s.gold);
    const elixir = useGameStore((s) => s.elixir);
    const [activeTab, setActiveTab] = useState<'roster' | 'missions' | 'logs'>('roster');
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [previewTaskId, setPreviewTaskId] = useState<string | null>(null);

    const taskList = Object.values(tasks);
    const previewTask = previewTaskId ? tasks[previewTaskId] : null;

    // Auto-select running task when switching to logs tab
    useEffect(() => {
        if (activeTab === 'logs' && !selectedTaskId) {
            const runningTask = taskList.find(t => t.state === 'running' || t.state === 'thinking');
            if (runningTask) {
                setSelectedTaskId(runningTask.id);
            } else if (taskList.length > 0) {
                setSelectedTaskId(taskList[0].id);
            }
        }
    }, [activeTab, taskList, selectedTaskId]);

    const selectedTask = selectedTaskId ? tasks[selectedTaskId] : null;

    return (
        <div className="agent-dashboard">
            {/* Header */}
            <div className="dashboard-header">
                <div className="header-left">
                    <span className="dashboard-title">🏰 COMMAND</span>
                    <div className={`connection-indicator ${connected ? 'connected' : ''}`}>
                        <span className="dot" />
                    </div>
                </div>
                <div className="dashboard-resources">
                    <div className="res-item gold">🪙 {Math.floor(gold)}</div>
                    <div className="res-item elixir">🧪 {Math.floor(elixir)}</div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="dashboard-tabs">
                <button
                    className={`tab ${activeTab === 'roster' ? 'active' : ''}`}
                    onClick={() => setActiveTab('roster')}
                >
                    👥 Agents
                </button>
                <button
                    className={`tab ${activeTab === 'missions' ? 'active' : ''}`}
                    onClick={() => setActiveTab('missions')}
                >
                    📜 Missions
                </button>
                <button
                    className={`tab ${activeTab === 'logs' ? 'active' : ''}`}
                    onClick={() => setActiveTab('logs')}
                >
                    📋 Logs
                </button>
            </div>

            {/* Content */}
            <div className="dashboard-content">
                {activeTab === 'roster' && (
                    <AgentRoster villagers={villagers} tasks={tasks} />
                )}
                {activeTab === 'missions' && (
                    <MissionPanel
                        tasks={taskList}
                        onSelectTask={setSelectedTaskId}
                        onPreviewTask={setPreviewTaskId}
                    />
                )}
                {activeTab === 'logs' && selectedTask && (
                    <ThoughtLog
                        task={selectedTask}
                        onBack={() => setSelectedTaskId(null)}
                        onRetry={() => retryTask(selectedTask.id)}
                        onCancel={() => cancelTask(selectedTask.id)}
                    />
                )}
                {activeTab === 'logs' && !selectedTask && (
                    <div className="empty-logs">
                        <span>📋</span>
                        <p>{connected ? (taskList.length === 0 ? 'No tasks yet - create one by clicking a building' : 'Select a mission to view logs') : 'Connecting to server...'}</p>
                    </div>
                )}
            </div>

            {/* App Preview Modal */}
            {previewTask && (
                <AppPreview
                    task={previewTask}
                    onClose={() => setPreviewTaskId(null)}
                />
            )}
        </div>
    );
}

// Agent Roster Panel - shows all villagers and their status
function AgentRoster({ villagers, tasks }: {
    villagers: any[];
    tasks: Record<string, ServerTask>;
}) {
    const getAgentStatus = (villagerId: string) => {
        const assignedTask = Object.values(tasks).find(
            t => t.id === villagerId || t.state === 'running'
        );
        if (assignedTask?.state === 'running') return 'on-mission';
        if (assignedTask?.state === 'thinking') return 'thinking';
        return 'idle';
    };

    const statusColors: Record<string, string> = {
        'idle': '#666',
        'on-mission': 'var(--ui-accent)',
        'thinking': '#9b59b6',
    };

    const statusLabels: Record<string, string> = {
        'idle': 'Idle',
        'on-mission': 'On Mission',
        'thinking': 'Thinking...',
    };

    return (
        <div className="agent-roster">
            {villagers.map((villager) => {
                const status = getAgentStatus(villager.id);
                return (
                    <div key={villager.id} className={`agent-card ${status}`}>
                        <div className="agent-avatar">
                            👤
                            {status === 'thinking' && <span className="thinking-indicator">💭</span>}
                        </div>
                        <div className="agent-info">
                            <div className="agent-name">{villager.name}</div>
                            <div className="agent-status" style={{ color: statusColors[status] }}>
                                {statusLabels[status]}
                            </div>
                        </div>
                        <div className="agent-health">
                            <div className="health-bar">
                                <div className="health-fill" style={{ width: '85%' }} />
                            </div>
                        </div>
                    </div>
                );
            })}

            {villagers.length === 0 && (
                <div className="empty-roster">
                    <p>No agents recruited yet</p>
                </div>
            )}
        </div>
    );
}

// Mission Panel - shows active and completed missions
function MissionPanel({ tasks, onSelectTask, onPreviewTask }: {
    tasks: ServerTask[];
    onSelectTask: (id: string) => void;
    onPreviewTask: (id: string) => void;
}) {
    const activeTasks = tasks.filter(t => t.state === 'running' || t.state === 'thinking' || t.state === 'queued');
    const completedTasks = tasks.filter(t => t.state === 'completed' || t.state === 'failed');

    return (
        <div className="mission-panel">
            {activeTasks.length > 0 && (
                <div className="mission-section">
                    <h4>⚔️ ACTIVE MISSIONS</h4>
                    {activeTasks.map((task) => (
                        <MissionCard
                            key={task.id}
                            task={task}
                            onClick={() => onSelectTask(task.id)}
                            onPreview={() => onPreviewTask(task.id)}
                        />
                    ))}
                </div>
            )}

            {completedTasks.length > 0 && (
                <div className="mission-section">
                    <h4>📜 COMPLETED</h4>
                    {completedTasks.map((task) => (
                        <MissionCard
                            key={task.id}
                            task={task}
                            onClick={() => onSelectTask(task.id)}
                            onPreview={() => onPreviewTask(task.id)}
                        />
                    ))}
                </div>
            )}

            {tasks.length === 0 && (
                <div className="empty-missions">
                    <span>📜</span>
                    <p>No missions assigned</p>
                    <p className="hint">Click a building to create one</p>
                </div>
            )}
        </div>
    );
}

// Individual Mission Card
function MissionCard({ task, onClick, onPreview }: {
    task: ServerTask;
    onClick: () => void;
    onPreview: () => void;
}) {
    const progressPercent = task.state === 'completed' ? 100 :
        task.state === 'running' ? 50 : 0;

    const stateIcons: Record<string, string> = {
        queued: '⏳',
        running: '⚔️',
        thinking: '💭',
        completed: '✅',
        failed: '❌',
        crashed: '💥',
    };

    return (
        <div className={`mission-card ${task.state}`} onClick={onClick}>
            <div className="mission-icon">{stateIcons[task.state]}</div>
            <div className="mission-info">
                <div className="mission-title">{task.title}</div>
                <div className="mission-type">{task.type.toUpperCase()}</div>
            </div>
            <div className="mission-progress">
                <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
                </div>
            </div>

            {task.preview && (
                <div className="mission-preview-link" onClick={(e) => {
                    e.stopPropagation();
                    onPreview();
                }}>
                    <PreviewThumbnail taskId={task.id} onClick={onPreview} />
                </div>
            )}
        </div>
    );
}

// Thought Log - visual display of structured agent events
function ThoughtLog({ task, onBack, onRetry, onCancel }: {
    task: ServerTask;
    onBack: () => void;
    onRetry: () => void;
    onCancel: () => void;
}) {
    const [showRawLogs, setShowRawLogs] = useState(false);

    const isFailed = task.state === 'failed' || task.state === 'crashed';
    const isRunning = task.state === 'running' || task.state === 'thinking';

    // Filter to important events (tool calls and results)
    const importantEvents = task.output.filter(o =>
        o.type === 'tool_use' || o.type === 'tool_result' || o.type === 'tool_error' || o.type === 'message'
    );

    // Get icon for event type
    const getEventIcon = (output: TaskOutput) => {
        switch (output.type) {
            case 'tool_use': return '🔧';
            case 'tool_result': return '✅';
            case 'tool_error': return '❌';
            case 'message': return output.role === 'assistant' ? '💭' : '👤';
            default: return '📋';
        }
    };

    // Get label for event type
    const getEventLabel = (output: TaskOutput) => {
        switch (output.type) {
            case 'tool_use': return output.tool?.toUpperCase() || 'TOOL';
            case 'tool_result': return 'SUCCESS';
            case 'tool_error': return 'ERROR';
            case 'message': return output.role === 'assistant' ? 'THINKING' : 'INPUT';
            default: return 'INFO';
        }
    };

    // Get display text for event
    const getEventText = (output: TaskOutput) => {
        if (output.type === 'tool_use' && output.params) {
            // Show key params for common tools
            const p = output.params as Record<string, unknown>;
            if (p.file_path) return String(p.file_path);
            if (p.command) return String(p.command);
            if (p.query) return String(p.query).substring(0, 60);
            return JSON.stringify(p).substring(0, 80);
        }
        return output.text?.substring(0, 150) || '';
    };

    return (
        <div className="thought-log">
            <div className="thought-log-header">
                <button className="back-btn" onClick={onBack}>← Back</button>
                <div className="log-title-container">
                    <span className="log-title">🧠 {task.title}</span>
                    <span className={`status-tag ${task.state}`}>{task.state}</span>
                </div>
            </div>

            {/* Structured Event Flow */}
            <div className="thought-flowchart">
                {importantEvents.map((output, i) => (
                    <div key={i} className={`thought-step ${output.type === 'tool_error' ? 'error' : 'completed'}`}>
                        <div className={`thought-node ${output.type}`}>
                            <span className="node-icon">{getEventIcon(output)}</span>
                            <div className="node-content">
                                <div className="node-label">{getEventLabel(output)}</div>
                                <div className="node-text">{getEventText(output)}</div>
                            </div>
                        </div>
                        {i < importantEvents.length - 1 && <div className="step-divider">↓</div>}
                    </div>
                ))}

                {importantEvents.length === 0 && (
                    <div className="no-thoughts">
                        <span className="thinking-pulse">💭</span>
                        <p>{isRunning ? 'Agent is thinking...' : 'No activity yet'}</p>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="thought-controls">
                {isFailed && (
                    <button className="control-btn resume" onClick={onRetry}>
                        🔄 Retry
                    </button>
                )}
                {isRunning && (
                    <button className="control-btn stop" onClick={onCancel}>
                        🛑 Stop
                    </button>
                )}
                <button
                    className="control-btn secondary"
                    onClick={() => setShowRawLogs(!showRawLogs)}
                >
                    {showRawLogs ? '👁️ Hide Raw' : '📋 Raw Logs'}
                </button>
            </div>

            {/* Raw Logs (hidden by default) */}
            {showRawLogs && (
                <div className="raw-logs">
                    <div className="raw-logs-header">DEBUG CONSOLE</div>
                    <div className="raw-logs-content">
                        {task.output.map((o, i) => (
                            <div key={i} className={`raw-line ${o.type}`}>
                                <span className="raw-type">[{o.type}]</span> {o.text || (o.tool ? `${o.tool}(...)` : JSON.stringify(o))}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
