import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-zinc-900 text-white p-4">
                    <div className="text-center max-w-md">
                        <h1 className="text-2xl font-bold mb-4 text-red-500">Ops! Algo deu errado.</h1>
                        <p className="mb-6 text-zinc-400">
                            Ocorreu um erro inesperado na aplicação. Por favor, recarregue a página.
                        </p>
                        <div className="bg-zinc-800 p-4 rounded-lg mb-6 overflow-auto text-left max-h-40 text-xs text-red-400 font-mono">
                            {this.state.error?.toString()}
                        </div>
                        <button
                            className="bg-[#FF6B00] text-white px-6 py-3 rounded-full font-bold hover:brightness-110 transition-all active:scale-95"
                            onClick={() => window.location.reload()}
                        >
                            Recarregar Aplicação
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
