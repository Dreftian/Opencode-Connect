/**
 * DeepSeek Harness Plugin: dsh-plugin-opencode-connect
 * Connect and auto-sync OpenCode Desktop free models as LLM providers in DeepSeek Harness.
 */
import type { CordisContext, OpenCodePluginOptions } from './types.js';
export * from './types.js';
export * from './opencode-client.js';
export * from './model-sync.js';
export * from './adapter.js';
export declare const name = "llm-opencode-connect";
export declare const inject: string[];
/**
 * Default plugin configuration options.
 */
export declare const defaultConfig: OpenCodePluginOptions;
/**
 * Cordis plugin apply method.
 * Instantiates the client, model synchronizer, and registers the OpenCode adapter
 * with DeepSeek Harness LLM runtime.
 */
export declare function apply(ctx: CordisContext, options?: OpenCodePluginOptions): void;
declare const _default: {
    name: string;
    inject: string[];
    apply: typeof apply;
};
export default _default;
