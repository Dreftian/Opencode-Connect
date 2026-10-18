import { test, describe, it } from 'node:test'
import assert from 'node:assert'
import {
  OpenCodeClient,
  OpenCodeModelSynchronizer,
  OpenCodeAdapter,
  assemblePrompt,
  extractContentText,
  apply,
  name,
  inject,
} from '../lib/index.js'

// Mock client for testing without spawning real CLI process
class MockOpenCodeClient extends OpenCodeClient {
  constructor(models = ['opencode/beam-free', 'opencode/space-bunny-free']) {
    super()
    this._models = models
  }

  async listModels() {
    return [...this._models]
  }

  async *runStream(model, prompt, options) {
    yield { type: 'thinking_delta', text: 'Reasoning about prompt...' }
    yield { type: 'text_delta', text: 'Hello, ' }
    yield { type: 'text_delta', text: 'world!' }
    yield { type: 'step_end' }
  }

  async *runStreamWithRetry(model, prompt, options) {
    yield* this.runStream(model, prompt, options)
  }
}

describe('OpenCode Adapter & Model Synchronization', () => {
  describe('assemblePrompt', () => {
    it('passes single user message text directly without role prefix', () => {
      const messages = [{ role: 'user', content: 'What is 2 + 2?' }]
      const prompt = assemblePrompt(messages)
      assert.strictEqual(prompt, 'What is 2 + 2?')
    })

    it('formats multi-turn conversations with role headers', () => {
      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there! How can I help?' },
        { role: 'user', content: 'Explain recursion.' },
      ]
      const prompt = assemblePrompt(messages)
      const expected = 'User: Hello\n\nAssistant: Hi there! How can I help?\n\nUser: Explain recursion.'
      assert.strictEqual(prompt, expected)
    })

    it('prepends top-level system prompt when provided', () => {
      const messages = [{ role: 'user', content: 'Write a poem' }]
      const system = 'You are a poetic assistant.'
      const prompt = assemblePrompt(messages, system)
      assert.strictEqual(prompt, 'System: You are a poetic assistant.\n\nUser: Write a poem')
    })

    it('extracts content blocks from structured messages', () => {
      const messages = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Line 1 of input.' },
            { type: 'text', text: 'Line 2 of input.' },
          ],
        },
      ]
      const prompt = assemblePrompt(messages)
      assert.strictEqual(prompt, 'Line 1 of input.\nLine 2 of input.')
    })
  })

  describe('OpenCodeModelSynchronizer', () => {
    it('synchronizes and caches models from client', async () => {
      const client = new MockOpenCodeClient(['opencode/beam-free', 'opencode/big-pickle', 'deepseek/deepseek-flash'])
      const synchronizer = new OpenCodeModelSynchronizer(client)

      let eventFired = false
      let updatedEvent = null
      synchronizer.on('models-updated', ev => {
        eventFired = true
        updatedEvent = ev
      })

      const models = await synchronizer.refresh()
      assert.strictEqual(models.length, 3)
      assert.strictEqual(eventFired, true)
      assert.ok(updatedEvent)
      assert.strictEqual(updatedEvent.models.length, 3)

      // Test lookup by full ID and short ID
      const beam = synchronizer.getModel('opencode/beam-free')
      assert.ok(beam)
      assert.strictEqual(beam.id, 'opencode/beam-free')
      assert.ok(beam.name.includes('Beam Free'))

      const shortLookup = synchronizer.getModel('big-pickle')
      assert.ok(shortLookup)
      assert.strictEqual(shortLookup.id, 'opencode/big-pickle')
    })

    it('detects model additions and removals between syncs', async () => {
      const client = new MockOpenCodeClient(['opencode/beam-free'])
      const synchronizer = new OpenCodeModelSynchronizer(client)
      await synchronizer.refresh()

      // Mutate client models
      client._models = ['opencode/beam-free', 'opencode/space-bunny-free']

      let updatePayload = null
      synchronizer.on('models-updated', ev => {
        updatePayload = ev
      })

      await synchronizer.refresh()
      assert.ok(updatePayload)
      assert.deepStrictEqual(updatePayload.added, ['opencode/space-bunny-free'])
      assert.deepStrictEqual(updatePayload.removed, [])
      assert.strictEqual(synchronizer.getModels().length, 2)
    })

    it('filters only free models when freeOnly option is enabled', async () => {
      const client = new MockOpenCodeClient(['opencode/beam-free', 'deepseek/deepseek-flash'])
      const synchronizer = new OpenCodeModelSynchronizer(client, { freeOnly: true })
      const models = await synchronizer.refresh()

      assert.strictEqual(models.length, 1)
      assert.strictEqual(models[0].id, 'opencode/beam-free')
    })

    it('starts and stops polling interval without leaking timers', () => {
      const client = new MockOpenCodeClient()
      const synchronizer = new OpenCodeModelSynchronizer(client, { syncIntervalMs: 5000 })
      assert.strictEqual(synchronizer.isActive(), false)

      synchronizer.start()
      assert.strictEqual(synchronizer.isActive(), true)

      synchronizer.stop()
      assert.strictEqual(synchronizer.isActive(), false)
    })
  })

  describe('OpenCodeAdapter', () => {
    it('returns provider info matching DeepSeek Harness specifications', () => {
      const client = new MockOpenCodeClient()
      const synchronizer = new OpenCodeModelSynchronizer(client)
      const adapter = new OpenCodeAdapter(client, synchronizer)

      const info = adapter.providerInfo('opencode')
      assert.deepStrictEqual(info, { id: 'opencode', name: 'OpenCode Desktop' })
    })

    it('resolves model capacity with reasonable contextWindow (131072) and maxTokens (8192)', async () => {
      const client = new MockOpenCodeClient(['opencode/space-bunny-free'])
      const synchronizer = new OpenCodeModelSynchronizer(client)
      await synchronizer.refresh()
      const adapter = new OpenCodeAdapter(client, synchronizer)

      const resolved = await adapter.resolveModel('opencode', 'opencode/space-bunny-free')
      assert.strictEqual(resolved.provider, 'opencode')
      assert.strictEqual(resolved.id, 'opencode/space-bunny-free')
      assert.ok(resolved.context)
      assert.ok(resolved.context.contextWindow >= 32768)
      assert.ok(resolved.defaultMaxTokens >= 4096)
    })

    it('streams mapped StreamChunk events: reasoning-delta, text-delta, and finish', async () => {
      const client = new MockOpenCodeClient()
      const synchronizer = new OpenCodeModelSynchronizer(client)
      const adapter = new OpenCodeAdapter(client, synchronizer)

      const chunks = []
      for await (const chunk of adapter.stream({
        provider: 'opencode',
        model: 'space-bunny-free',
        messages: [{ role: 'user', content: 'Hi' }],
      })) {
        chunks.push(chunk)
      }

      assert.strictEqual(chunks.length, 4)

      // 1. Thinking / reasoning delta
      assert.strictEqual(chunks[0].type, 'reasoning-delta')
      assert.strictEqual(chunks[0].index, 0)
      assert.strictEqual(chunks[0].text, 'Reasoning about prompt...')

      // 2. Text deltas
      assert.strictEqual(chunks[1].type, 'text-delta')
      assert.strictEqual(chunks[1].index, 0)
      assert.strictEqual(chunks[1].text, 'Hello, ')

      assert.strictEqual(chunks[2].type, 'text-delta')
      assert.strictEqual(chunks[2].index, 0)
      assert.strictEqual(chunks[2].text, 'world!')

      // 3. Terminal finish chunk
      assert.strictEqual(chunks[3].type, 'finish')
      assert.strictEqual(chunks[3].reason, 'stop')
    })
  })

  describe('Cordis Plugin Application', () => {
    it('exports standard plugin metadata', () => {
      assert.strictEqual(name, 'dsh-plugin-opencode-connect')
      assert.deepStrictEqual(inject, ['llm'])
    })

    it('registers adapter and manages lifecycle cleanly', () => {
      let registeredProviders = null
      let registeredAdapter = null
      let unregistered = false

      let effectDisposer = null

      const mockCtx = {
        llm: {
          registerAdapter: (providers, adapter) => {
            registeredProviders = providers
            registeredAdapter = adapter
            return () => {
              unregistered = true
            }
          },
        },
        effect: fn => {
          effectDisposer = fn()
        },
        emit: () => {},
        logger: { warn: () => {} },
      }

      apply(mockCtx, { syncIntervalMs: 60000 })

      assert.deepStrictEqual(registeredProviders, ['opencode'])
      assert.ok(registeredAdapter instanceof OpenCodeAdapter)

      // Trigger cleanup
      assert.ok(typeof effectDisposer === 'function')
      effectDisposer()
      assert.strictEqual(unregistered, true)
    })
  })
})
