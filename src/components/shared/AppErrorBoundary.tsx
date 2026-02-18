import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    errorMessage: '',
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unknown runtime error',
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('AppErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleResetAndReload = (): void => {
    try {
      localStorage.removeItem('easyplans-project');
      localStorage.removeItem('easyplans-autosave');
    } catch (err) {
      console.warn('Failed to clear local storage during crash recovery:', err);
    }
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{ background: '#f4f1ec', color: '#2c2c2c', padding: 24 }}
      >
        <div
          style={{
            maxWidth: 620,
            width: '100%',
            background: '#faf8f4',
            border: '1px solid #d5cfc6',
            borderRadius: 12,
            padding: 20,
            boxShadow: '0 10px 24px rgba(0,0,0,0.08)',
          }}
        >
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: '#2d6a4f' }}>
            EasyPlans recovered from a runtime error
          </h1>
          <p style={{ marginBottom: 8, color: '#6b6560' }}>
            La app encontro un error en tiempo de ejecucion.
          </p>
          <p style={{ marginBottom: 16, color: '#6b6560' }}>
            You can reload the page. If the issue repeats, clear saved local data and reload.
          </p>
          <div
            style={{
              fontSize: 12,
              marginBottom: 16,
              padding: '8px 10px',
              background: '#ece8e1',
              borderRadius: 8,
              color: '#5a5550',
              wordBreak: 'break-word',
            }}
          >
            {this.state.errorMessage}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={this.handleReload}
              className="ep-btn-secondary cursor-pointer"
            >
              Reload / Recargar
            </button>
            <button
              type="button"
              onClick={this.handleResetAndReload}
              className="ep-btn-primary cursor-pointer"
            >
              Clear saved data + Reload / Limpiar datos guardados + Recargar
            </button>
          </div>
        </div>
      </div>
    );
  }
}

