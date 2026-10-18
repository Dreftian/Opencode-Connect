import type { Context } from '@deepseek-ai/cordis';
import { OpenCodeClient, isFreeModel, findOpenCodeBinary, parseModelList, parseStreamLine } from './opencode-client.js';
import { OpenCodeModelSynchronizer } from './model-sync.js';
import { OpenCodeAdapter, assemblePrompt, extractContentText } from './adapter.js';
export declare const name = "dsh-plugin-opencode-connect";
export declare const inject: readonly ["llm"];
export interface OpenCodePluginConfig {
    /** Custom path to the opencode-cli executable */
    cliPath?: string;
    /** Background model sync interval in milliseconds (default: 30000ms) */
    syncIntervalMs?: number;
    /** Whether to only expose and sync free-tier models (default: false) */
    freeOnly?: boolean;
    /** Maximum retry attempts upon encountering rate limit errors (default: 3) */
    maxRetries?: number;
    /** Initial backoff delay in milliseconds for rate limit retries (default: 1500ms) */
    retryBackoffMs?: number;
}
/**
 * Applies the OpenCode Connect plugin to the Cordis context.
 */
export declare function apply(ctx: Context, config?: OpenCodePluginConfig): void;
export { OpenCodeClient, OpenCodeModelSynchronizer, OpenCodeAdapter, isFreeModel, findOpenCodeBinary, parseModelList, parseStreamLine, assemblePrompt, extractContentText, };
