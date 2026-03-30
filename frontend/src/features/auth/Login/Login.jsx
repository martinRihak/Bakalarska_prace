import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api/apiService";
import "./Login.css";

// Minimální požadavky na heslo
const PASSWORD_MIN_LENGTH = 8;

const validatePassword = (password) => {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Heslo musí mít alespoň ${PASSWORD_MIN_LENGTH} znaků`;
  }
  if (!/[A-Z]/.test(password)) {
    return "Heslo musí obsahovat alespoň jedno velké písmeno";
  }
  if (!/[0-9]/.test(password)) {
    return "Heslo musí obsahovat alespoň jednu číslici";
  }
  return null;
};

function Login() {
  const navigate = useNavigate();
  const [isLoginForm, setIsLoginForm] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [loginMessage, setLoginMessage] = useState("");
  const [registerMessage, setRegisterMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .checkAuthStatus()
      .then((data) => {
        if (!cancelled && data?.status === "authenticated") {
          navigate("/");
        }
      })
      .catch(() => {
        localStorage.removeItem("token");
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setLoginMessage("Vyplňte prosím všechna pole");
      return;
    }

    setIsLoading(true);
    try {
      const data = await api.login(username, password);
      if (data.status === "success") {
        setLoginMessage(data.message);
        setTimeout(() => navigate("/"), 1000);
      } else {
        setLoginMessage(data.message);
      }
    } catch {
      setLoginMessage("Chyba při přihlašování");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regUsername || !regEmail || !regPassword || !regConfirmPassword) {
      setRegisterMessage("Vyplňte prosím všechna pole");
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegisterMessage("Hesla se neshodují");
      return;
    }

    // Validace síly hesla
    const passwordError = validatePassword(regPassword);
    if (passwordError) {
      setRegisterMessage(passwordError);
      return;
    }

    setIsLoading(true);
    try {
      const data = await api.register(regUsername, regEmail, regPassword);
      if (data.status === "success") {
        setRegisterMessage(data.message);
        setTimeout(() => {
          setIsLoginForm(true);
          setRegisterMessage("");
          setLoginMessage(
            "Registrace proběhla úspěšně, nyní se můžete přihlásit"
          );
        }, 1000);
      } else {
        setRegisterMessage(data.message);
      }
    } catch {
      setRegisterMessage("Chyba při registraci");
    } finally {
      setIsLoading(false);
    }
  };

  // JSX zůstává stejný, jen bez console.log a console.error
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
            <button id="login-button" type="submit" disabled={isLoading}>
              {isLoading ? "Přihlašování..." : "Přihlásit se"}
            </button>
          </form>
          <div className="toggle-form">
            <a
              href="#"
              id="show-register"
              onClick={(e) => {
                e.preventDefault();
                setIsLoginForm(false);
                setLoginMessage("");
                setRegisterMessage("");
              }}
            >
              Nemáte účet? Zaregistrujte se
            </a>
          </div>
          {loginMessage && (
            <div
              id="login-message"
              className={
                loginMessage.includes("úspěšné")
                  ? "success-message"
                  : "error-message"
              }
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
              <small className="password-hint">
                Min. {PASSWORD_MIN_LENGTH} znaků, velké písmeno, číslice
              </small>
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
            <button id="register-button" type="submit" disabled={isLoading}>
              {isLoading ? "Registrace probíhá..." : "Zaregistrovat se"}
            </button>
          </form>
          <div className="toggle-form">
            <a
              href="#"
              id="show-login"
              onClick={(e) => {
                e.preventDefault();
                setIsLoginForm(true);
                setLoginMessage("");
                setRegisterMessage("");
              }}
            >
              Máte již účet? Přihlaste se
            </a>
          </div>
          {registerMessage && (
            <div
              id="register-message"
              className={
                registerMessage.includes("úspěšně")
                  ? "success-message"
                  : "error-message"
              }
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