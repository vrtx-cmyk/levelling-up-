import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
  onReset?: () => void;
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
    console.error('[ErrorBoundary] ❌ Uncaught rendering exception:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-4 selection:bg-neutral-900 selection:text-white">
          <div className="max-w-md w-full bg-white rounded-3xl border border-neutral-200/90 shadow-soft p-8 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 text-[#B8860B] flex items-center justify-center border border-amber-200/60 shadow-2xs">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-[#111111]">
              Unable to Load Page
            </h2>
            <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed">
              {this.props.fallbackMessage || 'Could not load payment details. Please refresh.'}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#111111] hover:bg-neutral-800 text-white text-xs sm:text-sm font-semibold transition-colors shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh Page</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
