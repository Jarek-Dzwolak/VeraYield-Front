// src/components/auth/LoginForm.js
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./AuthForms.css";
import "../../assets/img/Logo.jpeg";

const LoginForm = ({ onLogin }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = "Email jest wymagany";
    if (!formData.password) newErrors.password = "Hasło jest wymagane";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setLoginError("");

    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Błąd logowania");
      }

      // Zapisz token w local storage
      localStorage.setItem("token", data.token);

      // Wywołaj funkcję callback po zalogowaniu
      if (onLogin) onLogin(data.user);

      // Przekieruj do dashboardu
      navigate("/");
    } catch (error) {
      setLoginError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>Logowanie</h2>

      {loginError && <div className="error-message">{loginError}</div>}

      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className={errors.email ? "error" : ""}
        />
        {errors.email && <div className="error-text">{errors.email}</div>}
      </div>

      <div className="form-group">
        <label htmlFor="password">Hasło</label>
        <input
          type="password"
          id="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          className={errors.password ? "error" : ""}
        />
        {errors.password && <div className="error-text">{errors.password}</div>}
      </div>

      <div className="form-links">
        <Link to="/forgot-password" className="forgot-password-link">
          Zapomniałeś hasła?
        </Link>
      </div>

      <button type="submit" className="submit-button" disabled={isLoading}>
        {isLoading ? "Logowanie..." : "Zaloguj się"}
      </button>

      <div className="auth-redirect">
        Nie masz konta?{" "}
        <Link to="/register" className="auth-link">
          Zarejestruj się
        </Link>
      </div>
    </form>
  );
};
export default LoginForm;
