import { test, describe, it } from 'node:test'
import assert from 'node:assert'
import {
  findOpenCodeBinary,
  parseModelList,
  parseStreamLine,
  isFreeModel,
  KNOWN_FREE_MODELS,
  OpenCodeClient,
} from '../lib/opencode-client.js'

describe('OpenCode Client & Utilities', () => {
  describe('findOpenCodeBinary', () => {
    it('returns custom path if exists', () => {
      // Use process.execPath (node.exe) as an existing file test
      const customPath = process.execPath
      const resolved = findOpenCodeBinary(customPath)
      assert.strictEqual(resolved, customPath)
    })

    it('locates opencode binary on the current system or returns fallback', () => {
      const detected = findOpenCodeBinary()
      assert.ok(typeof detected === 'string' && detected.length > 0)
      if (process.platform === 'win32' && process.env.APPDATA) {
        // If installed in %APPDATA%\ai.opencode.desktop, verify it ends with opencode-cli.exe
        if (detected !== 'opencode-cli') {
          assert.ok(detected.toLowerCase().endsWith('opencode-cli.exe'))
        }
      }
    })
  })

  describe('isFreeModel', () => {
    it('identifies all known free models', () => {
      for (const model of KNOWN_FREE_MODELS) {
        assert.strictEqual(isFreeModel(model), true, `Expected ${model} to be free`)
        assert.strictEqual(isFreeModel(`opencode/${model}`), true, `Expected opencode/${model} to be free`)
      }
    })

    it('identifies models ending in -free or containing big-pickle', () => {
      assert.strictEqual(isFreeModel('custom-model-free'), true)
      assert.strictEqual(isFreeModel('opencode/custom-big-pickle'), true)
      assert.strictEqual(isFreeModel('big-pickle'), true)
      assert.strictEqual(isFreeModel('opencode/anything-free'), true)
    })

    it('identifies models under opencode/ provider', () => {
      assert.strictEqual(isFreeModel('opencode/custom-test-model'), true)
    })

    it('identifies non-free models', () => {
      assert.strictEqual(isFreeModel('deepseek/deepseek-flash'), false)
      assert.strictEqual(isFreeModel('deepseek/deepseek-v4-pro'), false)
      assert.strictEqual(isFreeModel('anthropic/claude-3-opus'), false)
      assert.strictEqual(isFreeModel('openai/gpt-4o'), false)
    })
  })

  describe('parseModelList', () => {
    it('parses raw opencode models stdout into model IDs', () => {
      const sampleStdout = `
deepseek/deepseek-flash
deepseek/deepseek-v4-pro
opencode/beam-free
opencode/big-pickle
opencode/deepseek-v4.1-flash-free
opencode/glm-5.3-flash-free
opencode/longcat-2.5-preview-free
opencode/mimo-v2.6-flash-free
opencode/nemotron-3-ultra-free
opencode/nemotron-3.5-lightning-free
opencode/nemotron-3.5-super-vl-free
opencode/space-bunny-free
`
      const parsed = parseModelList(sampleStdout)
      assert.strictEqual(parsed.length, 12)
      assert.ok(parsed.includes('opencode/beam-free'))
      assert.ok(parsed.includes('opencode/big-pickle'))
      assert.ok(parsed.includes('opencode/deepseek-v4.1-flash-free'))
      assert.ok(parsed.includes('opencode/glm-5.3-flash-free'))
      assert.ok(parsed.includes('opencode/longcat-2.5-preview-free'))
      assert.ok(parsed.includes('opencode/mimo-v2.6-flash-free'))
      assert.ok(parsed.includes('opencode/nemotron-3-ultra-free'))
      assert.ok(parsed.includes('opencode/nemotron-3.5-lightning-free'))
      assert.ok(parsed.includes('opencode/nemotron-3.5-super-vl-free'))
      assert.ok(parsed.includes('opencode/space-bunny-free'))
    })

    it('filters out comments, banners, and empty lines', () => {
      const noisyStdout = `
# Available models
> OpenCode Desktop CLI v2.0.32
[INFO] Loading catalog...

opencode/space-bunny-free
opencode/big-pickle

# End of models list
`
      const parsed = parseModelList(noisyStdout)
      assert.deepStrictEqual(parsed, ['opencode/space-bunny-free', 'opencode/big-pickle'])
    })
  })

  describe('parseStreamLine', () => {
    it('parses thinking_delta events', () => {
      const line = JSON.stringify({ type: 'thinking_delta', delta: 'Analyzing query...' })
      const event = parseStreamLine(line)
      assert.ok(event)
      assert.strictEqual(event.type, 'thinking_delta')
      if (event.type === 'thinking_delta') {
        assert.strictEqual(event.text, 'Analyzing query...')
      }
    })

    it('parses reasoning_delta variant', () => {
      const line = JSON.stringify({ type: 'reasoning_delta', text: 'Step 1: Check inputs' })
      const event = parseStreamLine(line)
      assert.ok(event)
      assert.strictEqual(event.type, 'thinking_delta')
      if (event.type === 'thinking_delta') {
        assert.strictEqual(event.text, 'Step 1: Check inputs')
      }
    })

    it('parses text_delta events', () => {
      const line = JSON.stringify({ type: 'text_delta', delta: 'Hello world' })
      const event = parseStreamLine(line)
      assert.ok(event)
      assert.strictEqual(event.type, 'text_delta')
      if (event.type === 'text_delta') {
        assert.strictEqual(event.text, 'Hello world')
      }
    })

    it('parses step_end and step_finish events', () => {
      const lineEnd = JSON.stringify({ type: 'step_end' })
      const eventEnd = parseStreamLine(lineEnd)
      assert.ok(eventEnd)
      assert.strictEqual(eventEnd.type, 'step_end')

      const lineFinish = JSON.stringify({ type: 'step_finish' })
      const eventFinish = parseStreamLine(lineFinish)
      assert.ok(eventFinish)
      assert.strictEqual(eventFinish.type, 'step_end')
    })

    it('parses rate limit error events from OpenCode', () => {
      const line = JSON.stringify({
        type: 'error',
        timestamp: 1792341612648,
        sessionID: 'ses_123',
        error: {
          type: 'provider.quota',
          message: 'Rate limit exceeded. Please try again later.',
          status: 429,
          response: {
            body: '{"type":"error","error":{"type":"FreeUsageLimitError","message":"Rate limit exceeded."}}',
          },
        },
      })

      const event = parseStreamLine(line)
      assert.ok(event)
      assert.strictEqual(event.type, 'error')
      if (event.type === 'error') {
        assert.strictEqual(event.isRateLimit, true)
        assert.strictEqual(event.status, 429)
        assert.strictEqual(event.code, 'RATE_LIMIT_EXCEEDED')
        assert.strictEqual(event.message, 'Rate limit exceeded. Please try again later.')
      }
    })

    it('parses general error events', () => {
      const line = JSON.stringify({
        type: 'error',
        error: {
          message: 'Model not found',
          status: 404,
          code: 'MODEL_NOT_FOUND',
        },
      })

      const event = parseStreamLine(line)
      assert.ok(event)
      assert.strictEqual(event.type, 'error')
      if (event.type === 'error') {
        assert.strictEqual(event.isRateLimit, false)
        assert.strictEqual(event.status, 404)
        assert.strictEqual(event.code, 'MODEL_NOT_FOUND')
        assert.strictEqual(event.message, 'Model not found')
      }
    })

    it('returns null for empty or invalid non-JSON lines', () => {
      assert.strictEqual(parseStreamLine(''), null)
      assert.strictEqual(parseStreamLine('    '), null)
      assert.strictEqual(parseStreamLine('plain text without json'), null)
      assert.strictEqual(parseStreamLine('{broken json:'), null)
    })
  })
})
