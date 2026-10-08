import type { ComponentType } from 'react';

/**
 * Demo contract: every `src/ds/components/<Name>/<Name>.demo.tsx` exports
 *   export const title = 'Button';
 *   export default function Demo() { ... }
 * The gallery collects them by glob and renders each in a section with
 * data-testid="demo-<Name>" (folder name), used by screenshot tests.
 */
export type DemoModule = {
  title?: string;
  default: ComponentType;
};

export type DemoEntry = { name: string; title: string; Demo: ComponentType };
