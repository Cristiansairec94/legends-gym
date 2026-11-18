type D1Value = null | number | string | ArrayBuffer;

interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  error?: string;
  meta: Record<string, unknown>;
}

interface D1PreparedStatement {
  bind(...values: D1Value[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(columnName?: string): Promise<T | null>;
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  raw<T extends unknown[] = unknown[]>(options?: {
    columnNames?: boolean;
  }): Promise<T[]>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = Record<string, unknown>>(
    statements: D1PreparedStatement[],
  ): Promise<D1Result<T>[]>;
  exec(query: string): Promise<{
    count: number;
    duration: number;
  }>;
  dump(): Promise<ArrayBuffer>;
}

interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

declare module "cloudflare:workers" {
  export function waitUntil(promise: Promise<unknown>): void;
  export const env: {
    DB: D1Database;
    WHATSAPP_ENABLED?: string;
    WHATSAPP_GRAPH_API_VERSION?: string;
    WHATSAPP_API_TOKEN?: string;
    WHATSAPP_PHONE_NUMBER_ID?: string;
    WHATSAPP_WABA_ID?: string;
    WHATSAPP_APP_SECRET?: string;
    WHATSAPP_WEBHOOK_VERIFY_TOKEN?: string;
    WHATSAPP_ADMIN_RECIPIENTS?: string;
    WHATSAPP_GROUPS_ENABLED?: string;
    WHATSAPP_GROUP_IDS?: string;
    WHATSAPP_ALERT_TEMPLATE_NAME?: string;
    WHATSAPP_REMINDER_TEMPLATE_NAME?: string;
    WHATSAPP_DAILY_TEMPLATE_NAME?: string;
    WHATSAPP_TEMPLATE_LANGUAGE?: string;
    WHATSAPP_UTILITY_TTL_SECONDS?: string;
    WHATSAPP_MAX_RETRIES?: string;
    APP_PUBLIC_URL?: string;
    [binding: string]: unknown;
  };
}
