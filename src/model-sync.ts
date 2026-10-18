import { EventEmitter } from 'node:events'
import { OpenCodeClient } from './opencode-client.js'
import type { OpenCodeModel } from './types.js'

export interface ModelSyncEvents {
  'models-updated': (models: OpenCodeModel[]) => void
  error: (err: Error) => void
}

export class OpenCodeModelSynchronizer extends EventEmitter {
  private client: OpenCodeClient
  private cachedModels: OpenCodeModel[] = []
  private timer: NodeJS.Timeout | null = null
  private syncIntervalMs: number
  private onlyFreeModels: boolean
  private isSyncing = false

  constructor(client: OpenCodeClient, syncIntervalMs = 30000, onlyFreeModels = true) {
    super()
    this.client = client
    this.syncIntervalMs = syncIntervalMs
    this.onlyFreeModels = onlyFreeModels
  }

  /**
   * Get the latest cached models.
   */
  public getModels(): OpenCodeModel[] {
    return [...this.cachedModels]
  }

  /**
   * Fetch current models from OpenCode and emit 'models-updated' if differences exist.
   */
  public async sync(): Promise<OpenCodeModel[]> {
    if (this.isSyncing) return this.cachedModels
    this.isSyncing = true

    try {
      const freshModels = await this.client.listModels(this.onlyFreeModels)
      const prevIds = new Set(this.cachedModels.map((m) => m.id))
      const freshIds = new Set(freshModels.map((m) => m.id))

      let hasChanged = prevIds.size !== freshIds.size
      if (!hasChanged) {
        for (const id of freshIds) {
          if (!prevIds.has(id)) {
            hasChanged = true
            break
          }
        }
      }

      this.cachedModels = freshModels

      if (hasChanged) {
        this.emit('models-updated', freshModels)
      }

      return freshModels
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      this.emit('error', error)
      return this.cachedModels
    } finally {
      this.isSyncing = false
    }
  }

  /**
   * Start periodic auto-synchronization.
   */
  public start(): void {
    if (this.timer) return
    // Initial sync
    void this.sync()

    if (this.syncIntervalMs > 0) {
      this.timer = setInterval(() => {
        void this.sync()
      }, this.syncIntervalMs)
      this.timer.unref()
    }
  }

  /**
   * Stop periodic auto-synchronization.
   */
  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }
}
