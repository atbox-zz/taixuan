/**
 * Global Error Boundary Component
 * Catches unhandled runtime exceptions and renders a graceful recovery UI
 * @license Apache-2.0
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-4 shadow-xl text-center">
            <div className="text-3xl text-amber-400">⚠️</div>
            <h2 className="text-lg font-bold font-serif text-slate-100">
              系統運行遇到異常 (Runtime Error)
            </h2>
            <p className="text-xs text-slate-400">
              {this.state.error?.message || '組件渲染發生錯誤，請點擊下方按鈕恢復初始狀態。'}
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              重新加載頁面 (Reload)
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
