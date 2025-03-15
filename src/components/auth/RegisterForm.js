import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./AuthForms.css";

const RegisterForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [registerError, setRegisterError] = useState("");

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
    if (!formData.username)
      newErrors.username = "Nazwa użytkownika jest wymagana";
    if (!formData.email) newErrors.email = "Email jest wymagany";
    else if (!/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = "Podaj poprawny email";

    if (!formData.password) newErrors.password = "Hasło jest wymagane";
    else if (formData.password.length < 8)
      newErrors.password = "Hasło musi mieć co najmniej 8 znaków";

    if (!formData.confirmPassword)
      newErrors.confirmPassword = "Potwierdź hasło";
    else if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = "Hasła nie są identyczne";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setRegisterError("");

    try {
      const response = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Błąd rejestracji");
      }

      // Przekieruj do strony logowania
      navigate("/login", { state: { registrationSuccess: true } });
    } catch (error) {
      setRegisterError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-form-container">
      <h2 className="auth-form-title">Rejestracja</h2>

      {registerError && <div className="error-message">{registerError}</div>}

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">Nazwa użytkownika</label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className={errors.username ? "error" : ""}
            placeholder="Twoja nazwa użytkownika"
          />
          {errors.username && (
            <div className="error-text">{errors.username}</div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={errors.email ? "error" : ""}
            placeholder="Twój adres email"
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
            placeholder="Minimum 8 znaków"
          />
          {errors.password && (
            <div className="error-text">{errors.password}</div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Potwierdź hasło</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            className={errors.confirmPassword ? "error" : ""}
            placeholder="Powtórz hasło"
          />
          {errors.confirmPassword && (
            <div className="error-text">{errors.confirmPassword}</div>
          )}
        </div>

        <button type="submit" className="submit-button" disabled={isLoading}>
          {isLoading ? (
            <span className="loading-indicator"></span>
          ) : (
            "Zarejestruj się"
          )}
        </button>
      </form>

      <div className="auth-redirect">
        Masz już konto?{" "}
        <Link to="/login" className="auth-link">
          Zaloguj się
        </Link>
      </div>
    </div>
  );
};

export default RegisterForm;
