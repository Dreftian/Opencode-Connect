import { LlmAdapter } from './types.js';
export class OpenCodeAdapter extends LlmAdapter {
    client;
    synchronizer;
    providerId;
    constructor(client, synchronizer, providerId = 'opencode') {
        super();
        this.client = client;
        this.synchronizer = synchronizer;
        this.providerId = providerId;
    }
    providerInfo(provider) {
        return {
            id: provider,
            name: 'OpenCode Desktop (Free Models)',
        };
    }
    async listModels(provider) {
        let models = this.synchronizer.getModels();
        if (models.length === 0) {
            models = await this.synchronizer.sync();
        }
        return models.map((m) => ({
            provider,
            id: m.id,
            name: `${m.name} [Free]`,
            contextWindow: m.contextWindow ?? 131072,
            maxTokens: m.maxTokens ?? 8192,
            inputModalities: ['text'],
            description: `Free model hosted and accelerated via OpenCode Desktop (${m.id})`,
        }));
    }
    async resolveModel(provider, model, _signal) {
        const models = this.synchronizer.getModels();
        const found = models.find((m) => m.id === model);
        return {
            provider,
            id: model,
            name: found ? `${found.name} [Free]` : model,
            contextWindow: found?.contextWindow ?? 131072,
            maxTokens: found?.maxTokens ?? 8192,
            inputModalities: ['text'],
            context: {
                contextWindow: found?.contextWindow ?? 131072,
            },
            defaultMaxTokens: found?.maxTokens ?? 8192,
        };
    }
    /**
     * Format conversation messages into a coherent prompt for OpenCode CLI.
     */
    formatPrompt(options) {
        const parts = [];
        if (options.system) {
            parts.push(`[System Instructions]\n${options.system.trim()}\n`);
        }
        for (const msg of options.messages) {
            const role = msg.role.toUpperCase();
            let content = '';
            if (typeof msg.content === 'string') {
                content = msg.content;
            }
            else if (Array.isArray(msg.content)) {
                content = msg.content
                    .map((c) => (typeof c.text === 'string' ? c.text : JSON.stringify(c)))
                    .join('\n');
            }
            if (role === 'SYSTEM' && !options.system) {
                parts.push(`[System Instructions]\n${content.trim()}\n`);
            }
            else {
                parts.push(`[${role}]: ${content.trim()}`);
            }
        }
        // If single prompt from user, send straightforward text to keep models concise
        if (options.messages.length === 1 && options.messages[0].role === 'user' && !options.system) {
            const msg = options.messages[0];
            return typeof msg.content === 'string' ? msg.content : parts.join('\n\n');
        }
        return parts.join('\n\n');
    }
    async *stream(options) {
        const prompt = this.formatPrompt(options);
        let inReasoning = false;
        let inText = false;
        let currentReasoning = '';
        let currentText = '';
        let blockIndex = 0;
        try {
            for await (const event of this.client.runStream(options.model, prompt, {
                signal: options.signal,
                system: options.system,
            })) {
                if (event.type === 'error' && event.error) {
                    throw new Error(`OpenCode Error (${event.error.status || 500}): ${event.error.message || 'Unknown error'}`);
                }
                if (event.type === 'thinking_start') {
                    inReasoning = true;
                    currentReasoning = '';
                    yield { type: 'block-start', index: blockIndex, blockType: 'reasoning' };
                }
                else if (event.type === 'thinking_delta' && event.delta) {
                    currentReasoning += event.delta;
                    yield { type: 'reasoning-delta', index: blockIndex, text: event.delta };
                }
                else if (event.type === 'thinking_end') {
                    if (inReasoning) {
                        yield { type: 'block-end', index: blockIndex, block: { type: 'reasoning', text: currentReasoning } };
                        currentReasoning = '';
                        inReasoning = false;
                        blockIndex++;
                    }
                }
                else if (event.type === 'text_start') {
                    inText = true;
                    currentText = '';
                    yield { type: 'block-start', index: blockIndex, blockType: 'text' };
                }
                else if (event.type === 'text_delta' && event.delta) {
                    currentText += event.delta;
                    yield { type: 'text-delta', index: blockIndex, text: event.delta };
                }
                else if (event.type === 'text_end') {
                    if (inText) {
                        yield { type: 'block-end', index: blockIndex, block: { type: 'text', text: currentText } };
                        currentText = '';
                        inText = false;
                        blockIndex++;
                    }
                }
                else if (event.type === 'step_end') {
                    if (inReasoning) {
                        yield { type: 'block-end', index: blockIndex, block: { type: 'reasoning', text: currentReasoning } };
                        currentReasoning = '';
                        inReasoning = false;
                        blockIndex++;
                    }
                    if (inText) {
                        yield { type: 'block-end', index: blockIndex, block: { type: 'text', text: currentText } };
                        currentText = '';
                        inText = false;
                        blockIndex++;
                    }
                    yield { type: 'finish', reason: { kind: 'stop' } };
                }
            }
        }
        catch (err) {
            if (options.signal?.aborted) {
                yield {
                    type: 'finish',
                    reason: {
                        kind: 'aborted',
                        failure: { code: 'aborted', message: 'Request was aborted by the client' },
                    },
                };
                return;
            }
            throw err;
        }
    }
}
