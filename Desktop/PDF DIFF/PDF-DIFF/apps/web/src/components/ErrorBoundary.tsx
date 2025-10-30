import React, { Component } from 'react';
export class ErrorBoundary extends Component<{ children: React.ReactNode; fallback?: React.ReactNode; }, { hasError: boolean; error?: Error }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) { console.error('Error caught:', error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
              <p className="text-gray-600 mb-6">{this.state.error?.message || 'An unexpected error occurred'}</p>
              <button onClick={() => window.location.href = '/'} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Go Home</button>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
