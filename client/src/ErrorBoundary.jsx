import React from 'react';
import ErrorAlert from './ErrorAlert';
import { logError } from './utils/logger';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    this.setState({ error, info });
    logError(error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="max-w-xl w-full">
            <ErrorAlert message="Something went wrong. Please refresh the page." />
            {this.state.error && (
              <div className="mt-4 text-sm text-gray-500">
                <p className="font-semibold">Debug (only visible in development):</p>
                <pre className="whitespace-pre-wrap">{this.state.error.toString()}</pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
