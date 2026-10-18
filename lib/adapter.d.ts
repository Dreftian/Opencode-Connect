import { LlmAdapter, type GenerateOptions, type StreamChunk, type LlmModelInfo, type LlmResolvedModelInfo, type LlmProviderInfo, type RequestMessage } from '@deepseek-ai/dsh-llm';
import { OpenCodeClient } from './opencode-client.js';
import { OpenCodeModelSynchronizer } from './model-sync.js';
/**
 * Extracts plain text from a message content block or array.
 */
export declare function extractContentText(content: unknown): string;
/**
 * Assembles a conversation history and system instructions into a single prompt for OpenCode CLI.
 */
export declare function assemblePrompt(messages: readonly RequestMessage[], system?: string): string;
export declare class OpenCodeAdapter extends LlmAdapter {
    private client;
    private synchronizer;
    constructor(client: OpenCodeClient, synchronizer: OpenCodeModelSynchronizer);
    /**
     * Describes the OpenCode provider route.
     */
    providerInfo(provider: string): LlmProviderInfo;
    /**
     * Lists models discovered and cached by the model synchronizer.
     */
    listModels(provider: string): Promise<readonly LlmModelInfo[]>;
    /**
     * Resolves capabilities and metadata for a specific model.
     */
    resolveModel(provider: string, model: string, _signal?: AbortSignal): Promise<LlmResolvedModelInfo>;
    /**
     * Dispatches model streaming inference to the OpenCode client and yields StreamChunk events.
     */
    stream(options: GenerateOptions): AsyncIterable<StreamChunk>;
}
