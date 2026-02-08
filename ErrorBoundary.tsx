import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            errorInfo: null
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({
            error,
            errorInfo
        });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    width: '100vw',
                    height: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#000',
                    color: '#fff',
                    padding: '20px'
                }}>
                    <div style={{ maxWidth: '800px', width: '100%' }}>
                        <h1 style={{ color: '#FF6B00', marginBottom: '20px' }}>
                            ⚠️ Erro na Aplicação
                        </h1>
                        <div style={{
                            backgroundColor: '#1a1a1a',
                            padding: '20px',
                            borderRadius: '10px',
                            marginBottom: '20px'
                        }}>
                            <h2 style={{ color: '#ff4444', fontSize: '18px', marginBottom: '10px' }}>
                                {this.state.error?.toString()}
                            </h2>
                            <pre style={{
                                backgroundColor: '#0a0a0a',
                                padding: '15px',
                                borderRadius: '5px',
                                overflow: 'auto',
                                fontSize: '12px',
                                color: '#aaa'
                            }}>
                                {this.state.errorInfo?.componentStack}
                            </pre>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            style={{
                                backgroundColor: '#FF6B00',
                                color: '#fff',
                                padding: '12px 24px',
                                borderRadius: '8px',
                                border: 'none',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            Recarregar Página
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
