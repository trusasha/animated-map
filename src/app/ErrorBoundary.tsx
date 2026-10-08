import { Component, type ReactNode } from 'react';
import { reportError } from '../features/toasts';

interface Props { fallback?: ReactNode; children: ReactNode }

export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    reportError(error);
  }

  render() {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children;
  }
}
