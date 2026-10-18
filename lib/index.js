/**
 * DeepSeek Harness Plugin: dsh-plugin-opencode-connect
 * Connect and auto-sync OpenCode Desktop free models as LLM providers in DeepSeek Harness.
 */
export * from './types.js';
export const name = 'llm-opencode-connect';
export const inject = ['llm'];
/**
 * Default plugin configuration options.
 */
export const defaultConfig = {
    autoSync: true,
    syncIntervalMs: 60000,
    providerPrefix: 'opencode',
    providerDisplayName: 'OpenCode Desktop',
    enableThinking: true,
    timeoutMs: 180000,
    logLevel: 'info',
};
/**
 * Cordis plugin apply method.
 * Registers the OpenCode adapter with DeepSeek Harness LLM runtime.
 */
export function apply(ctx, options = {}) {
    const config = { ...defaultConfig, ...options };
    // The adapter implementation will be mounted into ctx.llm by opencode_core_dev
    if (config.logLevel === 'debug') {
        // eslint-disable-next-line no-console
        console.debug(`[dsh-plugin-opencode-connect] Plugin initialized with provider "${config.providerPrefix}"`);
    }
}
//# sourceMappingURL=index.js.map