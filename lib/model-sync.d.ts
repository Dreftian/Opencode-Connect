import { EventEmitter } from 'node:events';
import { OpenCodeClient } from './opencode-client.js';
import type { OpenCodeModel } from './types.js';
export interface ModelSyncEvents {
    'models-updated': (models: OpenCodeModel[]) => void;
    error: (err: Error) => void;
}
export declare class OpenCodeModelSynchronizer extends EventEmitter {
    private client;
    private cachedModels;
    private timer;
    private syncIntervalMs;
    private onlyFreeModels;
    private isSyncing;
    constructor(client: OpenCodeClient, syncIntervalMs?: number, onlyFreeModels?: boolean);
    /**
     * Get the latest cached models.
     */
    getModels(): OpenCodeModel[];
    /**
     * Fetch current models from OpenCode and emit 'models-updated' if differences exist.
     */
    sync(): Promise<OpenCodeModel[]>;
    /**
     * Start periodic auto-synchronization.
     */
    start(): void;
    /**
     * Stop periodic auto-synchronization.
     */
    stop(): void;
}
//# sourceMappingURL=model-sync.d.ts.map