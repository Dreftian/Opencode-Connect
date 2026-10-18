import { LlmAdapter, type GenerateOptions, type LlmModelInfo, type LlmProviderInfo, type LlmResolvedModelInfo, type StreamChunk } from './types.js'
import { OpenCodeClient } from './opencode-client.js'
import { OpenCodeModelSynchronizer } from './model-sync.js'

export class OpenCodeAdapter extends LlmAdapter {
  private client: OpenCodeClient
  private synchronizer: OpenCodeModelSynchronizer
  private providerId: string

  constructor(client: OpenCodeClient, synchronizer: OpenCodeModelSynchronizer, providerId = 'opencode') {
    super()
    this.client = client
    this.synchronizer = synchronizer
    this.providerId = providerId
  }

  override providerInfo(provider: string): LlmProviderInfo {
    return {
      id: provider,
      name: 'OpenCode Desktop (Free Models)',
    }
  }

  override async listModels(provider: string): Promise<readonly LlmModelInfo[]> {
    let models = this.synchronizer.getModels()
    if (models.length === 0) {
      models = await this.synchronizer.sync()
    }

    return models.map((m) => ({
      provider,
      id: m.id,
      name: `${m.name} [Free]`,
      contextWindow: m.contextWindow ?? 131072,
      maxTokens: m.maxTokens ?? 8192,
      inputModalities: ['text'],
      description: `Free model hosted and accelerated via OpenCode Desktop (${m.id})`,
    }))
  }

  override async resolveModel(
    provider: string,
    model: string,
    _signal?: AbortSignal
  ): Promise<LlmResolvedModelInfo> {
    const models = this.synchronizer.getModels()
    const found = models.find((m) => m.id === model)

    return {
      provider,
      id: model,
      name: found ? `${found.name} [Free]` : model,
      contextWindow: found?.contextWindow ?? 131072,
      maxTokens: found?.maxTokens ?? 8192,
      inputModalities: ['text'],
      context: {
        contextWindow: found?.contextWindow ?? 131072,
        maxTokens: found?.maxTokens ?? 8192,
      },
    }
  }

  /**
   * Format conversation messages into a coherent prompt for OpenCode CLI.
   */
  private formatPrompt(options: GenerateOptions): string {
    const parts: string[] = []

    if (options.system) {
      parts.push(`[System Instructions]\n${options.system.trim()}\n`)
    }

    for (const msg of options.messages) {
      const role = msg.role.toUpperCase()
      let content = ''
      if (typeof msg.content === 'string') {
        content = msg.content
      } else if (Array.isArray(msg.content)) {
        content = msg.content
          .map((c) => (typeof c.text === 'string' ? c.text : JSON.stringify(c)))
          .join('\n')
      }

      if (role === 'SYSTEM' && !options.system) {
        parts.push(`[System Instructions]\n${content.trim()}\n`)
      } else {
        parts.push(`[${role}]: ${content.trim()}`)
      }
    }

    // If single prompt from user, send straightforward text to keep models concise
    if (options.messages.length === 1 && options.messages[0].role === 'user' && !options.system) {
      const msg = options.messages[0]
      return typeof msg.content === 'string' ? msg.content : parts.join('\n\n')
    }

    return parts.join('\n\n')
  }

  override async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    const prompt = this.formatPrompt(options)
    let inReasoning = false
    let inText = false
    let blockIndex = 0

    try {
      for await (const event of this.client.runStream(options.model, prompt, {
        signal: options.signal,
        system: options.system,
      })) {
        if (event.type === 'error' && event.error) {
          throw new Error(`OpenCode Error (${event.error.status || 500}): ${event.error.message || 'Unknown error'}`)
        }

        if (event.type === 'thinking_start') {
          inReasoning = true
          yield { type: 'block-start', index: blockIndex, blockType: 'reasoning' }
        } else if (event.type === 'thinking_delta' && event.delta) {
          yield { type: 'reasoning-delta', index: blockIndex, text: event.delta }
        } else if (event.type === 'thinking_end') {
          if (inReasoning) {
            yield { type: 'block-end', index: blockIndex, block: { type: 'reasoning' } }
            inReasoning = false
            blockIndex++
          }
        } else if (event.type === 'text_start') {
          inText = true
          yield { type: 'block-start', index: blockIndex, blockType: 'text' }
        } else if (event.type === 'text_delta' && event.delta) {
          yield { type: 'text-delta', index: blockIndex, text: event.delta }
        } else if (event.type === 'text_end') {
          if (inText) {
            yield { type: 'block-end', index: blockIndex, block: { type: 'text' } }
            inText = false
            blockIndex++
          }
        } else if (event.type === 'step_end') {
          if (inReasoning) {
            yield { type: 'block-end', index: blockIndex, block: { type: 'reasoning' } }
            inReasoning = false
            blockIndex++
          }
          if (inText) {
            yield { type: 'block-end', index: blockIndex, block: { type: 'text' } }
            inText = false
            blockIndex++
          }
          yield { type: 'finish', reason: 'stop' }
        }
      }
    } catch (err: unknown) {
      if (options.signal?.aborted) {
        yield { type: 'finish', reason: 'aborted' }
        return
      }
      throw err
    }
  }
}
