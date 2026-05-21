'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import Link from 'next/link';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-surface flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center">
            <div className="mb-6">
              <svg
                className="mx-auto h-24 w-24 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="font-display text-3xl font-bold text-on-surface mb-4">
              Đã xảy ra lỗi
            </h1>
            <p className="text-on-surface-variant mb-6">
              Rất tiếc, đã có lỗi xảy ra. Vui lòng thử lại sau.
            </p>
            {this.state.error && process.env.NODE_ENV === 'development' && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-left">
                <p className="text-sm text-red-800 dark:text-red-200 font-mono">
                  {this.state.error.toString()}
                </p>
              </div>
            )}
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="px-6 py-3 bg-primary text-on-primary rounded-lg hover:bg-primary/90 transition-colors"
              >
                Tải lại trang
              </button>
              <Link
                href="/"
                className="px-6 py-3 bg-surface-container-high text-on-surface rounded-lg hover:bg-surface-container-highest transition-colors"
              >
                Về trang chủ
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

