import React, { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          backgroundColor: "#0a0c1a",
          color: "#ffffff",
          fontFamily: "Inter, sans-serif",
          padding: "20px",
          textAlign: "center"
        }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
          <h2 style={{ fontSize: "20px", marginBottom: "8px", fontWeight: 700 }}>
            Terjadi Kesalahan Tampilan
          </h2>
          <p style={{ color: "#8b8fb3", fontSize: "14px", marginBottom: "24px", maxWidth: "400px" }}>
            {this.state.error?.message || "Terjadi kesalahan tak terduga pada komponen editor."}
          </p>
          <button
            onClick={this.handleReload}
            style={{
              padding: "10px 24px",
              backgroundColor: "#6366f1",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "14px",
              boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)"
            }}
          >
            🔄 Muat Ulang Halaman
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
