import type { OpenCodeModel } from './types.js';
export interface StreamEvent {
    type: 'step_start' | 'thinking_start' | 'thinking_delta' | 'thinking_end' | 'text_start' | 'text_delta' | 'text_end' | 'step_end' | 'error';
    delta?: string;
    error?: {
        type?: string;
        message?: string;
        status?: number;
    };
}
export declare class OpenCodeClient {
    private resolvedCliPath;
    private explicitCliPath?;
    constructor(cliPath?: string);
    /**
     * Find the OpenCode CLI executable across standard install paths on Windows, macOS, and Linux.
     */
    findCliPath(): string;
    /**
     * Parse a raw model identifier into structured OpenCodeModel metadata.
     */
    parseModelId(rawId: string): OpenCodeModel;
    /**
     * List all models from OpenCode Desktop by executing `opencode models`.
     */
    listModels(onlyFree?: boolean): Promise<OpenCodeModel[]>;
    /**
     * Run a prompt and stream JSON lines from `opencode run -m <model> --format json "<prompt>"`.
     */
    runStream(modelId: string, prompt: string, options?: {
        signal?: AbortSignal;
        system?: string;
    }): AsyncIterable<StreamEvent>;
}
