/**
 * Type definitions for dsh-plugin-opencode-connect.
 * Conforms to DeepSeek Harness LlmAdapter specifications and OpenCode Desktop integration.
 */

// ============================================================================
// DeepSeek Harness LLM Protocol & Message Types
// ============================================================================

export type ModelModality = 'text' | 'image';

export interface LlmProviderInfo {
  /** Provider route key used by GenerateOptions.provider */
  id: string;
  /** Human-readable provider name for selectors and diagnostics */
  name: string;
}

export interface LlmModelInfo {
  /** Provider route that owns this model entry */
  provider: string;
  /** Model id passed to GenerateOptions.model */
  id: string;
  /** Human-readable model name for selectors */
  name: string;
  /** Optional user-facing description */
  description?: string;
  /** Accepted request modalities; absent means unknown */
  inputModalities?: readonly ModelModality[];
  /** Maximum combined request and response context in tokens */
  contextWindow?: number;
  /** Maximum output tokens */
  maxTokens?: number;
}

export interface LlmModelContext {
  /** Maximum combined request and response context in tokens */
  contextWindow: number;
  /** Maximum output tokens */
  maxTokens?: number;
}

export interface LlmReasoningEffortInfo {
  /** Opaque stable value accepted by GenerateOptions.reasoningEffort */
  id: string;
  /** Human-readable effort name */
  name: string;
  /** Optional description */
  description?: string;
}

export interface LlmModelReasoningInfo {
  /** Supported efforts from least to greatest selectable reasoning effort */
  efforts: readonly LlmReasoningEffortInfo[];
  /** Adapter-configured default materialized into requests when callers omit an effort */
  defaultEffort?: string;
}

export type SystemPromptUpdate = 'in-history';
export type ToolUpdate = 'in-history' | 'addition-only';

export interface LlmResolvedModelInfo extends LlmModelInfo {
  /** Provider-owned context capacity when known */
  context?: LlmModelContext;
  /** Adapter-configured per-request output cap materialized when callers omit one */
  defaultMaxTokens?: number;
  /** Adapter-owned selectable reasoning levels when exposed */
  reasoning?: LlmModelReasoningInfo;
  /** Declared mid-conversation system prompt handling */
  systemPromptUpdate?: SystemPromptUpdate;
  /** Declared mid-conversation tool declaration handling */
  toolUpdate?: ToolUpdate;
}

export interface TextBlock {
  type: 'text';
  text?: string;
  [key: string]: unknown;
}

export interface ReasoningBlock {
  type: 'reasoning';
  text?: string;
  [key: string]: unknown;
}

export interface ImageAttachmentRef {
  id: string;
  mimeType: string;
  bytes: number;
  width?: number;
  height?: number;
  dataUrl?: string;
  path?: string;
}

export interface ImageBlock {
  type: 'image';
  attachment: ImageAttachmentRef;
  offloaded?: true;
}

export interface FileAttachmentRef {
  id: string;
  name: string;
  bytes: number;
  mimeType: string;
  path?: string;
}

export interface FileBlock {
  type: 'file';
  attachment: FileAttachmentRef;
}

export interface ToolCallBlock {
  type: 'tool-call';
  id: string;
  name: string;
  arguments: string;
}

export interface ToolAdditionBlock {
  type: 'tool-addition';
  toolName: string;
  tool?: never;
}

export interface ToolRemovalBlock {
  type: 'tool-removal';
  toolName: string;
}

export type ContentBlock =
  | TextBlock
  | ReasoningBlock
  | ImageBlock
  | FileBlock
  | ToolCallBlock
  | ToolAdditionBlock
  | ToolRemovalBlock
  | { type: string; [key: string]: unknown };

export type ContentBlockType = 'text' | 'reasoning' | 'image' | 'file' | 'tool-call' | 'tool-addition' | 'tool-removal' | string;

export interface LlmFailure {
  readonly message: string;
  readonly code: string;
  readonly status?: number;
  readonly providerRetryAfterMs?: number;
  readonly requestId?: string;
  readonly offloadImages?: number;
}

export type FinishReason =
  | 'stop'
  | 'tool-calls'
  | 'max-tokens'
  | 'aborted'
  | 'error'
  | { kind: 'stop' }
  | { kind: 'tool-calls' }
  | { kind: 'max-tokens' }
  | { kind: 'aborted'; failure?: LlmFailure }
  | { kind: 'error'; failure?: LlmFailure }
  | { kind: string; [key: string]: unknown }
  | string;

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  reasoningTokens?: number;
}

export interface ReplayEnvelope {
  response: unknown;
  blocks?: readonly unknown[];
}

export type StreamChunk =
  | { type: 'block-start'; index: number; blockType: ContentBlockType }
  | { type: 'text-delta'; index: number; text: string }
  | { type: 'reasoning-delta'; index: number; text: string }
  | { type: 'tool-call-delta'; index: number; id: string; name?: string; argumentsDelta: string }
  | { type: 'block-end'; index: number; block: ContentBlock }
  | { type: 'usage'; usage: TokenUsage }
  | {
      type: 'finish';
      reason: FinishReason;
      replayState?: ReplayEnvelope;
    };

export interface ToolSchema {
  deferLoading?: true;
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolHistory {
  readonly tools: readonly ToolSchema[];
  readonly updates: readonly {
    readonly messageId: string;
    readonly additions: readonly ToolSchema[];
  }[];
}

export interface UserMessage {
  readonly role: 'user';
  readonly content: string | readonly ContentBlock[];
  readonly id?: string;
}

export interface AssistantMessage {
  readonly role: 'assistant';
  readonly content: string | readonly ContentBlock[];
  readonly id?: string;
}

export interface SystemMessage {
  readonly role: 'system';
  readonly content: string;
  readonly id?: string;
}

export interface ToolResultMessage {
  readonly role: 'tool';
  readonly tool_call_id: string;
  readonly content: string;
  readonly id?: string;
}

export type Message = UserMessage | AssistantMessage | SystemMessage | ToolResultMessage;

export interface RequestUserInput {
  readonly role: 'user';
  readonly content: string | readonly ContentBlock[];
  readonly id?: never;
  readonly source?: never;
}

export type RequestMessage = Message | RequestUserInput;

export interface GenerateOptions {
  /** Registered provider route selecting the adapter instance */
  provider: string;
  /** Model id to generate with */
  model: string;
  /** Selected reasoning effort if applicable */
  reasoningEffort?: string;
  /** Conversation history */
  messages: RequestMessage[];
  /** Optional top-level system prompt */
  system?: string;
  /** Available tools */
  tools?: ToolSchema[];
  /** Tool update history */
  toolHistory?: ToolHistory;
  /** Sampling temperature */
  temperature?: number;
  /** Maximum generation tokens */
  maxTokens?: number;
  /** Stop strings */
  stop?: string[];
  /** Abort signal */
  signal?: AbortSignal;
  /** Associated session identifier */
  sessionId?: string;
  /** Special generation purpose */
  purpose?: 'compaction' | 'session-title';
}

export interface PreparedAdapterCall {
  readonly model: LlmResolvedModelInfo;
  stream(options: GenerateOptions): AsyncIterable<StreamChunk>;
}

/**
 * Base abstract class for LLM Adapters in DeepSeek Harness.
 */
export abstract class LlmAdapter {
  providerInfo(provider: string): LlmProviderInfo {
    return { id: provider, name: provider };
  }

  listModels(_provider: string): Promise<readonly LlmModelInfo[]> {
    return Promise.resolve([]);
  }

  resolveModel(provider: string, model: string, _signal?: AbortSignal): Promise<LlmResolvedModelInfo> {
    return Promise.resolve({ provider, id: model, name: model });
  }

  async prepareCall(provider: string, model: string, signal?: AbortSignal): Promise<PreparedAdapterCall> {
    return {
      model: await this.resolveModel(provider, model, signal),
      stream: options => this.stream(options),
    };
  }

  abstract stream(options: GenerateOptions): AsyncIterable<StreamChunk>;
}

// ============================================================================
// OpenCode Desktop Model & Protocol Types
// ============================================================================

export interface OpenCodeModel {
  /** Model identifier as reported by OpenCode (e.g. "opencode/mimo-v2.6-flash-free" or "mimo-v2.6-flash-free") */
  id: string;
  /** Human-readable display name */
  name: string;
  /** Provider scope (usually 'opencode' or 'deepseek') */
  provider: string;
  /** Description and intended use */
  description?: string;
  /** Whether this is a free model tier */
  isFree: boolean;
  /** Maximum context window size in tokens */
  contextWindow?: number;
  /** Maximum generation tokens */
  maxTokens?: number;
  /** Whether the model supports native reasoning/thinking streams */
  supportsThinking?: boolean;
  /** Supported input modalities */
  inputModalities?: readonly ModelModality[];
}

/**
 * Standard known OpenCode Desktop free models catalog.
 */
export const OPENCODE_FREE_MODELS: readonly OpenCodeModel[] = Object.freeze([
  {
    id: 'beam-free',
    name: 'Beam Free',
    provider: 'opencode',
    description: 'Fast, lightweight free tier model in OpenCode Desktop',
    isFree: true,
    contextWindow: 32768,
    maxTokens: 4096,
    supportsThinking: false,
    inputModalities: ['text'],
  },
  {
    id: 'big-pickle',
    name: 'Big Pickle',
    provider: 'opencode',
    description: 'Balanced coding and general reasoning free tier model',
    isFree: true,
    contextWindow: 65536,
    maxTokens: 8192,
    supportsThinking: true,
    inputModalities: ['text'],
  },
  {
    id: 'deepseek-v4.1-flash-free',
    name: 'DeepSeek V4.1 Flash Free',
    provider: 'opencode',
    description: 'DeepSeek V4.1 Flash free edition hosted by OpenCode',
    isFree: true,
    contextWindow: 131072,
    maxTokens: 8192,
    supportsThinking: true,
    inputModalities: ['text'],
  },
  {
    id: 'glm-5.3-flash-free',
    name: 'GLM 5.3 Flash Free',
    provider: 'opencode',
    description: 'GLM 5.3 Flash high-throughput reasoning free tier model',
    isFree: true,
    contextWindow: 131072,
    maxTokens: 8192,
    supportsThinking: true,
    inputModalities: ['text'],
  },
  {
    id: 'longcat-2.5-preview-free',
    name: 'LongCat 2.5 Preview Free',
    provider: 'opencode',
    description: 'Long context preview model for deep file search and comprehension',
    isFree: true,
    contextWindow: 262144,
    maxTokens: 8192,
    supportsThinking: false,
    inputModalities: ['text'],
  },
  {
    id: 'mimo-v2.6-flash-free',
    name: 'Mimo V2.6 Flash Free',
    provider: 'opencode',
    description: 'Mimo V2.6 ultra-responsive reasoning free tier model',
    isFree: true,
    contextWindow: 131072,
    maxTokens: 8192,
    supportsThinking: true,
    inputModalities: ['text'],
  },
  {
    id: 'nemotron-3-ultra-free',
    name: 'Nemotron 3 Ultra Free',
    provider: 'opencode',
    description: 'Nemotron 3 high performance reasoning model',
    isFree: true,
    contextWindow: 65536,
    maxTokens: 8192,
    supportsThinking: true,
    inputModalities: ['text'],
  },
  {
    id: 'nemotron-3.5-lightning-free',
    name: 'Nemotron 3.5 Lightning Free',
    provider: 'opencode',
    description: 'Lightning-fast Nemotron 3.5 code generation model',
    isFree: true,
    contextWindow: 65536,
    maxTokens: 8192,
    supportsThinking: false,
    inputModalities: ['text'],
  },
  {
    id: 'nemotron-3.5-super-vl-free',
    name: 'Nemotron 3.5 Super VL Free',
    provider: 'opencode',
    description: 'Vision-language multimodal free model supporting image understanding',
    isFree: true,
    contextWindow: 65536,
    maxTokens: 8192,
    supportsThinking: true,
    inputModalities: ['text', 'image'],
  },
  {
    id: 'space-bunny-free',
    name: 'Space Bunny Free',
    provider: 'opencode',
    description: 'Creative code and architectural reasoning free model',
    isFree: true,
    contextWindow: 65536,
    maxTokens: 8192,
    supportsThinking: true,
    inputModalities: ['text'],
  },
]);

// ============================================================================
// OpenCode CLI NDJSON Streaming Protocol Types
// ============================================================================

export interface OpenCodeNdjsonThinkingDelta {
  type: 'thinking_delta' | 'thinking';
  delta?: string;
  text?: string;
  content?: string;
}

export interface OpenCodeNdjsonTextDelta {
  type: 'text_delta' | 'text' | 'content_block_delta';
  delta?: string;
  text?: string;
  content?: string;
}

export interface OpenCodeNdjsonStepEnd {
  type: 'step_end' | 'finish' | 'message_end';
  finish_reason?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    reasoning_tokens?: number;
  };
}

export interface OpenCodeNdjsonError {
  type: 'error';
  error: {
    message: string;
    code?: string;
    status?: number;
  };
}

export type OpenCodeStreamEvent =
  | OpenCodeNdjsonThinkingDelta
  | OpenCodeNdjsonTextDelta
  | OpenCodeNdjsonStepEnd
  | OpenCodeNdjsonError
  | { type: string; [key: string]: unknown };

// ============================================================================
// Plugin Configuration & Cordis Context Types
// ============================================================================

export interface OpenCodePluginOptions {
  /** Explicit path to opencode or opencode-cli executable. Auto-detected across OS platforms if omitted. */
  cliPath?: string;
  /** Custom server URL if connecting via HTTP API instead of child process CLI */
  serverUrl?: string;
  /** Whether to automatically synchronize models with OpenCode Desktop on startup and intervals */
  autoSync?: boolean;
  /** Periodic polling interval for model discovery in milliseconds (default: 60,000ms / 1 min) */
  syncIntervalMs?: number;
  /** Provider route key prefix registered in DeepSeek Harness (default: 'opencode') */
  providerPrefix?: string;
  /** Human-readable display name for the provider (default: 'OpenCode Desktop') */
  providerDisplayName?: string;
  /** Whether to capture and emit reasoning / thinking deltas. Defaults to true. */
  enableThinking?: boolean;
  /** Maximum execution time per model generation request in milliseconds (default: 180,000ms / 3 min) */
  timeoutMs?: number;
  /** Logging verbosity */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export interface CordisContext {
  llm?: {
    registerAdapter(providers: string[], adapter: LlmAdapter): () => void;
    listProviders?(): readonly LlmProviderInfo[];
    listModels?(provider?: string): Promise<readonly LlmModelInfo[]>;
  };
  on?(event: string, listener: (...args: unknown[]) => void): void;
  emit?(event: string, ...args: unknown[]): void;
  [key: string]: unknown;
}
