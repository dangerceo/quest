import { useState } from 'react';
import { useGameStore } from '../state/gameStore';
import type { BuildingType } from '../state/types';
import { BUILDING_REGISTRY } from '../game/registry';
import { TaskEditor } from './TaskEditor';
import { MissionTracker } from './MissionTracker';

export function HUD() {
    const gold = useGameStore((s) => s.gold);
    const elixir = useGameStore((s) => s.elixir);
    const completedTasks = useGameStore((s) => s.completedTasks);
    const gameTime = useGameStore((s) => s.gameTime);

    const formatTime = (time: number) => {
        const hours = Math.floor(time);
        const minutes = Math.floor((time - hours) * 60);
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    };

    const getTimeIcon = (time: number) => {
        if (time >= 6 && time < 18) return '☀️';
        return '🌙';
    };

    return (
        <>
            {/* Resource Bar */}
            <div className="hud">
                <div className="resource-bar">
                    <div className="resource-item">
                        <span className="resource-icon gold">💰</span>
                        <span>{Math.floor(gold).toLocaleString()}</span>
                    </div>
                    <div className="resource-item">
                        <span className="resource-icon elixir">💎</span>
                        <span>{Math.floor(elixir).toLocaleString()}</span>
                    </div>
                    <div className="resource-item">
                        <span className="resource-icon tasks">✓</span>
                        <span>{completedTasks} tasks</span>
                    </div>
                </div>
            </div>

            {/* Time Indicator */}
            <div className="time-indicator">
                <span className="sun-icon">{getTimeIcon(gameTime)}</span>
                <span>{formatTime(gameTime)}</span>
            </div>

            {/* Mission Tracker */}
            <MissionTracker />
        </>
    );
}

export function BuildMenu() {
    const startPlacingBuilding = useGameStore((s) => s.startPlacingBuilding);
    const isPlacingBuilding = useGameStore((s) => s.isPlacingBuilding);
    const gold = useGameStore((s) => s.gold);
    const elixir = useGameStore((s) => s.elixir);

    const buildings = Object.values(BUILDING_REGISTRY).filter(b => b.type !== 'townhall');

    const handleClick = (type: BuildingType) => {
        if (isPlacingBuilding === type) {
            startPlacingBuilding(null);
        } else {
            startPlacingBuilding(type);
        }
    };

    return (
        <div className="build-menu">
            {buildings.map((b) => {
                const canAfford = gold >= b.cost.gold && elixir >= b.cost.elixir;
                return (
                    <button
                        key={b.type}
                        className="build-btn"
                        onClick={() => handleClick(b.type)}
                        style={{
                            opacity: canAfford ? 1 : 0.5,
                            borderColor: isPlacingBuilding === b.type ? '#ffd700' : 'transparent',
                        }}
                        title={`${b.label} (${b.cost.gold} gold, ${b.cost.elixir} elixir)`}
                    >
                        {b.icon}
                        <span>{b.label}</span>
                    </button>
                );
            })}
        </div>
    );
}

export function SelectionPanel() {
    const [showTaskEditor, setShowTaskEditor] = useState(false);
    const selectedBuildingId = useGameStore((s) => s.selectedBuildingId);
    const buildings = useGameStore((s) => s.buildings);
    const tasks = useGameStore((s) => s.tasks);
    const villagers = useGameStore((s) => s.villagers);
    const upgradeBuilding = useGameStore((s) => s.upgradeBuilding);
    const selectBuilding = useGameStore((s) => s.selectBuilding);

    if (!selectedBuildingId) return null;

    const building = buildings.find((b) => b.id === selectedBuildingId);
    if (!building) return null;

    const def = BUILDING_REGISTRY[building.type];
    const buildingTasks = tasks.filter((t) => t.buildingId === building.id);
    const assignedVillagers = villagers.filter((v) =>
        buildingTasks.some((t) => t.id === v.assignedTaskId)
    );

    return (
        <>
            {showTaskEditor && (
                <TaskEditor
                    buildingId={building.id}
                    onClose={() => setShowTaskEditor(false)}
                />
            )}
            <div className="selection-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h3>
                            {def.icon} {def.label}
                            <span className="status">
                                {building.isConstructing ? 'Building...' : 'Active'}
                            </span>
                        </h3>
                        <div style={{ fontSize: '12px', color: 'var(--ui-text)', opacity: 0.7, marginTop: '4px' }}>
                            Level {building.level}
                        </div>
                    </div>
                    <button
                        onClick={() => selectBuilding(null)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--ui-text)',
                            cursor: 'pointer',
                            fontSize: '18px',
                            opacity: 0.7,
                        }}
                    >
                        ✕
                    </button>
                </div>

                {building.isConstructing && (
                    <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--ui-text)', marginBottom: '4px' }}>
                            Construction Progress
                        </div>
                        <div className="task-item">
                            <div className="progress" style={{ flex: 1 }}>
                                <div
                                    className="progress-fill"
                                    style={{ width: `${building.constructionProgress}%` }}
                                />
                            </div>
                            <span style={{ fontSize: '11px', marginLeft: '8px' }}>
                                {Math.floor(building.constructionProgress)}%
                            </span>
                        </div>
                    </div>
                )}

                {!building.isConstructing && building.type !== 'collector' && (
                    <div style={{ marginTop: '12px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={() => setShowTaskEditor(true)}
                                style={{
                                    flex: 1,
                                    padding: '8px',
                                    background: 'linear-gradient(135deg, hsl(140, 70%, 45%), hsl(160, 60%, 40%))',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                }}
                            >
                                + Add Task
                            </button>
                            <button
                                onClick={() => upgradeBuilding(building.id)}
                                style={{
                                    padding: '8px 12px',
                                    background: 'linear-gradient(135deg, hsl(45, 100%, 50%), hsl(35, 100%, 45%))',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                }}
                            >
                                ⬆️
                            </button>
                        </div>
                    </div>
                )}

                {buildingTasks.length > 0 && (
                    <div className="task-list" style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--ui-text)', opacity: 0.7, marginBottom: '8px' }}>
                            Active Tasks ({buildingTasks.length})
                        </div>
                        {buildingTasks.map((task) => {
                            const villager = assignedVillagers.find((v) => v.assignedTaskId === task.id);
                            return (
                                <div key={task.id} className="task-item">
                                    {villager && <span className="villager-icon">👤</span>}
                                    <span style={{ flex: 1, fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {task.name}
                                    </span>
                                    <div className="progress" style={{ width: '60px' }}>
                                        <div
                                            className="progress-fill"
                                            style={{ width: `${task.progress}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {building.type === 'collector' && !building.isConstructing && def.production && (
                    <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--ui-text)', opacity: 0.8 }}>
                        💰 Generating {def.production.gold} gold/sec
                    </div>
                )}
            </div>
        </>
    );
}

export function ToastContainer() {
    const toasts = useGameStore((s) => s.toasts);

    return (
        <div className="toast-container">
            {toasts.map((toast) => (
                <div key={toast.id} className={`toast ${toast.type}`}>
                    {toast.type === 'success' && '✅'}
                    {toast.type === 'warning' && '⚠️'}
                    {toast.type === 'info' && 'ℹ️'}
                    <span>{toast.message}</span>
                </div>
            ))}
        </div>
    );
}
