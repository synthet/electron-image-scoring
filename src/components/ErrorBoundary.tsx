import React, { type ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error Boundary component to catch unhandled React render errors.
 * Prevents entire app from white-screening.
 */
export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('[ErrorBoundary] Caught error:', error);
        console.error('[ErrorBoundary] Error info:', errorInfo);
    }

    private handleReload = () => {
        // Reset error state and reload the window
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '100vh',
                        backgroundColor: '#1e1e1e',
                        color: '#fff',
                        padding: '20px',
                    }}
                >
                    <div
                        style={{
                            textAlign: 'center',
                            maxWidth: '600px',
                        }}
                    >
                        <h1 style={{ fontSize: '2em', marginBottom: '1em' }}>
                            Something went wrong
                        </h1>
                        <p style={{ fontSize: '1.1em', marginBottom: '2em', opacity: 0.8 }}>
                            The application encountered an unexpected error. Please try reloading.
                        </p>

                        {this.state.error && (
                            <details
                                style={{
                                    textAlign: 'left',
                                    backgroundColor: '#2a2a2a',
                                    padding: '1em',
                                    borderRadius: '4px',
                                    marginBottom: '2em',
                                    cursor: 'pointer',
                                }}
                            >
                                <summary style={{ fontWeight: 'bold', marginBottom: '0.5em' }}>
                                    Error Details
                                </summary>
                                <pre
                                    style={{
                                        overflow: 'auto',
                                        fontSize: '0.85em',
                                        whiteSpace: 'pre-wrap',
                                        wordWrap: 'break-word',
                                    }}
                                >
                                    {this.state.error.toString()}
                                </pre>
                            </details>
                        )}

                        <button
                            onClick={this.handleReload}
                            style={{
                                padding: '12px 24px',
                                fontSize: '1em',
                                backgroundColor: '#4a9eff',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                            }}
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
