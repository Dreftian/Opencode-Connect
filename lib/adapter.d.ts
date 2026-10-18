import { LlmAdapter, type GenerateOptions, type LlmModelInfo, type LlmProviderInfo, type LlmResolvedModelInfo, type StreamChunk } from './types.js';
import { OpenCodeClient } from './opencode-client.js';
import { OpenCodeModelSynchronizer } from './model-sync.js';
export declare class OpenCodeAdapter extends LlmAdapter {
    private client;
    private synchronizer;
    private providerId;
    constructor(client: OpenCodeClient, synchronizer: OpenCodeModelSynchronizer, providerId?: string);
    providerInfo(provider: string): LlmProviderInfo;
    listModels(provider: string): Promise<readonly LlmModelInfo[]>;
    resolveModel(provider: string, model: string, _signal?: AbortSignal): Promise<LlmResolvedModelInfo>;
    /**
     * Format conversation messages into a coherent prompt for OpenCode CLI.
     */
    private formatPrompt;
    stream(options: GenerateOptions): AsyncIterable<StreamChunk>;
}
//# sourceMappingURL=adapter.d.ts.map