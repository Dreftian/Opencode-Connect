import { LlmAdapter, } from '@deepseek-ai/dsh-llm';
/**
 * Extracts plain text from a message content block or array.
 */
export function extractContentText(content) {
    if (typeof content === 'string') {
        return content;
    }
    if (Array.isArray(content)) {
        const texts = [];
        for (const item of content) {
            if (!item)
                continue;
            if (typeof item === 'string') {
                texts.push(item);
            }
            else if (item && typeof item === 'object') {
                const block = item;
                if (typeof block.text === 'string') {
                    texts.push(block.text);
                }
                else if (typeof block.content === 'string') {
                    texts.push(block.content);
                }
            }
        }
        return texts.join('\n');
    }
    if (content && typeof content === 'object') {
        const obj = content;
        if (typeof obj.text === 'string')
            return obj.text;
        if (typeof obj.content === 'string')
            return obj.content;
    }
    return '';
}
/**
 * Assembles a conversation history and system instructions into a single prompt for OpenCode CLI.
 */
export function assemblePrompt(messages, system) {
    const parts = [];
    if (system && system.trim()) {
        parts.push(`System: ${system.trim()}`);
    }
    // If there's only a single user message and no separate system prompt, pass it cleanly
    if (parts.length === 0 && messages.length === 1 && messages[0].role === 'user') {
        return extractContentText(messages[0].content).trim();
    }
    for (const message of messages) {
        const text = extractContentText(message.content).trim();
        if (!text)
            continue;
        const role = message.role || 'user';
        const roleCapitalized = role.charAt(0).toUpperCase() + role.slice(1);
        parts.push(`${roleCapitalized}: ${text}`);
    }
    return parts.join('\n\n');
}
export class OpenCodeAdapter extends LlmAdapter {
    client;
    synchronizer;
    constructor(client, synchronizer) {
        super();
        this.client = client;
        this.synchronizer = synchronizer;
    }
    /**
     * Describes the OpenCode provider route.
     */
    providerInfo(provider) {
        return {
            id: 'opencode',
            name: 'OpenCode Desktop',
        };
    }
    /**
     * Lists models discovered and cached by the model synchronizer.
     */
    async listModels(provider) {
        const cached = this.synchronizer.getModels();
        if (cached.length > 0) {
            return cached;
        }
        // If cache is empty, attempt an initial refresh
        try {
            return await this.synchronizer.refresh();
        }
        catch {
            return [];
        }
    }
    /**
     * Resolves capabilities and metadata for a specific model.
     */
    async resolveModel(provider, model, _signal) {
        const info = this.synchronizer.getModel(model);
        const displayName = info?.name ?? `OpenCode ${model}`;
        return {
            provider: 'opencode',
            id: model,
            name: displayName,
            description: info?.description,
            inputModalities: info?.inputModalities ?? ['text'],
            context: {
                contextWindow: 131072,
            },
            defaultMaxTokens: 8192,
        };
    }
    /**
     * Dispatches model streaming inference to the OpenCode client and yields StreamChunk events.
     */
    async *stream(options) {
        const prompt = assemblePrompt(options.messages, options.system);
        // Normalize model ID: ensure provider prefix is valid if required
        let targetModel = options.model;
        if (!targetModel.startsWith('opencode/') && !targetModel.includes('/')) {
            targetModel = `opencode/${targetModel}`;
        }
        const eventStream = this.client.runStreamWithRetry(targetModel, prompt, {
            signal: options.signal,
            system: options.system,
        });
        for await (const event of eventStream) {
            if (options.signal?.aborted) {
                throw new Error('LLM call aborted by caller');
            }
            if (event.type === 'thinking_delta') {
                if (event.text) {
                    yield {
                        type: 'reasoning-delta',
                        index: 0,
                        text: event.text,
                    };
                }
            }
            else if (event.type === 'text_delta') {
                if (event.text) {
                    yield {
                        type: 'text-delta',
                        index: 0,
                        text: event.text,
                    };
                }
            }
            else if (event.type === 'error') {
                throw new Error(event.message || 'OpenCode execution error');
            }
        }
        // Terminal completion event
        yield {
            type: 'finish',
            reason: 'stop',
        };
    }
}
