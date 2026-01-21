#!/usr/bin/env node
/**
 * Quest Agent Server
 * 
 * Express + WebSocket server for running Gemini CLI tasks
 * with real-time output streaming and state management.
 */

const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const { spawn } = require('child_process');
const path = require('path');
const cors = require('cors');

const PORT = process.env.PORT || 3001;
const QUEST_ROOT = path.resolve(__dirname, '..');

// Store active tasks
const activeTasks = new Map();

// Task state enum
const TaskState = {
    QUEUED: 'queued',
    RUNNING: 'running',
    THINKING: 'thinking',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CRASHED: 'crashed',
};

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP server and WebSocket
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Broadcast to all connected clients
function broadcast(message) {
    const data = JSON.stringify(message);
    wss.clients.forEach((client) => {
        if (client.readyState === 1) { // OPEN
            client.send(data);
        }
    });
}

// WebSocket connection handler
wss.on('connection', (ws) => {
    console.log('Client connected');

    // Send current task states
    ws.send(JSON.stringify({
        type: 'init',
        tasks: Object.fromEntries(activeTasks),
    }));

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

// API: Get all tasks
app.get('/api/tasks', (req, res) => {
    res.json(Object.fromEntries(activeTasks));
});

// API: Get single task
app.get('/api/tasks/:id', (req, res) => {
    const task = activeTasks.get(req.params.id);
    if (!task) {
        return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
});

// API: Create and run a task
app.post('/api/tasks', (req, res) => {
    const { id, type, title, prompt, context } = req.body;

    if (!id || !prompt) {
        return res.status(400).json({ error: 'id and prompt required' });
    }

    const task = {
        id,
        type: type || 'custom',
        title: title || 'Agent Task',
        prompt,
        context: context || [],
        state: TaskState.QUEUED,
        output: [],
        error: null,
        startTime: null,
        endTime: null,
        preview: null, // For HTML app previews
    };

    activeTasks.set(id, task);
    broadcast({ type: 'task_created', task });

    // Start the task
    runGeminiTask(task);

    res.json(task);
});

// API: Cancel a task
app.delete('/api/tasks/:id', (req, res) => {
    const task = activeTasks.get(req.params.id);
    if (!task) {
        return res.status(404).json({ error: 'Task not found' });
    }

    if (task.process) {
        task.process.kill('SIGTERM');
    }

    task.state = TaskState.FAILED;
    task.error = 'Cancelled by user';
    task.endTime = Date.now();

    broadcast({ type: 'task_cancelled', taskId: req.params.id });
    res.json({ success: true });
});

// API: Retry a task
app.post('/api/tasks/:id/retry', (req, res) => {
    const task = activeTasks.get(req.params.id);
    if (!task) {
        return res.status(404).json({ error: 'Task not found' });
    }

    // Clean up old state
    task.state = TaskState.QUEUED;
    task.output = [];
    task.error = null;
    task.startTime = null;
    task.endTime = null;

    broadcast({ type: 'task_updated', task });

    // Start again
    runGeminiTask(task);

    res.json(task);
});

// Handle a structured Gemini JSON event
function handleGeminiEvent(task, event) {
    const time = Date.now();

    switch (event.type) {
        case 'init':
            console.log(`📡 Session: ${event.session_id}, Model: ${event.model}`);
            task.output.push({
                type: 'system',
                text: `Session started: ${event.session_id}\nModel: ${event.model}`,
                time
            });
            broadcast({
                type: 'task_output',
                taskId: task.id,
                output: { type: 'system', text: `Model: ${event.model}`, time },
            });
            break;

        case 'message':
            if (event.role === 'assistant' && event.content) {
                // Agent is responding/thinking
                task.state = TaskState.THINKING;
                broadcast({ type: 'task_thinking', taskId: task.id });

                task.output.push({ type: 'message', role: event.role, text: event.content, time });
                broadcast({
                    type: 'task_output',
                    taskId: task.id,
                    output: { type: 'message', role: event.role, text: event.content, time },
                });
            }
            break;

        case 'tool_use':
            console.log(`🔧 Tool: ${event.tool_name}`);
            task.state = TaskState.RUNNING;

            // Format tool parameters nicely
            const paramsStr = JSON.stringify(event.parameters, null, 2);
            task.output.push({
                type: 'tool_use',
                tool: event.tool_name,
                toolId: event.tool_id,
                params: event.parameters,
                time
            });
            broadcast({
                type: 'task_output',
                taskId: task.id,
                output: {
                    type: 'tool_use',
                    tool: event.tool_name,
                    toolId: event.tool_id,
                    params: event.parameters,
                    text: `${event.tool_name}: ${paramsStr.substring(0, 200)}${paramsStr.length > 200 ? '...' : ''}`,
                    time
                },
            });

            // Detect HTML file creation for preview
            if (event.tool_name === 'write_file' && event.parameters?.file_path?.endsWith('.html')) {
                task.preview = event.parameters.file_path;
                console.log(`✨ Preview detected: ${task.preview}`);
                broadcast({ type: 'task_preview_ready', taskId: task.id, preview: task.preview });
            }
            break;

        case 'tool_result':
            const isError = event.status === 'error';
            const resultType = isError ? 'tool_error' : 'tool_result';
            const resultText = event.output || event.error?.message || 'Done';

            console.log(`${isError ? '❌' : '✅'} Tool result: ${resultText.substring(0, 100)}`);

            task.output.push({
                type: resultType,
                toolId: event.tool_id,
                status: event.status,
                text: resultText,
                time
            });
            broadcast({
                type: 'task_output',
                taskId: task.id,
                output: {
                    type: resultType,
                    toolId: event.tool_id,
                    status: event.status,
                    text: resultText.substring(0, 500),
                    time
                },
            });
            break;

        case 'result':
            // Final completion event with stats
            console.log(`📊 Stats: ${event.stats?.tool_calls || 0} tool calls, ${event.stats?.total_tokens || 0} tokens`);
            task.output.push({
                type: 'result',
                status: event.status,
                stats: event.stats,
                time
            });
            broadcast({
                type: 'task_output',
                taskId: task.id,
                output: {
                    type: 'result',
                    status: event.status,
                    stats: event.stats,
                    time
                },
            });
            break;
    }
}

// Run a Gemini task with structured JSON output
function runGeminiTask(task) {
    task.state = TaskState.RUNNING;
    task.startTime = Date.now();
    broadcast({ type: 'task_started', taskId: task.id });

    const geminiPrompt = buildPrompt(task);

    console.log(`\n🚀 Starting task: ${task.title}`);
    console.log(`📂 Working Directory: ${QUEST_ROOT}`);

    // Broadcast system message with starting info
    broadcast({
        type: 'task_output',
        taskId: task.id,
        output: {
            type: 'system',
            text: `Starting Gemini...\nTask: ${task.title}\nPrompt: ${task.prompt}`,
            time: Date.now()
        },
    });

    // Use stream-json output format for structured events
    const gemini = spawn('gemini', ['-y', '--output-format=stream-json'], {
        cwd: QUEST_ROOT,
        stdio: ['pipe', 'pipe', 'pipe'],
    });

    task.process = gemini;

    // Buffer for partial JSON lines
    let buffer = '';

    // Handle stdout - parse newline-delimited JSON
    gemini.stdout.on('data', (data) => {
        buffer += data.toString();

        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('{')) continue;

            try {
                const event = JSON.parse(trimmed);
                handleGeminiEvent(task, event);
            } catch (e) {
                // Not valid JSON, ignore (could be a warning message)
                console.log(`⚠️ Non-JSON output: ${trimmed.substring(0, 100)}`);
            }
        }
    });

    // Handle stderr (warnings, deprecation notices, etc.)
    gemini.stderr.on('data', (data) => {
        const text = data.toString();
        // Only log meaningful errors, not deprecation warnings
        if (!text.includes('DeprecationWarning') && !text.includes('punycode')) {
            console.log(`stderr: ${text}`);
            task.output.push({ type: 'stderr', text, time: Date.now() });
            broadcast({
                type: 'task_output',
                taskId: task.id,
                output: { type: 'stderr', text, time: Date.now() },
            });
        }
    });

    // Send prompt
    gemini.stdin.write(geminiPrompt);
    gemini.stdin.end();

    // Handle completion
    gemini.on('close', (code) => {
        task.endTime = Date.now();
        delete task.process;

        // Process any remaining buffer
        if (buffer.trim() && buffer.startsWith('{')) {
            try {
                handleGeminiEvent(task, JSON.parse(buffer));
            } catch (e) { /* ignore */ }
        }

        if (code === 0) {
            task.state = TaskState.COMPLETED;
            console.log(`✅ Task completed: ${task.title}`);
            broadcast({ type: 'task_completed', taskId: task.id });
        } else {
            task.state = TaskState.FAILED;
            task.error = `Process exited with code ${code}`;
            console.log(`❌ Task failed: ${task.title} (code ${code})`);
            broadcast({ type: 'task_failed', taskId: task.id, error: task.error });
        }
    });

    // Handle crash
    gemini.on('error', (err) => {
        task.endTime = Date.now();
        task.state = TaskState.CRASHED;
        task.error = err.message;
        delete task.process;

        console.log(`💥 Task crashed: ${task.title} - ${err.message}`);
        broadcast({ type: 'task_crashed', taskId: task.id, error: err.message });
    });
}

// Build prompt for Gemini
function buildPrompt(task) {
    const contextSection = task.context.length > 0
        ? `\n\nContext files:\n${task.context.map(f => `- ${f}`).join('\n')}`
        : '';

    return `You are improving the Quest game codebase at: ${QUEST_ROOT}

Task Type: ${task.type}
Title: ${task.title}

Instructions:
${task.prompt}
${contextSection}

Guidelines:
- Quest is a React + Three.js game  
- State: src/state/, UI: src/ui/, 3D: src/game/
- Building registry: src/game/registry.ts
- After changes, verify with: npm run build
- Keep changes focused and modular`;
}

// Serve HTML previews
app.get('/preview/:taskId', (req, res) => {
    const task = activeTasks.get(req.params.taskId);
    if (!task || !task.preview) {
        return res.status(404).send('No preview available');
    }
    res.sendFile(task.preview);
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', activeTasks: activeTasks.size });
});

// Start server
server.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════╗
║          Quest Agent Server               ║
╠═══════════════════════════════════════════╣
║  HTTP:      http://localhost:${PORT}          ║
║  WebSocket: ws://localhost:${PORT}            ║
╚═══════════════════════════════════════════╝
  `);
});
