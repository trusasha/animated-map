export type ThemeMode = 'light' | 'dark' | 'system';

export function applyTheme(mode: ThemeMode, root: HTMLElement = document.documentElement): void {
  root.dataset.theme = mode;
}
