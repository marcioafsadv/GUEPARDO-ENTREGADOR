import React, { useState, useEffect } from 'react';
import App from './App';
import OnboardingDemo from './OnboardingDemo';
import * as supabaseClient from './supabase';

const MainApp: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Verificar se há sessão ativa ao carregar
    useEffect(() => {
        const checkSession = async () => {
            try {
                const session = await supabaseClient.getSession();
                if (session?.user) {
                    setIsAuthenticated(true);
                    setUserId(session.user.id);
                }
            } catch (error) {
                console.error('Error checking session:', error);
            } finally {
                setIsLoading(false);
            }
        };

        checkSession();
    }, []);

    const handleLoginSuccess = (id: string) => {
        setUserId(id);
        setIsAuthenticated(true);
    };

    const handleLogout = async () => {
        try {
            await supabaseClient.signOut();
            setIsAuthenticated(false);
            setUserId(null);
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="text-center">
                    <i className="fas fa-circle-notch fa-spin text-4xl text-yellow-500 mb-4"></i>
                    <p className="text-white font-bold">Carregando...</p>
                </div>
            </div>
        );
    }

    // Se autenticado, mostra o App principal
    if (isAuthenticated && userId) {
        return <App userId={userId} onLogout={handleLogout} />;
    }

    // Se não autenticado, mostra o fluxo de login/cadastro
    return <OnboardingDemo onLoginSuccess={handleLoginSuccess} />;
};

export default MainApp;
