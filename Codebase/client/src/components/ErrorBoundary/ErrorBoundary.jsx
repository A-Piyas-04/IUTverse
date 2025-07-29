import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-content">
            <h2>🚫 Oops! Something went wrong</h2>
            <p>We encountered an error while loading the confessions.</p>
            <details className="error-details">
              <summary>Error Details</summary>
              <pre>{this.state.error?.toString()}</pre>
            </details>
            <button
              className="retry-button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
            >
              Reload Page
            </button>
          </div>

          <style>{`
            .error-boundary {
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 400px;
              padding: 20px;
            }
            
            .error-content {
              text-align: center;
              max-width: 500px;
              padding: 40px;
              border: 2px solid #fee;
              border-radius: 12px;
              background: #fef2f2;
            }
            
            .error-content h2 {
              color: #dc2626;
              margin-bottom: 16px;
            }
            
            .error-content p {
              color: #6b7280;
              margin-bottom: 20px;
            }
            
            .error-details {
              text-align: left;
              margin: 16px 0;
              padding: 12px;
              background: #fff;
              border-radius: 6px;
              border: 1px solid #e5e7eb;
            }
            
            .error-details pre {
              font-size: 12px;
              color: #dc2626;
              margin: 0;
              white-space: pre-wrap;
            }
            
            .retry-button {
              background: #dc2626;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 16px;
              font-weight: 600;
            }
            
            .retry-button:hover {
              background: #b91c1c;
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
