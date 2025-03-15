// src/components/auth/ForgotPasswordForm.js
import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./AuthForms.css";

const ForgotPasswordForm = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      setError("Email jest wymagany");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/v1/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Wystąpił błąd");
      }

      setIsSubmitted(true);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="auth-form">
        <h2>Sprawdź swoją skrzynkę</h2>
        <p className="success-message">
          Wysłaliśmy wiadomość z instrukcjami resetowania hasła na adres {email}
          .
        </p>
        <Link to="/login" className="back-button">
          Powrót do logowania
        </Link>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>Resetowanie hasła</h2>
      <p className="form-description">
        Podaj swój adres email, a wyślemy Ci instrukcje resetowania hasła.
      </p>

      {error && <div className="error-message">{error}</div>}

      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError("");
          }}
          className={error ? "error" : ""}
        />
      </div>

      <button type="submit" className="submit-button" disabled={isLoading}>
        {isLoading ? "Wysyłanie..." : "Wyślij instrukcje"}
      </button>

      <div className="auth-redirect">
        <Link to="/login" className="auth-link">
          Powrót do logowania
        </Link>
      </div>
    </form>
  );
};

export default ForgotPasswordForm;
