import { Html } from '@react-three/drei';
import { useEffect, useState } from 'react';

interface ThoughtBubbleProps {
    text: string;
    visible?: boolean;
}

export function ThoughtBubble({ text, visible = true }: ThoughtBubbleProps) {
    const [displayText, setDisplayText] = useState(text);
    const [isAnimating, setIsAnimating] = useState(false);

    // Simple effect to animate text updates
    useEffect(() => {
        if (text !== displayText) {
            setIsAnimating(true);
            const timer = setTimeout(() => {
                setDisplayText(text);
                setIsAnimating(false);
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [text, displayText]);

    if (!visible || !displayText) return null;

    return (
        <Html position={[0, 2.0, 0]} center distanceFactor={8} zIndexRange={[100, 0]} style={{ pointerEvents: 'none' }}>
            <div className={`thought-bubble ${isAnimating ? 'pop' : ''}`}>
                <div className="thought-content">
                    {displayText.length > 60 ? displayText.substring(0, 60) + '...' : displayText}
                </div>
                <div className="thought-dots">
                    <span className="dot dot-1" />
                    <span className="dot dot-2" />
                </div>
            </div>
        </Html>
    );
}
