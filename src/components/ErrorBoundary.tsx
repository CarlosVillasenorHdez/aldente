'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  label?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Sentry lo captura automáticamente vía instrumentation.ts
    console.error(`[ErrorBoundary: ${this.props.label ?? 'unknown'}]`, error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center p-8 text-center"
          style={{ minHeight: 200 }}>
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-sm font-bold text-gray-700 mb-1">
            Algo salió mal{this.props.label ? ` en ${this.props.label}` : ''}
          </p>
          <p className="text-xs text-gray-400 mb-4 max-w-xs">
            {this.state.error?.message ?? 'Error desconocido'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-white"
            style={{ backgroundColor: '#1B3A6B' }}
          >
            Reintentar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
