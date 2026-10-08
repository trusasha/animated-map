import { Component, type ReactNode } from 'react';
import { reportError } from '../features/toasts';

interface Props { fallback?: ReactNode; children: ReactNode; /** slot name; `?crash=<name>` (DEV or ?e2e) throws inside it */ name?: string }

const crashTarget = (() => {
  const params = new URLSearchParams(location.search);
  return import.meta.env.DEV || params.has('e2e') ? params.get('crash') : null;
})();

function CrashProbe({ name }: { name: string }): null {
  if (crashTarget === name) throw new Error(`slot ${name} crashed`);
  return null;
}

export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    reportError(error);
  }

  render() {
    if (this.state.failed) return this.props.fallback ?? null;
    return <>{this.props.name && <CrashProbe name={this.props.name} />}{this.props.children}</>;
  }
}
