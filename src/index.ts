/**
 * DeepSeek Harness Plugin: dsh-plugin-opencode-connect
 * Connect and auto-sync OpenCode Desktop free models as LLM providers in DeepSeek Harness.
 */

import type { OpenCodePluginOptions, LlmAdapter } from './types.js';

export * from './types.js';

export const name = 'llm-opencode-connect';
export const inject = ['llm'];

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
export const defaultConfig: OpenCodePluginOptions = {
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
export function apply(ctx: PluginContext, options: OpenCodePluginOptions = {}): void {
  const config = { ...defaultConfig, ...options };
  // The adapter implementation will be mounted into ctx.llm by opencode_core_dev
  if (config.logLevel === 'debug') {
    // eslint-disable-next-line no-console
    console.debug(`[dsh-plugin-opencode-connect] Plugin initialized with provider "${config.providerPrefix}"`);
  }
}
