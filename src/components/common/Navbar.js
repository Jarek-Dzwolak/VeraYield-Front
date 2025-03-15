import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import "./Navbar.css";

const Navbar = ({ onLogout }) => {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Pobierz dane użytkownika po załadowaniu komponentu
    const fetchUserProfile = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/v1/auth/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          // Jeśli nie udało się pobrać profilu, prawdopodobnie token wygasł
          localStorage.removeItem("token");
          if (onLogout) onLogout();
        }
      } catch (error) {
        console.error("Błąd podczas pobierania profilu:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [onLogout]);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("token");

      if (token) {
        // Wywołaj endpoint wylogowania
        await fetch("/api/v1/auth/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error("Błąd podczas wylogowywania:", error);
    } finally {
      // Zawsze usuń token i wywołaj callback wylogowania
      if (onLogout) onLogout();
    }
  };

  // Sprawdź, czy dana ścieżka jest aktywna
  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="navbar">
      <div className="logo-container">
        <Link to="/">
          <img src="/logo.png" alt="VeraYield" className="logo" />
        </Link>
      </div>

      <div className="navigation">
        <ul>
          <li className={isActive("/") ? "active" : ""}>
            <Link to="/">Dashboard</Link>
          </li>
          <li className={isActive("/playground") ? "active" : ""}>
            <Link to="/playground">Playground</Link>
          </li>
          <li className={isActive("/portfolio") ? "active" : ""}>
            <Link to="/portfolio">Portfolio</Link>
          </li>
          <li className={isActive("/settings") ? "active" : ""}>
            <Link to="/settings">Ustawienia</Link>
          </li>
        </ul>
      </div>

      <div className="user-menu">
        {!isLoading && user && (
          <>
            <div className="user-notification">3</div>
            <div className="user-name">{user.username || "Użytkownik"}</div>
            <button className="logout-button" onClick={handleLogout}>
              <span className="logout-icon">⏻</span>
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
