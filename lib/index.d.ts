/**
 * DeepSeek Harness Plugin: dsh-plugin-opencode-connect
 * Connect and auto-sync OpenCode Desktop free models as LLM providers in DeepSeek Harness.
 */
import type { OpenCodePluginOptions, LlmAdapter } from './types.js';
export * from './types.js';
export declare const name = "llm-opencode-connect";
export declare const inject: string[];
export interface PluginContext {
    llm?: {
        registerAdapter(providers: string[], adapter: LlmAdapter): () => void;
    };
    on?(event: string, listener: (...args: unknown[]) => void): void;
    emit?(event: string, ...args: unknown[]): void;
}
/**
 * Default plugin configuration options.
 */
export declare const defaultConfig: OpenCodePluginOptions;
/**
 * Cordis plugin apply method.
 * Registers the OpenCode adapter with DeepSeek Harness LLM runtime.
 */
export declare function apply(ctx: PluginContext, options?: OpenCodePluginOptions): void;
//# sourceMappingURL=index.d.ts.map