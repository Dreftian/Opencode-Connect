import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
const execFileAsync = promisify(execFile);
export class OpenCodeClient {
    resolvedCliPath = null;
    explicitCliPath;
    constructor(cliPath) {
        this.explicitCliPath = cliPath;
    }
    /**
     * Find the OpenCode CLI executable across standard install paths on Windows, macOS, and Linux.
     */
    findCliPath() {
        if (this.explicitCliPath && fs.existsSync(this.explicitCliPath)) {
            this.resolvedCliPath = this.explicitCliPath;
            return this.explicitCliPath;
        }
        if (this.resolvedCliPath && fs.existsSync(this.resolvedCliPath)) {
            return this.resolvedCliPath;
        }
        const platform = os.platform();
        const home = os.homedir();
        const candidates = [];
        if (platform === 'win32') {
            const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
            const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
            // 1. Check in APPDATA/ai.opencode.desktop/cli/*/opencode-cli.exe
            const cliBase = path.join(appData, 'ai.opencode.desktop', 'cli');
            if (fs.existsSync(cliBase)) {
                try {
                    const versions = fs.readdirSync(cliBase);
                    for (const ver of versions.reverse()) {
                        const candidate = path.join(cliBase, ver, 'opencode-cli.exe');
                        if (fs.existsSync(candidate))
                            candidates.push(candidate);
                    }
                }
                catch {
                    // ignore
                }
            }
            // 2. Check in LocalAppData Programs
            candidates.push(path.join(localAppData, 'Programs', '@opencodedesktop', 'resources', 'opencode-cli.exe'), path.join(localAppData, 'Programs', 'OpenCode', 'resources', 'opencode-cli.exe'));
        }
        else if (platform === 'darwin') {
            const support = path.join(home, 'Library', 'Application Support', 'ai.opencode.desktop', 'cli');
            if (fs.existsSync(support)) {
                try {
                    const versions = fs.readdirSync(support);
                    for (const ver of versions.reverse()) {
                        const candidate = path.join(support, ver, 'opencode-cli');
                        if (fs.existsSync(candidate))
                            candidates.push(candidate);
                    }
                }
                catch {
                    // ignore
                }
            }
            candidates.push('/Applications/OpenCode.app/Contents/Resources/opencode-cli', '/usr/local/bin/opencode-cli', '/opt/homebrew/bin/opencode-cli');
        }
        else {
            // Linux
            const configBase = path.join(home, '.config', 'ai.opencode.desktop', 'cli');
            if (fs.existsSync(configBase)) {
                try {
                    const versions = fs.readdirSync(configBase);
                    for (const ver of versions.reverse()) {
                        const candidate = path.join(configBase, ver, 'opencode-cli');
                        if (fs.existsSync(candidate))
                            candidates.push(candidate);
                    }
                }
                catch {
                    // ignore
                }
            }
            candidates.push('/usr/bin/opencode-cli', '/usr/local/bin/opencode-cli', path.join(home, '.local', 'bin', 'opencode-cli'));
        }
        // Default to PATH lookup
        candidates.push(platform === 'win32' ? 'opencode-cli.exe' : 'opencode-cli');
        for (const cand of candidates) {
            if (fs.existsSync(cand)) {
                this.resolvedCliPath = cand;
                return cand;
            }
        }
        // Return the preferred binary name if no absolute path found
        const fallback = candidates[0] || (platform === 'win32' ? 'opencode-cli.exe' : 'opencode-cli');
        this.resolvedCliPath = fallback;
        return fallback;
    }
    /**
     * Parse a raw model identifier into structured OpenCodeModel metadata.
     */
    parseModelId(rawId) {
        const trimmed = rawId.trim();
        const parts = trimmed.split('/');
        const provider = parts.length > 1 ? parts[0] : 'opencode';
        const namePart = parts.length > 1 ? parts.slice(1).join('/') : trimmed;
        // Determine if it's a free model
        const isFree = trimmed.toLowerCase().includes('free') ||
            trimmed.toLowerCase().includes('big-pickle') ||
            provider.toLowerCase() === 'opencode';
        // Format human-friendly name matching OpenCode Desktop UI conventions
        // Map known models directly for pristine UI display, or fall back to algorithmic naming
        const knownNames = {
            'beam-free': 'Beam Free',
            'big-pickle': 'Big Pickle',
            'deepseek-v4.1-flash-free': 'DeepSeek V4.1 Flash Free',
            'glm-5.3-flash-free': 'GLM-5.3-Flash Free',
            'longcat-2.5-preview-free': 'LongCat 2.5 Preview Free',
            'mimo-v2.6-flash-free': 'MiMo-V2.6-Flash Free',
            'nemotron-3-ultra-free': 'Nemotron 3 Ultra Free',
            'nemotron-3.5-lightning-free': 'Nemotron 3.5 Lightning Free',
            'nemotron-3.5-super-vl-free': 'Nemotron 3.5 Super VL Free',
            'space-bunny-free': 'Space Bunny Free',
        };
        let name = knownNames[namePart.toLowerCase()];
        if (!name) {
            name = namePart
                .replace(/-/g, ' ')
                .split(' ')
                .map((w) => {
                if (/^v\d+(\.\d+)*$/i.test(w))
                    return 'V' + w.slice(1);
                if (/^glm/i.test(w))
                    return 'GLM' + w.slice(3);
                if (['vl', 'mimo'].includes(w.toLowerCase()))
                    return w.toUpperCase();
                return w.charAt(0).toUpperCase() + w.slice(1);
            })
                .join(' ');
        }
        return {
            id: trimmed,
            name,
            provider,
            isFree,
            contextWindow: 131072,
            maxTokens: 8192,
        };
    }
    /**
     * List all models from OpenCode Desktop by executing `opencode models`.
     */
    async listModels(onlyFree = true) {
        const cli = this.findCliPath();
        try {
            const { stdout } = await execFileAsync(cli, ['models'], {
                timeout: 10000,
                env: { ...process.env },
            });
            const lines = stdout.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
            const models = lines.map((line) => this.parseModelId(line));
            if (onlyFree) {
                return models.filter((m) => m.isFree);
            }
            return models;
        }
        catch (error) {
            throw new Error(`Failed to list OpenCode models via ${cli}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Run a prompt and stream JSON lines from `opencode run -m <model> --format json "<prompt>"`.
     */
    async *runStream(modelId, prompt, options) {
        const cli = this.findCliPath();
        const args = ['run', '-m', modelId, '--format', 'json', prompt];
        const child = spawn(cli, args, {
            stdio: ['ignore', 'pipe', 'pipe'],
            env: { ...process.env },
            windowsHide: true,
        });
        if (options?.signal) {
            options.signal.addEventListener('abort', () => {
                child.kill();
            }, { once: true });
        }
        let buffer = '';
        const queue = [];
        let done = false;
        let failure = null;
        let resolveWait = null;
        const notify = () => {
            if (resolveWait) {
                resolveWait();
                resolveWait = null;
            }
        };
        child.stdout.setEncoding('utf-8');
        child.stdout.on('data', (chunk) => {
            buffer += chunk;
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() || '';
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed)
                    continue;
                try {
                    const parsed = JSON.parse(trimmed);
                    queue.push(parsed);
                    notify();
                }
                catch {
                    // Ignore non-json lines
                }
            }
        });
        child.stderr.setEncoding('utf-8');
        child.stderr.on('data', (errChunk) => {
            // Capture stderr errors if relevant
            const text = errChunk.trim();
            if (text.includes('Rate limit exceeded') || text.includes('FreeUsageLimitError')) {
                queue.push({
                    type: 'error',
                    error: {
                        type: 'provider.quota',
                        message: 'Rate limit exceeded for free model in OpenCode Desktop. Please try again later.',
                        status: 429,
                    },
                });
                notify();
            }
        });
        child.on('error', (err) => {
            failure = err;
            done = true;
            notify();
        });
        child.on('close', (code) => {
            if (buffer.trim()) {
                try {
                    const parsed = JSON.parse(buffer.trim());
                    queue.push(parsed);
                }
                catch {
                    // ignore
                }
            }
            if (code !== 0 && !queue.some((e) => e.type === 'error')) {
                failure = new Error(`OpenCode process exited with code ${code}`);
            }
            done = true;
            notify();
        });
        while (!done || queue.length > 0) {
            if (queue.length > 0) {
                const item = queue.shift();
                yield item;
            }
            else if (!done) {
                await new Promise((r) => {
                    resolveWait = r;
                });
            }
        }
        if (failure && !queue.length) {
            throw failure;
        }
    }
}
