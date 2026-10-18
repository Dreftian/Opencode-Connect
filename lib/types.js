/**
 * Type definitions for dsh-plugin-opencode-connect.
 * Conforms to DeepSeek Harness LlmAdapter specifications and OpenCode Desktop integration.
 */
/**
 * Base abstract class for LLM Adapters in DeepSeek Harness.
 */
export class LlmAdapter {
    providerInfo(provider) {
        return { id: provider, name: provider };
    }
    listModels(_provider) {
        return Promise.resolve([]);
    }
    resolveModel(provider, model, _signal) {
        return Promise.resolve({ provider, id: model, name: model });
    }
    async prepareCall(provider, model, signal) {
        return {
            model: await this.resolveModel(provider, model, signal),
            stream: options => this.stream(options),
        };
    }
}
/**
 * Standard known OpenCode Desktop free models catalog.
 */
export const OPENCODE_FREE_MODELS = Object.freeze([
    {
        id: 'beam-free',
        name: 'Beam Free',
        provider: 'opencode',
        description: 'Fast, lightweight free tier model in OpenCode Desktop',
        isFree: true,
        contextWindow: 32768,
        maxTokens: 4096,
        supportsThinking: false,
        inputModalities: ['text'],
    },
    {
        id: 'big-pickle',
        name: 'Big Pickle',
        provider: 'opencode',
        description: 'Balanced coding and general reasoning free tier model',
        isFree: true,
        contextWindow: 65536,
        maxTokens: 8192,
        supportsThinking: true,
        inputModalities: ['text'],
    },
    {
        id: 'deepseek-v4.1-flash-free',
        name: 'DeepSeek V4.1 Flash Free',
        provider: 'opencode',
        description: 'DeepSeek V4.1 Flash free edition hosted by OpenCode',
        isFree: true,
        contextWindow: 131072,
        maxTokens: 8192,
        supportsThinking: true,
        inputModalities: ['text'],
    },
    {
        id: 'glm-5.3-flash-free',
        name: 'GLM 5.3 Flash Free',
        provider: 'opencode',
        description: 'GLM 5.3 Flash high-throughput reasoning free tier model',
        isFree: true,
        contextWindow: 131072,
        maxTokens: 8192,
        supportsThinking: true,
        inputModalities: ['text'],
    },
    {
        id: 'longcat-2.5-preview-free',
        name: 'LongCat 2.5 Preview Free',
        provider: 'opencode',
        description: 'Long context preview model for deep file search and comprehension',
        isFree: true,
        contextWindow: 262144,
        maxTokens: 8192,
        supportsThinking: false,
        inputModalities: ['text'],
    },
    {
        id: 'mimo-v2.6-flash-free',
        name: 'Mimo V2.6 Flash Free',
        provider: 'opencode',
        description: 'Mimo V2.6 ultra-responsive reasoning free tier model',
        isFree: true,
        contextWindow: 131072,
        maxTokens: 8192,
        supportsThinking: true,
        inputModalities: ['text'],
    },
    {
        id: 'nemotron-3-ultra-free',
        name: 'Nemotron 3 Ultra Free',
        provider: 'opencode',
        description: 'Nemotron 3 high performance reasoning model',
        isFree: true,
        contextWindow: 65536,
        maxTokens: 8192,
        supportsThinking: true,
        inputModalities: ['text'],
    },
    {
        id: 'nemotron-3.5-lightning-free',
        name: 'Nemotron 3.5 Lightning Free',
        provider: 'opencode',
        description: 'Lightning-fast Nemotron 3.5 code generation model',
        isFree: true,
        contextWindow: 65536,
        maxTokens: 8192,
        supportsThinking: false,
        inputModalities: ['text'],
    },
    {
        id: 'nemotron-3.5-super-vl-free',
        name: 'Nemotron 3.5 Super VL Free',
        provider: 'opencode',
        description: 'Vision-language multimodal free model supporting image understanding',
        isFree: true,
        contextWindow: 65536,
        maxTokens: 8192,
        supportsThinking: true,
        inputModalities: ['text', 'image'],
    },
    {
        id: 'space-bunny-free',
        name: 'Space Bunny Free',
        provider: 'opencode',
        description: 'Creative code and architectural reasoning free model',
        isFree: true,
        contextWindow: 65536,
        maxTokens: 8192,
        supportsThinking: true,
        inputModalities: ['text'],
    },
]);
//# sourceMappingURL=types.js.map