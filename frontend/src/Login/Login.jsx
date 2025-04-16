import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../apiService';
import './Login.css';

function Login() {
  const navigate = useNavigate();
  const [isLoginForm, setIsLoginForm] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [loginMessage, setLoginMessage] = useState('');
  const [registerMessage, setRegisterMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Kontrola stavu přihlášení při načtení stránky
  useEffect(() => {
    api.checkAuthStatus()
      .then((data) => {
        if (data?.status === 'authenticated') {
          navigate('/');
        }
      })
      .catch((error) => {
        console.error('Auth check error:', error);
        localStorage.removeItem('token');
      });
  }, [navigate]);

  // Přihlášení
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setLoginMessage('Vyplňte prosím všechna pole');
      return;
    }

    setIsLoading(true);
    try {
      const data = await api.login(username, password);
      setIsLoading(false);

      if (data.status === 'success') {
        setLoginMessage(data.message);
        // Give a small delay to show the success message
        setTimeout(() => {
          navigate('/');
        }, 1000);
      } else {
        setLoginMessage(data.message);
      }
    } catch (error) {
      setIsLoading(false);
      setLoginMessage('Chyba při přihlašování');
      console.error('Login error:', error);
    }
  };

  // Registrace
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regUsername || !regEmail || !regPassword || !regConfirmPassword) {
      setRegisterMessage('Vyplňte prosím všechna pole');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegisterMessage('Hesla se neshodují');
      return;
    }

    setIsLoading(true);
    try {
      const data = await api.register(regUsername, regEmail, regPassword);
      setIsLoading(false);

      if (data.status === 'success') {
        setRegisterMessage(data.message);
        console.log(data.status);
        setTimeout(() => {
          setIsLoginForm(true);
          setRegisterMessage('');
          setLoginMessage('Registrace proběhla úspěšně, nyní se můžete přihlásit');
        }, 1000);
      } else {
        setRegisterMessage(data.message);
      }
    } catch (error) {
      setIsLoading(false);
      setRegisterMessage('Chyba při registraci');
      console.error('Register error:', error);
    }
  };

  return (
    <div className="container">
      {isLoginForm ? (
        <div id="login-form">
          <h1>Přihlášení</h1>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="username">Uživatelské jméno</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Heslo</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button 
              id="login-button" 
              type="submit" 
              disabled={isLoading}
            >
              {isLoading ? 'Přihlašování...' : 'Přihlásit se'}
            </button>
          </form>
          <div className="toggle-form">
            <a
              href="#"
              id="show-register"
              onClick={(e) => {
                e.preventDefault();
                setIsLoginForm(false);
                setLoginMessage('');
                setRegisterMessage('');
              }}
            >
              Nemáte účet? Zaregistrujte se
            </a>
          </div>
          {loginMessage && (
            <div
              id="login-message"
              className={loginMessage.includes('úspěšné') ? 'success-message' : 'error-message'}
            >
              {loginMessage}
            </div>
          )}
        </div>
      ) : (
        <div id="register-form">
          <h1>Registrace</h1>
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label htmlFor="reg-username">Uživatelské jméno</label>
              <input
                type="text"
                id="reg-username"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="reg-email">E-mail</label>
              <input
                type="email"
                id="reg-email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="reg-password">Heslo</label>
              <input
                type="password"
                id="reg-password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="reg-confirm-password">Potvrzení hesla</label>
              <input
                type="password"
                id="reg-confirm-password"
                value={regConfirmPassword}
                onChange={(e) => setRegConfirmPassword(e.target.value)}
                required
              />
            </div>
            <button 
              id="register-button" 
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Registrace probíhá...' : 'Zaregistrovat se'}
            </button>
          </form>
          <div className="toggle-form">
            <a
              href="#"
              id="show-login"
              onClick={(e) => {
                e.preventDefault();
                setIsLoginForm(true);
                setLoginMessage('');
                setRegisterMessage('');
              }}
            >
              Máte již účet? Přihlaste se
            </a>
          </div>
          {registerMessage && (
            <div
              id="register-message"
              className={registerMessage.includes('úspěšně') ? 'success-message' : 'error-message'}
            >
              {registerMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Login;