import React from "react";
import { useLocation } from "react-router-dom";
import LoginForm from "../../components/auth/LoginForm";
import "./AuthPages.css";

const Login = ({ onLogin }) => {
  const location = useLocation();
  const registrationSuccess = location.state?.registrationSuccess;
  const passwordResetSuccess = location.state?.passwordResetSuccess;

  return (
    <div className="auth-page">
      {registrationSuccess && (
        <div className="auth-message success">
          Rejestracja zakończona sukcesem. Możesz się teraz zalogować.
        </div>
      )}

      {passwordResetSuccess && (
        <div className="auth-message success">
          Hasło zostało zresetowane. Możesz się teraz zalogować z nowym hasłem.
        </div>
      )}

      <LoginForm onLogin={onLogin} />
    </div>
  );
};

export default Login;
