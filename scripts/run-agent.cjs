#!/usr/bin/env node
/**
 * Quest Agent Runner
 * 
 * Standalone Node.js script to execute Gemini CLI tasks for Quest.
 * 
 * Usage:
 *   node scripts/run-agent.js --task "Fix the login bug" --type debug
 *   node scripts/run-agent.js --prompt "Add a new Library building type"
 */

const { spawn } = require('child_process');
const path = require('path');

const QUEST_ROOT = path.resolve(__dirname, '..');

function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        prompt: '',
        type: 'custom',
        context: [],
        timeout: 120000,
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--prompt':
            case '-p':
                options.prompt = args[++i];
                break;
            case '--type':
            case '-t':
                options.type = args[++i];
                break;
            case '--context':
            case '-c':
                options.context.push(args[++i]);
                break;
            case '--timeout':
                options.timeout = parseInt(args[++i], 10);
                break;
            case '--help':
            case '-h':
                printHelp();
                process.exit(0);
        }
    }

    return options;
}

function printHelp() {
    console.log(`
Quest Agent Runner

Usage:
  node scripts/run-agent.js [options]

Options:
  -p, --prompt <text>    The task prompt/instruction
  -t, --type <type>      Task type: code|debug|review|refactor|research|custom
  -c, --context <file>   Add context file (can be used multiple times)
  --timeout <ms>         Timeout in milliseconds (default: 120000)
  -h, --help             Show this help
  
Examples:
  node scripts/run-agent.js -p "Add a Library building type" -t code
  node scripts/run-agent.js -p "Fix the HUD layout" -c src/ui/HUD.tsx
`);
}

function buildPrompt(options) {
    const typeDescriptions = {
        code: 'Write new code to implement the following:',
        debug: 'Debug and fix the following issue:',
        review: 'Review the following code for issues:',
        refactor: 'Refactor the following code:',
        research: 'Research and document:',
        custom: '',
    };

    const typePrefix = typeDescriptions[options.type] || '';
    const contextSection = options.context.length > 0
        ? `\n\nContext files to focus on:\n${options.context.map(f => `- ${f}`).join('\n')}`
        : '';

    return `You are improving the Quest game codebase located at: ${QUEST_ROOT}

${typePrefix}
${options.prompt}
${contextSection}

Guidelines:
- Quest is a React + Three.js game 
- State is in src/state/, UI in src/ui/, 3D in src/game/
- Building types are defined in src/game/registry.ts
- Task types are in src/tasks/TaskDefinition.ts
- After changes, verify with: npm run build
- Keep changes focused and modular`;
}

async function runGemini(options) {
    return new Promise((resolve, reject) => {
        const prompt = buildPrompt(options);

        console.log('🚀 Starting Quest Agent...');
        console.log(`📋 Task type: ${options.type}`);
        console.log(`📝 Prompt: ${options.prompt}\n`);
        console.log('---');

        const gemini = spawn('gemini', [], {
            cwd: QUEST_ROOT,
            shell: true,
            stdio: ['pipe', 'inherit', 'inherit'],
        });

        let timedOut = false;
        const timeoutId = setTimeout(() => {
            timedOut = true;
            gemini.kill('SIGTERM');
            console.error('\n❌ Task timed out');
        }, options.timeout);

        // Send prompt to gemini
        gemini.stdin.write(prompt);
        gemini.stdin.end();

        gemini.on('close', (code) => {
            clearTimeout(timeoutId);
            if (timedOut) {
                reject(new Error('Timeout'));
            } else if (code === 0) {
                console.log('\n✅ Task completed successfully');
                resolve();
            } else {
                console.log(`\n⚠️ Task exited with code ${code}`);
                resolve(); // Don't reject, gemini might have done partial work
            }
        });

        gemini.on('error', (err) => {
            clearTimeout(timeoutId);
            console.error(`\n❌ Error: ${err.message}`);
            reject(err);
        });
    });
}

// Main
const options = parseArgs();

if (!options.prompt) {
    console.error('Error: --prompt is required\n');
    printHelp();
    process.exit(1);
}

runGemini(options).catch(() => process.exit(1));
