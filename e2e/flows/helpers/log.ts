import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export interface LogEntry { type: string; data: Record<string, unknown> }

export interface LogCollector {
  entries: LogEntry[];
  ofType(type: string): LogEntry[];
  /** resolves once an entry of this type (matching `where`) has been posted */
  waitFor(type: string, where?: (data: Record<string, unknown>) => boolean): Promise<LogEntry>;
}

/** records every POST /api/log of this page and answers it, so nothing reaches the server log */
export async function collectLog(page: Page): Promise<LogCollector> {
  const entries: LogEntry[] = [];
  await page.route('**/api/log', async (route) => {
    entries.push(route.request().postDataJSON());
    await route.fulfill({ json: {} });
  });
  const ofType = (type: string) => entries.filter((e) => e.type === type);
  return {
    entries,
    ofType,
    async waitFor(type, where = () => true) {
      await expect.poll(() => ofType(type).some((e) => where(e.data)), { message: `log entry "${type}"` }).toBe(true);
      return ofType(type).find((e) => where(e.data))!;
    },
  };
}
