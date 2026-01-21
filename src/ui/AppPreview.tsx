import { useState } from 'react';
import { getPreviewUrl } from '../hooks/useAgentServer';
import type { ServerTask } from '../hooks/useAgentServer';

interface AppPreviewProps {
    task: ServerTask;
    onClose: () => void;
}

export function AppPreview({ task, onClose }: AppPreviewProps) {
    const [isLoaded, setIsLoaded] = useState(false);

    if (!task.preview) return null;

    return (
        <div className="app-preview-overlay" onClick={onClose}>
            <div className="app-preview" onClick={(e) => e.stopPropagation()}>
                <div className="preview-header">
                    <span className="preview-title">📱 {task.title}</span>
                    <div className="preview-actions">
                        <a
                            href={getPreviewUrl(task.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="preview-btn"
                        >
                            Open ↗
                        </a>
                        <button className="preview-close" onClick={onClose}>✕</button>
                    </div>
                </div>
                <div className="preview-frame-container">
                    {!isLoaded && (
                        <div className="preview-loading">
                            <div className="loading-spinner" />
                            <span>Loading preview...</span>
                        </div>
                    )}
                    <iframe
                        src={getPreviewUrl(task.id)}
                        title={task.title}
                        className="preview-frame"
                        onLoad={() => setIsLoaded(true)}
                        sandbox="allow-scripts allow-same-origin"
                    />
                </div>
            </div>
        </div>
    );
}

// Mini preview thumbnail for task cards
export function PreviewThumbnail({ taskId, onClick }: { taskId: string; onClick: () => void }) {
    return (
        <button className="preview-thumbnail" onClick={onClick} title="View Preview">
            <iframe
                src={getPreviewUrl(taskId)}
                title="Preview"
                className="thumbnail-frame"
                sandbox="allow-scripts"
            />
            <div className="thumbnail-overlay">
                <span>👁️ Preview</span>
            </div>
        </button>
    );
}
