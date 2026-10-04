import React, { Component } from "react";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0a0e17",
            color: "#f3f4f6",
            fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif",
            padding: "24px",
            boxSizing: "border-box"
          }}
        >
          <div
            style={{
              maxWidth: "540px",
              width: "100%",
              background: "rgba(22, 27, 34, 0.95)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "16px",
              padding: "36px 32px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
              textAlign: "center"
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "rgba(239, 68, 68, 0.15)",
                color: "#ef4444",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "20px",
                fontSize: "24px"
              }}
            >
              ⚠️
            </div>

            <h1
              style={{
                fontSize: "22px",
                fontWeight: 700,
                margin: "0 0 12px 0",
                color: "#ffffff"
              }}
            >
              Something went wrong in the Studio
            </h1>

            <p
              style={{
                fontSize: "14px",
                color: "#9ca3af",
                lineHeight: "1.6",
                margin: "0 0 24px 0"
              }}
            >
              An unexpected component error occurred. Your local workspace files and data are intact.
            </p>

            {this.state.error?.message && (
              <div
                style={{
                  background: "rgba(0,0,0,0.4)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: "8px",
                  padding: "12px",
                  fontSize: "12px",
                  fontFamily: "monospace",
                  color: "#fca5a5",
                  textAlign: "left",
                  maxHeight: "120px",
                  overflowY: "auto",
                  marginBottom: "24px"
                }}
              >
                {this.state.error.message}
              </div>
            )}

            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                onClick={this.handleReset}
                style={{
                  padding: "10px 20px",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "10px",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                style={{
                  padding: "10px 22px",
                  background: "linear-gradient(135deg, #6c63ff, #8b5cf6)",
                  border: "none",
                  borderRadius: "10px",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(108, 99, 255, 0.4)"
                }}
              >
                Reload Studio
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
