import { EventEmitter } from 'node:events';
import type { LlmModelInfo } from '@deepseek-ai/dsh-llm';
import { OpenCodeClient } from './opencode-client.js';
export interface ModelUpdatedEvent {
    models: readonly LlmModelInfo[];
    added: readonly string[];
    removed: readonly string[];
    updatedAt: number;
}
export interface ModelSynchronizerOptions {
    /** Periodic synchronization interval in milliseconds (default: 30000ms = 30s) */
    syncIntervalMs?: number;
    /** Whether to only expose and track free-tier models */
    freeOnly?: boolean;
    /** Whether to automatically start polling on construction */
    autoStart?: boolean;
}
/**
 * Formats a raw model ID into a user-friendly name.
 */
export declare function formatModelDisplayName(modelId: string): string;
/**
 * Converts a raw OpenCode model ID to a canonical LlmModelInfo object.
 */
export declare function toModelInfo(rawId: string): LlmModelInfo;
/**
 * Periodically and on-demand synchronizes available models from OpenCode Desktop.
 * Emits 'models-updated' whenever models are added, removed, or refreshed.
 */
export declare class OpenCodeModelSynchronizer extends EventEmitter {
    private client;
    private syncIntervalMs;
    private freeOnly;
    private modelsMap;
    private timer;
    private running;
    private lastSyncTime;
    constructor(client: OpenCodeClient, options?: ModelSynchronizerOptions);
    /**
     * Starts periodic model synchronization.
     */
    start(): void;
    /**
     * Stops periodic model synchronization.
     */
    stop(): void;
    /**
     * Checks whether background sync is active.
     */
    isActive(): boolean;
    /**
     * Returns all currently cached models.
     */
    getModels(): readonly LlmModelInfo[];
    /**
     * Finds a model by ID (supports exact match e.g. "opencode/beam-free" or short id "beam-free").
     */
    getModel(modelId: string): LlmModelInfo | undefined;
    /**
     * Manually triggers a model refresh and emits 'models-updated' if changes occurred.
     */
    refresh(): Promise<readonly LlmModelInfo[]>;
}
