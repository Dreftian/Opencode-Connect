import test from 'node:test'
import assert from 'node:assert/strict'
import { OpenCodeClient } from '../lib/opencode-client.js'
import { OpenCodeModelSynchronizer } from '../lib/model-sync.js'
import { OpenCodeAdapter } from '../lib/adapter.js'

test('OpenCodeClient - parseModelId parses free models correctly', () => {
  const client = new OpenCodeClient()
  
  const m1 = client.parseModelId('opencode/deepseek-v4.1-flash-free')
  assert.equal(m1.id, 'opencode/deepseek-v4.1-flash-free')
  assert.equal(m1.name, 'DeepSeek V4.1 Flash Free')
  assert.equal(m1.provider, 'opencode')
  assert.equal(m1.isFree, true)

  const m2 = client.parseModelId('opencode/big-pickle')
  assert.equal(m2.id, 'opencode/big-pickle')
  assert.equal(m2.name, 'Big Pickle')
  assert.equal(m2.isFree, true)

  const m3 = client.parseModelId('opencode/nemotron-3.5-super-vl-free')
  assert.equal(m3.id, 'opencode/nemotron-3.5-super-vl-free')
  assert.equal(m3.isFree, true)
})

test('OpenCodeClient - findCliPath returns a binary path', () => {
  const client = new OpenCodeClient()
  const p = client.findCliPath()
  assert.ok(typeof p === 'string' && p.length > 0)
})

test('OpenCodeModelSynchronizer - handles model synchronization and change detection', async () => {
  const mockClient = {
    findCliPath: () => 'opencode-cli',
    parseModelId: (id) => ({ id, name: id, provider: 'opencode', isFree: true }),
    listModels: async () => [
      { id: 'opencode/model-a-free', name: 'Model A', provider: 'opencode', isFree: true },
      { id: 'opencode/model-b-free', name: 'Model B', provider: 'opencode', isFree: true },
    ],
  }

  const sync = new OpenCodeModelSynchronizer(mockClient, 0)
  let updated = false
  sync.on('models-updated', (models) => {
    updated = true
    assert.equal(models.length, 2)
  })

  const models = await sync.sync()
  assert.equal(models.length, 2)
  assert.equal(updated, true)
})

test('OpenCodeAdapter - listModels maps OpenCode models into DeepSeek Harness models', async () => {
  const mockClient = {
    findCliPath: () => 'opencode-cli',
    parseModelId: (id) => ({ id, name: id, provider: 'opencode', isFree: true }),
    listModels: async () => [
      { id: 'opencode/deepseek-v4.1-flash-free', name: 'DeepSeek V4.1 Flash Free', provider: 'opencode', isFree: true },
    ],
  }

  const sync = new OpenCodeModelSynchronizer(mockClient, 0)
  const adapter = new OpenCodeAdapter(mockClient, sync, 'opencode')

  const models = await adapter.listModels('opencode')
  assert.equal(models.length, 1)
  assert.equal(models[0].id, 'opencode/deepseek-v4.1-flash-free')
  assert.match(models[0].name, /DeepSeek V4.1 Flash Free/)
  assert.equal(models[0].provider, 'opencode')
})
