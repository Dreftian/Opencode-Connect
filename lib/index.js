import { OpenCodeClient, isFreeModel, findOpenCodeBinary, parseModelList, parseStreamLine } from './opencode-client.js';
import { OpenCodeModelSynchronizer } from './model-sync.js';
import { OpenCodeAdapter, assemblePrompt, extractContentText } from './adapter.js';
export const name = 'dsh-plugin-opencode-connect';
export const inject = ['llm'];
/**
 * Applies the OpenCode Connect plugin to the Cordis context.
 */
export function apply(ctx, config = {}) {
    const client = new OpenCodeClient({
        cliPath: config.cliPath,
        maxRetries: config.maxRetries,
        retryBackoffMs: config.retryBackoffMs,
    });
    const synchronizer = new OpenCodeModelSynchronizer(client, {
        syncIntervalMs: config.syncIntervalMs ?? 30000,
        freeOnly: config.freeOnly ?? false,
        autoStart: false,
    });
    const adapter = new OpenCodeAdapter(client, synchronizer);
    // Register the 'opencode' provider route with the LLM runtime
    const registration = ctx.llm.registerAdapter(['opencode'], adapter);
    // Update catalog / routes when models are updated
    synchronizer.on('models-updated', () => {
        try {
            registration.replace(['opencode']);
        }
        catch {
            // ignore if disposed
        }
        try {
            if (typeof ctx.emit === 'function') {
                ctx.emit('llm/adapters-updated');
            }
        }
        catch {
            // ignore observer errors
        }
    });
    // Cordis effect management: handles activation and clean disposal
    ctx.effect(() => {
        // Perform initial discovery in background
        synchronizer.refresh().catch(err => {
            ctx.logger?.warn?.(`[opencode-connect] Initial model synchronization failed: ${err.message}`);
        });
        // Start background polling
        synchronizer.start();
        return () => {
            synchronizer.stop();
            registration();
        };
    });
}
export { OpenCodeClient, OpenCodeModelSynchronizer, OpenCodeAdapter, isFreeModel, findOpenCodeBinary, parseModelList, parseStreamLine, assemblePrompt, extractContentText, };
