/** Known free tier models provided by OpenCode Desktop */
export declare const KNOWN_FREE_MODELS: readonly string[];
/**
 * Checks whether a given model ID represents a free model in OpenCode Desktop.
 * Matches `*-free`, `big-pickle`, provider `opencode/`, or known free model names.
 */
export declare function isFreeModel(modelId: string): boolean;
/**
 * Detects the OpenCode binary across Windows, macOS, and Linux.
 */
export declare function findOpenCodeBinary(customPath?: string): string;
/**
 * Parses stdout from `opencode models` into an array of model IDs.
 */
export declare function parseModelList(stdout: string): string[];
export type OpenCodeStreamEvent = {
    type: 'thinking_delta';
    text: string;
    raw?: unknown;
} | {
    type: 'text_delta';
    text: string;
    raw?: unknown;
} | {
    type: 'step_start';
    raw?: unknown;
} | {
    type: 'step_end';
    raw?: unknown;
} | {
    type: 'error';
    message: string;
    status?: number;
    code?: string;
    isRateLimit: boolean;
    raw?: unknown;
} | {
    type: 'other';
    raw: unknown;
};
/**
 * Parses a single JSON line from OpenCode CLI streaming output.
 */
export declare function parseStreamLine(line: string): OpenCodeStreamEvent | null;
export interface RunStreamOptions {
    signal?: AbortSignal;
    system?: string;
    maxRetries?: number;
    retryBackoffMs?: number;
}
export interface OpenCodeClientOptions {
    cliPath?: string;
    maxRetries?: number;
    retryBackoffMs?: number;
}
export declare class OpenCodeClient {
    private resolvedPath;
    private maxRetries;
    private retryBackoffMs;
    constructor(options?: OpenCodeClientOptions);
    /** Gets the detected or configured binary path */
    getBinaryPath(): string;
    /**
     * Executes `opencode models` and returns all model identifiers.
     */
    listModels(): Promise<string[]>;
    /**
     * Checks if a model is categorized as free.
     */
    isFree(modelId: string): boolean;
    /**
     * Spawns `opencode run -m <model> --format json <prompt>` and streams typed events.
     */
    runStream(model: string, prompt: string, options?: RunStreamOptions): AsyncIterable<OpenCodeStreamEvent>;
    /**
     * Streams model output with automatic rate limit backoff and retry.
     */
    runStreamWithRetry(model: string, prompt: string, options?: RunStreamOptions): AsyncIterable<OpenCodeStreamEvent>;
}
