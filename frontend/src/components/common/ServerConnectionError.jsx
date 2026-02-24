import React from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/api/apiService';
import '@css/ServerConnectionError.css';

const ServerConnectionError = () => {
    const navigate = useNavigate();
    
    const handleRetryConnection = async () => {
        try {
            // Zkusíme získat aktuální token
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }

            // Zkontrolujeme připojení k serveru a platnost tokenu
            const authStatus = await api.checkAuthStatus();
            
            if (authStatus.status === 'authenticated') {
                // Připojení obnoveno a token je platný
                navigate('/');
            } else {
                // Token není platný, přesměrujeme na login
                navigate('/login');
            }
        } catch (error) {
            alert('Připojení k serveru se nezdařilo. Prosím zkuste to později.');
        }
    };

    return (
        <div className="server-error-container">
            <div className="server-error-content">
                <h1>Ztráta připojení k serveru</h1>
                <p>Omlouváme se, ale ztratili jsme připojení k serveru.</p>
                <button onClick={handleRetryConnection} className="retry-button">
                    Zkusit znovu připojit
                </button>
            </div>
        </div>
    );
};

export default ServerConnectionError;
