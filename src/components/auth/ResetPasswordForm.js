// src/components/auth/ResetPasswordForm.js
import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import "./AuthForms.css";

const ResetPasswordForm = () => {
  const navigate = useNavigate();
  const { token } = useParams();
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [tokenValid, setTokenValid] = useState(null);
  const [tokenChecking, setTokenChecking] = useState(true);

  useEffect(() => {
    // Sprawdzenie ważności tokena resetowania hasła
    const verifyToken = async () => {
      try {
        const response = await fetch(
          `/api/v1/auth/verify-reset-token/${token}`
        );
        const data = await response.json();

        setTokenValid(response.ok);

        if (!response.ok) {
          setResetError(
            data.message ||
              "Token resetowania hasła jest nieprawidłowy lub wygasł"
          );
        }
      } catch (error) {
        setTokenValid(false);
        setResetError("Nie można zweryfikować tokena resetowania hasła");
      } finally {
        setTokenChecking(false);
      }
    };

    verifyToken();
  }, [token]);

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
    setResetError("");

    try {
      const response = await fetch(`/api/v1/auth/reset-password/${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: formData.password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Błąd resetowania hasła");
      }

      // Przekieruj do strony logowania
      navigate("/login", { state: { passwordResetSuccess: true } });
    } catch (error) {
      setResetError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (tokenChecking) {
    return (
      <div className="auth-form">
        <h2>Weryfikacja tokena</h2>
        <p className="loading-message">
          Sprawdzanie tokena resetowania hasła...
        </p>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="auth-form">
        <h2>Nieprawidłowy token</h2>
        <p className="error-message">{resetError}</p>
        <Link to="/forgot-password" className="back-button">
          Zresetuj hasło ponownie
        </Link>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>Ustaw nowe hasło</h2>

      {resetError && <div className="error-message">{resetError}</div>}

      <div className="form-group">
        <label htmlFor="password">Nowe hasło</label>
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

      <div className="form-group">
        <label htmlFor="confirmPassword">Potwierdź nowe hasło</label>
        <input
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          className={errors.confirmPassword ? "error" : ""}
        />
        {errors.confirmPassword && (
          <div className="error-text">{errors.confirmPassword}</div>
        )}
      </div>

      <button type="submit" className="submit-button" disabled={isLoading}>
        {isLoading ? "Aktualizowanie..." : "Ustaw nowe hasło"}
      </button>

      <div className="auth-redirect">
        <Link to="/login" className="auth-link">
          Powrót do logowania
        </Link>
      </div>
    </form>
  );
};

export default ResetPasswordForm;
