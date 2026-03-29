import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = this.state.error?.message || 'An unknown error occurred';
      let isFirestoreError = false;
      
      try {
        const parsed = JSON.parse(errorMessage);
        if (parsed.operationType) {
          isFirestoreError = true;
          errorMessage = `Firestore Error (${parsed.operationType}): ${parsed.error}`;
        }
      } catch (e) {
        // Not a JSON error message
      }

      return (
        <div className="min-h-screen bg-[#020617] text-slate-100 flex items-center justify-center p-4">
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 max-w-2xl w-full">
            <div className="flex items-center gap-4 mb-4 text-red-400">
              <AlertTriangle className="w-8 h-8" />
              <h2 className="text-2xl font-bold">Something went wrong</h2>
            </div>
            <div className="bg-black/30 p-4 rounded-lg overflow-auto">
              <pre className="text-sm text-red-300 whitespace-pre-wrap font-mono">
                {errorMessage}
              </pre>
            </div>
            {isFirestoreError && (
              <p className="mt-4 text-sm text-slate-400">
                This appears to be a database permission issue. Please ensure you are logged in and have the correct permissions.
              </p>
            )}
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-6 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-full text-red-300 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
