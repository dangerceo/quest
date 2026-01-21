// Output parser - transforms raw terminal output into structured thoughts/actions

export type ThoughtType = 'pondering' | 'decision' | 'action' | 'mistake' | 'success' | 'info';

export interface ParsedThought {
    id: string;
    type: ThoughtType;
    content: string;
    timestamp: number;
    icon: string;
}

export interface ParsedStep {
    id: string;
    thoughts: ParsedThought[];
    status: 'pending' | 'running' | 'completed' | 'error';
}

// Parse raw terminal output into structured thoughts
export function parseTerminalOutput(rawOutput: string[]): ParsedThought[] {
    const thoughts: ParsedThought[] = [];
    let thoughtId = 0;

    for (const line of rawOutput) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const thought = parseLine(trimmed, thoughtId++);
        if (thought) {
            thoughts.push(thought);
        }
    }

    return thoughts;
}

function parseLine(line: string, id: number): ParsedThought | null {
    const timestamp = Date.now();
    const baseId = `thought-${id}`;

    // Detect thinking/pondering
    if (line.includes('Thinking') || line.includes('Analyzing') || line.includes('Looking') || line.includes('Searching')) {
        return {
            id: baseId,
            type: 'pondering',
            content: extractContent(line),
            timestamp,
            icon: '🤔',
        };
    }

    // Detect decisions
    if (line.includes('will ') || line.includes('should ') || line.includes('decide') || line.includes('Planning')) {
        return {
            id: baseId,
            type: 'decision',
            content: extractContent(line),
            timestamp,
            icon: '💡',
        };
    }

    // Detect actions (file operations, code changes)
    if (line.includes('Creating') || line.includes('Editing') || line.includes('Writing') ||
        line.includes('Modified') || line.includes('Added') || line.includes('Deleted') ||
        line.includes('Running') || line.includes('Executing')) {
        return {
            id: baseId,
            type: 'action',
            content: extractContent(line),
            timestamp,
            icon: '⚔️',
        };
    }

    // Detect errors/mistakes
    if ((line.includes('Error') || line.includes('error') || line.includes('failed') ||
        line.includes('Failed') || line.includes('mistake') || line.includes('bug')) &&
        !line.includes('Loading extension')) {
        return {
            id: baseId,
            type: 'mistake',
            content: extractContent(line),
            timestamp,
            icon: '❌',
        };
    }

    // Detect success
    if (line.includes('Success') || line.includes('success') || line.includes('✓') ||
        line.includes('completed') || line.includes('Done') || line.includes('Completed')) {
        return {
            id: baseId,
            type: 'success',
            content: extractContent(line),
            timestamp,
            icon: '✅',
        };
    }

    // Default to info
    return {
        id: baseId,
        type: 'info',
        content: line.substring(0, 100),
        timestamp,
        icon: '📋',
    };
}

function extractContent(line: string): string {
    // Remove common prefixes and clean up
    let content = line
        .replace(/^\[.*?\]/, '')  // Remove [timestamp] prefixes
        .replace(/^(INFO|DEBUG|ERROR|WARN):?\s*/i, '')
        .replace(/^>\s*/, '')
        .trim();

    // Truncate if too long
    if (content.length > 80) {
        content = content.substring(0, 77) + '...';
    }

    return content;
}

// Group thoughts into logical steps for flowchart
export function groupIntoSteps(thoughts: ParsedThought[]): ParsedStep[] {
    const steps: ParsedStep[] = [];
    let currentStep: ParsedStep | null = null;

    for (const thought of thoughts) {
        // Start new step on pondering
        if (thought.type === 'pondering' || !currentStep) {
            if (currentStep) {
                steps.push(currentStep);
            }
            currentStep = {
                id: `step-${steps.length}`,
                thoughts: [thought],
                status: 'running',
            };
        } else {
            currentStep.thoughts.push(thought);

            // Update step status
            if (thought.type === 'mistake') {
                currentStep.status = 'error';
            } else if (thought.type === 'success') {
                currentStep.status = 'completed';
            }
        }
    }

    if (currentStep) {
        steps.push(currentStep);
    }

    return steps;
}

// Get summary for a step
export function getStepSummary(step: ParsedStep): { pondering?: string; decision?: string; action?: string } {
    return {
        pondering: step.thoughts.find(t => t.type === 'pondering')?.content,
        decision: step.thoughts.find(t => t.type === 'decision')?.content,
        action: step.thoughts.find(t => t.type === 'action' || t.type === 'success' || t.type === 'mistake')?.content,
    };
}
