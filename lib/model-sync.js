import { EventEmitter } from 'node:events';
export class OpenCodeModelSynchronizer extends EventEmitter {
    client;
    cachedModels = [];
    timer = null;
    syncIntervalMs;
    onlyFreeModels;
    isSyncing = false;
    constructor(client, syncIntervalMs = 30000, onlyFreeModels = true) {
        super();
        this.client = client;
        this.syncIntervalMs = syncIntervalMs;
        this.onlyFreeModels = onlyFreeModels;
    }
    /**
     * Get the latest cached models.
     */
    getModels() {
        return [...this.cachedModels];
    }
    /**
     * Fetch current models from OpenCode and emit 'models-updated' if differences exist.
     */
    async sync() {
        if (this.isSyncing)
            return this.cachedModels;
        this.isSyncing = true;
        try {
            const freshModels = await this.client.listModels(this.onlyFreeModels);
            const prevIds = new Set(this.cachedModels.map((m) => m.id));
            const freshIds = new Set(freshModels.map((m) => m.id));
            let hasChanged = prevIds.size !== freshIds.size;
            if (!hasChanged) {
                for (const id of freshIds) {
                    if (!prevIds.has(id)) {
                        hasChanged = true;
                        break;
                    }
                }
            }
            this.cachedModels = freshModels;
            if (hasChanged) {
                this.emit('models-updated', freshModels);
            }
            return freshModels;
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            this.emit('error', error);
            return this.cachedModels;
        }
        finally {
            this.isSyncing = false;
        }
    }
    /**
     * Start periodic auto-synchronization.
     */
    start() {
        if (this.timer)
            return;
        // Initial sync
        void this.sync();
        if (this.syncIntervalMs > 0) {
            this.timer = setInterval(() => {
                void this.sync();
            }, this.syncIntervalMs);
            this.timer.unref();
        }
    }
    /**
     * Stop periodic auto-synchronization.
     */
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
}
