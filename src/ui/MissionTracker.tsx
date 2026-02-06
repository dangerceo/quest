import { useAgentServer } from '../hooks/useAgentServer';
import { useGameStore } from '../state/gameStore';

export function MissionTracker() {
    const { tasks } = useAgentServer();
    const villagers = useGameStore((s) => s.villagers);

    // Filter for active tasks (running or thinking)
    const activeTasks = Object.values(tasks).filter(
        (t) => t.state === 'running' || t.state === 'thinking' || t.state === 'queued'
    );

    if (activeTasks.length === 0) return null;

    return (
        <div className="mission-tracker">
            <div className="tracker-header">ACTIVE MISSIONS</div>
            {activeTasks.map((task) => {
                const assignedVillager = villagers.find((v) => v.assignedTaskId === task.id);

                return (
                    <div key={task.id} className={`tracker-item ${task.state}`}>
                        <div className="tracker-icon">
                            {task.state === 'thinking' ? '💭' : '⚡'}
                        </div>
                        <div className="tracker-content">
                            <div className="tracker-title">{task.title}</div>
                            <div className="tracker-meta">
                                {assignedVillager ? (
                                    <span className="tracker-agent">👤 {assignedVillager.name}</span>
                                ) : (
                                    <span className="tracker-agent unassigned">Unassigned</span>
                                )}
                                <span className="tracker-status">{task.state}</span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
