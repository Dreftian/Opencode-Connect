declare module '@deepseek-ai/cordis' {
  export interface Context {
    llm?: any;
    on?(event: string, listener: (...args: any[]) => void): void;
    emit?(event: string, ...args: any[]): void;
    [key: string]: any;
  }
}
