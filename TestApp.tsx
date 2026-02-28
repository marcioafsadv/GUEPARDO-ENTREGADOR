import React from 'react';

const TestApp: React.FC = () => {
    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#000',
            color: '#fff',
            fontSize: '24px',
            fontWeight: 'bold'
        }}>
            <div style={{ textAlign: 'center' }}>
                <h1 style={{ color: '#FF6B00', marginBottom: '20px' }}>🚀 TESTE DE RENDERIZAÇÃO</h1>
                <p>Se você está vendo isso, o React está funcionando!</p>
                <p style={{ fontSize: '16px', marginTop: '20px', color: '#888' }}>
                    Timestamp: {new Date().toLocaleString()}
                </p>
            </div>
        </div>
    );
};

export default TestApp;
