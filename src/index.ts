/**
 * DeepSeek Harness Plugin: dsh-plugin-opencode-connect
 * Connect and auto-sync OpenCode Desktop free models as LLM providers in DeepSeek Harness.
 */

import type { CordisContext, OpenCodePluginOptions } from './types.js';
import { OpenCodeClient } from './opencode-client.js';
import { OpenCodeModelSynchronizer } from './model-sync.js';
import { OpenCodeAdapter } from './adapter.js';

export * from './types.js';
export * from './opencode-client.js';
export * from './model-sync.js';
export * from './adapter.js';

export const name = 'llm-opencode-connect';
export const inject = ['llm'];

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
 * Instantiates the client, model synchronizer, and registers the OpenCode adapter
 * with DeepSeek Harness LLM runtime.
 */
export function apply(ctx: CordisContext, options: OpenCodePluginOptions = {}): void {
  const config = { ...defaultConfig, ...options };
  const providerPrefix = config.providerPrefix || 'opencode';

  const client = new OpenCodeClient(config.cliPath);
  const synchronizer = new OpenCodeModelSynchronizer(client, config.syncIntervalMs, true);
  const adapter = new OpenCodeAdapter(client, synchronizer, providerPrefix);

  if (config.autoSync) {
    synchronizer.start();
  }

  // Register with DeepSeek Harness LLM service
  if (ctx.llm && typeof ctx.llm.registerAdapter === 'function') {
    ctx.llm.registerAdapter([providerPrefix], adapter);
  }

  // Handle updates and propagate events to Cordis context if available
  synchronizer.on('models-updated', () => {
    if (typeof ctx.emit === 'function') {
      ctx.emit('llm/adapters-updated');
    }
  });

  // Cleanup on context disposal if supported
  if (typeof ctx.on === 'function') {
    ctx.on('dispose', () => {
      synchronizer.stop();
    });
  }
}

export default {
  name,
  inject,
  apply,
};
