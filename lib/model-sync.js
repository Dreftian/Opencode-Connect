import { EventEmitter } from 'node:events';
import { isFreeModel } from './opencode-client.js';
/**
 * Formats a raw model ID into a user-friendly name.
 */
export function formatModelDisplayName(modelId) {
    const parts = modelId.split('/');
    const base = parts.length > 1 ? parts.slice(1).join('/') : parts[0];
    const words = base.split(/[-_]/);
    return words
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}
/**
 * Converts a raw OpenCode model ID to a canonical LlmModelInfo object.
 */
export function toModelInfo(rawId) {
    const isFree = isFreeModel(rawId);
    const displayName = formatModelDisplayName(rawId);
    const name = `OpenCode ${displayName}${isFree ? ' (Free)' : ''}`;
    const description = isFree
        ? `OpenCode Desktop free tier model: ${rawId}`
        : `OpenCode Desktop model: ${rawId}`;
    const modalities = rawId.includes('vl') || rawId.includes('vision')
        ? ['text', 'image']
        : ['text'];
    return {
        provider: 'opencode',
        id: rawId,
        name,
        description,
        inputModalities: modalities,
    };
}
/**
 * Periodically and on-demand synchronizes available models from OpenCode Desktop.
 * Emits 'models-updated' whenever models are added, removed, or refreshed.
 */
export class OpenCodeModelSynchronizer extends EventEmitter {
    client;
    syncIntervalMs;
    freeOnly;
    modelsMap = new Map();
    timer = null;
    running = false;
    lastSyncTime = 0;
    constructor(client, options = {}) {
        super();
        this.client = client;
        this.syncIntervalMs = options.syncIntervalMs ?? 30000;
        this.freeOnly = options.freeOnly ?? false;
        if (options.autoStart) {
            this.start();
        }
    }
    /**
     * Starts periodic model synchronization.
     */
    start() {
        if (this.running)
            return;
        this.running = true;
        this.timer = setInterval(() => {
            this.refresh().catch(err => {
                this.emit('error', err);
            });
        }, this.syncIntervalMs);
        // Unref timer so it doesn't prevent Node from exiting
        if (this.timer.unref) {
            this.timer.unref();
        }
    }
    /**
     * Stops periodic model synchronization.
     */
    stop() {
        this.running = false;
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    /**
     * Checks whether background sync is active.
     */
    isActive() {
        return this.running;
    }
    /**
     * Returns all currently cached models.
     */
    getModels() {
        return Array.from(this.modelsMap.values());
    }
    /**
     * Finds a model by ID (supports exact match e.g. "opencode/beam-free" or short id "beam-free").
     */
    getModel(modelId) {
        if (this.modelsMap.has(modelId)) {
            return this.modelsMap.get(modelId);
        }
        // Try with or without opencode/ prefix
        const prefixed = modelId.startsWith('opencode/') ? modelId : `opencode/${modelId}`;
        if (this.modelsMap.has(prefixed)) {
            return this.modelsMap.get(prefixed);
        }
        const shortId = modelId.replace(/^opencode\//, '');
        for (const [key, value] of this.modelsMap.entries()) {
            if (key.endsWith(`/${shortId}`) || key === shortId) {
                return value;
            }
        }
        return undefined;
    }
    /**
     * Manually triggers a model refresh and emits 'models-updated' if changes occurred.
     */
    async refresh() {
        let rawIds = [];
        try {
            rawIds = await this.client.listModels();
        }
        catch (err) {
            this.emit('error', err);
            throw err;
        }
        if (this.freeOnly) {
            rawIds = rawIds.filter(id => this.client.isFree(id));
        }
        const currentIds = new Set(this.modelsMap.keys());
        const nextIds = new Set(rawIds);
        const added = [];
        const removed = [];
        for (const id of rawIds) {
            if (!currentIds.has(id)) {
                added.push(id);
            }
        }
        for (const id of currentIds) {
            if (!nextIds.has(id)) {
                removed.push(id);
            }
        }
        const hasChanges = added.length > 0 || removed.length > 0 || this.lastSyncTime === 0;
        if (hasChanges) {
            // Rebuild the map preserving order
            const newMap = new Map();
            for (const id of rawIds) {
                newMap.set(id, toModelInfo(id));
            }
            this.modelsMap = newMap;
            this.lastSyncTime = Date.now();
            const event = {
                models: this.getModels(),
                added,
                removed,
                updatedAt: this.lastSyncTime,
            };
            this.emit('models-updated', event);
        }
        return this.getModels();
    }
}
