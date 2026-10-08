import type { DemoEntry, DemoModule } from './types.ts';

const modules = import.meta.glob<DemoModule>('../ds/components/*/*.demo.tsx', { eager: true });

export const demos: DemoEntry[] = Object.entries(modules)
  .map(([path, mod]) => {
    const name = path.split('/').at(-2)!;
    return { name, title: mod.title ?? name, Demo: mod.default };
  })
  .sort((a, b) => a.name.localeCompare(b.name));
