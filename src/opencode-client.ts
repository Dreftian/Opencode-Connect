import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { spawn } from 'node:child_process'
import { promisify } from 'node:util'

/** Known free tier models provided by OpenCode Desktop */
export const KNOWN_FREE_MODELS: readonly string[] = [
  'beam-free',
  'big-pickle',
  'deepseek-v4.1-flash-free',
  'glm-5.3-flash-free',
  'longcat-2.5-preview-free',
  'mimo-v2.6-flash-free',
  'nemotron-3-ultra-free',
  'nemotron-3.5-lightning-free',
  'nemotron-3.5-super-vl-free',
  'space-bunny-free',
]

const KNOWN_FREE_SET = new Set(KNOWN_FREE_MODELS)

/**
 * Checks whether a given model ID represents a free model in OpenCode Desktop.
 * Matches `*-free`, `big-pickle`, provider `opencode/`, or known free model names.
 */
export function isFreeModel(modelId: string): boolean {
  if (!modelId) return false
  const trimmed = modelId.trim().toLowerCase()
  const baseName = trimmed.includes('/') ? trimmed.split('/').slice(1).join('/') : trimmed

  if (KNOWN_FREE_SET.has(baseName)) return true
  if (baseName.endsWith('-free') || baseName.includes('-free-') || baseName.endsWith('free')) return true
  if (baseName.includes('big-pickle')) return true
  if (trimmed.startsWith('opencode/')) return true

  return false
}

/**
 * Detects the OpenCode binary across Windows, macOS, and Linux.
 */
export function findOpenCodeBinary(customPath?: string): string {
  if (customPath && fs.existsSync(customPath)) {
    return path.resolve(customPath)
  }

  const platform = process.platform

  if (platform === 'win32') {
    // 1. %APPDATA%\ai.opencode.desktop\cli\*\opencode-cli.exe
    const appData = process.env.APPDATA
    if (appData) {
      const cliDir = path.join(appData, 'ai.opencode.desktop', 'cli')
      if (fs.existsSync(cliDir)) {
        try {
          const subdirs = fs.readdirSync(cliDir, { withFileTypes: true })
            .filter(d => d.isDirectory())
            .map(d => d.name)
            .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))

          for (const subdir of subdirs) {
            const candidate = path.join(cliDir, subdir, 'opencode-cli.exe')
            if (fs.existsSync(candidate)) {
              return candidate
            }
          }
        } catch {
          // ignore directory read errors
        }
      }
    }

    // 2. %LOCALAPPDATA%\Programs\@opencodedesktop\resources\opencode-cli.exe
    const localAppData = process.env.LOCALAPPDATA
    if (localAppData) {
      const candidate = path.join(
        localAppData,
        'Programs',
        '@opencodedesktop',
        'resources',
        'opencode-cli.exe'
      )
      if (fs.existsSync(candidate)) {
        return candidate
      }
    }

    // 3. Check PATH for opencode-cli.exe or opencode.exe
    const pathCandidate = searchInPath(['opencode-cli.exe', 'opencode-cli.cmd', 'opencode.exe', 'opencode.cmd'])
    if (pathCandidate) {
      return pathCandidate
    }
  } else if (platform === 'darwin') {
    const home = os.homedir()

    // 1. ~/Library/Application Support/ai.opencode.desktop/cli/*/opencode-cli
    const cliDir = path.join(home, 'Library', 'Application Support', 'ai.opencode.desktop', 'cli')
    if (fs.existsSync(cliDir)) {
      try {
        const subdirs = fs.readdirSync(cliDir, { withFileTypes: true })
          .filter(d => d.isDirectory())
          .map(d => d.name)
          .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))

        for (const subdir of subdirs) {
          const candidate = path.join(cliDir, subdir, 'opencode-cli')
          if (fs.existsSync(candidate)) {
            return candidate
          }
        }
      } catch {
        // ignore
      }
    }

    // 2. /Applications/OpenCode Desktop.app/Contents/Resources/opencode-cli
    const appCandidate = '/Applications/OpenCode Desktop.app/Contents/Resources/opencode-cli'
    if (fs.existsSync(appCandidate)) {
      return appCandidate
    }

    // 3. PATH
    const pathCandidate = searchInPath(['opencode-cli', 'opencode'])
    if (pathCandidate) {
      return pathCandidate
    }
  } else {
    // Linux and other Unix
    const home = os.homedir()

    // 1. ~/.config/ai.opencode.desktop/cli/*/opencode-cli
    const configCliDir = path.join(home, '.config', 'ai.opencode.desktop', 'cli')
    if (fs.existsSync(configCliDir)) {
      try {
        const subdirs = fs.readdirSync(configCliDir, { withFileTypes: true })
          .filter(d => d.isDirectory())
          .map(d => d.name)
          .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))

        for (const subdir of subdirs) {
          const candidate = path.join(configCliDir, subdir, 'opencode-cli')
          if (fs.existsSync(candidate)) {
            return candidate
          }
        }
      } catch {
        // ignore
      }
    }

    // 2. ~/.local/share/ai.opencode.desktop/cli/*/opencode-cli
    const localShareDir = path.join(home, '.local', 'share', 'ai.opencode.desktop', 'cli')
    if (fs.existsSync(localShareDir)) {
      try {
        const subdirs = fs.readdirSync(localShareDir, { withFileTypes: true })
          .filter(d => d.isDirectory())
          .map(d => d.name)
          .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))

        for (const subdir of subdirs) {
          const candidate = path.join(localShareDir, subdir, 'opencode-cli')
          if (fs.existsSync(candidate)) {
            return candidate
          }
        }
      } catch {
        // ignore
      }
    }

    // 3. Standard Linux binaries
    const standardLocations = [
      '/usr/local/bin/opencode-cli',
      '/usr/bin/opencode-cli',
      '/opt/OpenCode Desktop/resources/opencode-cli',
    ]
    for (const loc of standardLocations) {
      if (fs.existsSync(loc)) {
        return loc
      }
    }

    // 4. PATH
    const pathCandidate = searchInPath(['opencode-cli', 'opencode'])
    if (pathCandidate) {
      return pathCandidate
    }
  }

  // Default fallback
  return 'opencode-cli'
}

function searchInPath(executables: string[]): string | null {
  const envPath = process.env.PATH
  if (!envPath) return null

  const dirs = envPath.split(path.delimiter)
  for (const dir of dirs) {
    if (!dir) continue
    for (const exe of executables) {
      const fullPath = path.join(dir, exe)
      try {
        if (fs.existsSync(fullPath)) {
          return fullPath
        }
      } catch {
        // ignore inaccessible directories
      }
    }
  }
  return null
}

/**
 * Parses stdout from `opencode models` into an array of model IDs.
 */
export function parseModelList(stdout: string): string[] {
  return stdout
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => {
      if (!line) return false
      // Filter out shell or info banners
      if (line.startsWith('#') || line.startsWith('>') || line.startsWith('!') || line.startsWith('[')) return false
      if (/^(info|debug|warn|error):/i.test(line)) return false
      return true
    })
}

export type OpenCodeStreamEvent =
  | { type: 'thinking_delta'; text: string; raw?: unknown }
  | { type: 'text_delta'; text: string; raw?: unknown }
  | { type: 'step_start'; raw?: unknown }
  | { type: 'step_end'; raw?: unknown }
  | { type: 'error'; message: string; status?: number; code?: string; isRateLimit: boolean; raw?: unknown }
  | { type: 'other'; raw: unknown }

/**
 * Parses a single JSON line from OpenCode CLI streaming output.
 */
export function parseStreamLine(line: string): OpenCodeStreamEvent | null {
  const trimmed = line.trim()
  if (!trimmed || !trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    return null
  }

  try {
    const data = JSON.parse(trimmed)
    const eventType = data.type || data.event

    if (eventType === 'thinking_delta' || eventType === 'reasoning_delta' || eventType === 'thinking') {
      const text = data.delta ?? data.text ?? data.content ?? data.part?.text ?? ''
      return { type: 'thinking_delta', text, raw: data }
    }

    if (eventType === 'text_delta' || eventType === 'content_delta' || eventType === 'text') {
      const text = data.delta ?? data.text ?? data.content ?? data.part?.text ?? ''
      return { type: 'text_delta', text, raw: data }
    }

    if (eventType === 'step_end' || eventType === 'step_finish' || eventType === 'finish' || eventType === 'done') {
      return { type: 'step_end', raw: data }
    }

    if (eventType === 'step_start') {
      return { type: 'step_start', raw: data }
    }

    if (eventType === 'error') {
      const errObj = data.error || data
      const message = typeof errObj === 'string'
        ? errObj
        : (errObj.message || errObj.error?.message || errObj.type || 'OpenCode execution error')
      const status = typeof errObj.status === 'number' ? errObj.status : undefined
      const isRateLimit = status === 429
        || /rate.?limit/i.test(message)
        || /FreeUsageLimitError/i.test(message)
        || errObj.type === 'provider.quota'
        || /quota/i.test(message)

      return {
        type: 'error',
        message,
        status,
        code: isRateLimit ? 'RATE_LIMIT_EXCEEDED' : (errObj.code || 'OPENCODE_ERROR'),
        isRateLimit,
        raw: data,
      }
    }

    return { type: 'other', raw: data }
  } catch {
    return null
  }
}

export interface RunStreamOptions {
  signal?: AbortSignal
  system?: string
  maxRetries?: number
  retryBackoffMs?: number
}

export interface OpenCodeClientOptions {
  cliPath?: string
  maxRetries?: number
  retryBackoffMs?: number
}

export class OpenCodeClient {
  private resolvedPath: string
  private maxRetries: number
  private retryBackoffMs: number

  constructor(options: OpenCodeClientOptions = {}) {
    this.resolvedPath = findOpenCodeBinary(options.cliPath)
    this.maxRetries = options.maxRetries ?? 3
    this.retryBackoffMs = options.retryBackoffMs ?? 1500
  }

  /** Gets the detected or configured binary path */
  getBinaryPath(): string {
    return this.resolvedPath
  }

  /**
   * Executes `opencode models` and returns all model identifiers.
   */
  async listModels(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const proc = spawn(this.resolvedPath, ['models'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      })

      let stdout = ''
      let stderr = ''

      proc.stdout.on('data', chunk => {
        stdout += chunk.toString('utf8')
      })

      proc.stderr.on('data', chunk => {
        stderr += chunk.toString('utf8')
      })

      proc.on('error', err => {
        reject(new Error(`Failed to execute OpenCode binary "${this.resolvedPath}": ${err.message}`))
      })

      proc.on('close', code => {
        if (code !== 0 && !stdout.trim()) {
          reject(new Error(`OpenCode models command failed with code ${code}: ${stderr}`))
          return
        }
        resolve(parseModelList(stdout))
      })
    })
  }

  /**
   * Checks if a model is categorized as free.
   */
  isFree(modelId: string): boolean {
    return isFreeModel(modelId)
  }

  /**
   * Spawns `opencode run -m <model> --format json <prompt>` and streams typed events.
   */
  async *runStream(
    model: string,
    prompt: string,
    options?: RunStreamOptions
  ): AsyncIterable<OpenCodeStreamEvent> {
    const fullPrompt = options?.system ? `${options.system}\n\n${prompt}` : prompt
    const args = ['run', '-m', model, '--format', 'json', fullPrompt]

    const proc = spawn(this.resolvedPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      signal: options?.signal,
      windowsHide: true,
    })

    const onAbort = () => {
      try {
        proc.kill('SIGTERM')
      } catch {
        // ignore kill error
      }
    }

    if (options?.signal) {
      if (options.signal.aborted) {
        onAbort()
        throw new Error('Operation aborted')
      }
      options.signal.addEventListener('abort', onAbort, { once: true })
    }

    let buffer = ''
    let stderr = ''

    // Asynchronous queue to bridge event streams to generator
    type QueueItem =
      | { type: 'event'; event: OpenCodeStreamEvent }
      | { type: 'error'; error: Error }
      | { type: 'end' }

    const queue: QueueItem[] = []
    let notifyResolver: (() => void) | null = null

    const pushItem = (item: QueueItem) => {
      queue.push(item)
      if (notifyResolver) {
        const resolve = notifyResolver
        notifyResolver = null
        resolve()
      }
    }

    proc.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf8')
      const lines = buffer.split(/\r?\n/)
      // Keep the last partial line in buffer
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const event = parseStreamLine(line)
        if (event) {
          pushItem({ type: 'event', event })
        }
      }
    })

    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8')
    })

    proc.on('error', err => {
      pushItem({ type: 'error', error: err })
    })

    proc.on('close', code => {
      if (buffer.trim()) {
        const event = parseStreamLine(buffer)
        if (event) {
          pushItem({ type: 'event', event })
        }
      }
      if (code !== 0 && queue.length === 0) {
        pushItem({
          type: 'event',
          event: {
            type: 'error',
            message: stderr.trim() || `OpenCode run failed with exit code ${code}`,
            status: code ?? undefined,
            isRateLimit: /rate.?limit/i.test(stderr) || /quota/i.test(stderr),
          },
        })
      }
      pushItem({ type: 'end' })
    })

    try {
      while (true) {
        if (queue.length === 0) {
          await new Promise<void>(resolve => {
            notifyResolver = resolve
          })
        }

        const item = queue.shift()
        if (!item) continue

        if (item.type === 'error') {
          throw item.error
        }
        if (item.type === 'end') {
          break
        }
        yield item.event
      }
    } finally {
      if (options?.signal) {
        options.signal.removeEventListener('abort', onAbort)
      }
      try {
        if (!proc.killed) {
          proc.kill()
        }
      } catch {
        // ignore
      }
    }
  }

  /**
   * Streams model output with automatic rate limit backoff and retry.
   */
  async *runStreamWithRetry(
    model: string,
    prompt: string,
    options?: RunStreamOptions
  ): AsyncIterable<OpenCodeStreamEvent> {
    const maxRetries = options?.maxRetries ?? this.maxRetries
    const initialBackoff = options?.retryBackoffMs ?? this.retryBackoffMs

    let attempts = 0
    while (true) {
      attempts++
      let rateLimited = false
      let rateLimitError: OpenCodeStreamEvent | null = null
      let receivedAnyOutput = false

      try {
        for await (const event of this.runStream(model, prompt, options)) {
          if (event.type === 'error' && event.isRateLimit) {
            rateLimited = true
            rateLimitError = event
            break
          }

          if (event.type === 'text_delta' || event.type === 'thinking_delta') {
            receivedAnyOutput = true
          }

          yield event
        }
      } catch (err: any) {
        if (options?.signal?.aborted) {
          throw err
        }
        if (/rate.?limit/i.test(err?.message || '') && attempts <= maxRetries && !receivedAnyOutput) {
          rateLimited = true
        } else {
          throw err
        }
      }

      if (rateLimited && attempts <= maxRetries && !receivedAnyOutput) {
        const backoffMs = initialBackoff * Math.pow(2, attempts - 1)
        await delay(backoffMs, options?.signal)
        continue
      }

      if (rateLimited && rateLimitError) {
        yield rateLimitError
      }

      break
    }
  }
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(new Error('Aborted during retry backoff'))
    }
    const timer = setTimeout(() => {
      resolve()
    }, ms)

    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(timer)
        reject(new Error('Aborted during retry backoff'))
      }, { once: true })
    }
  })
}
