import React, { useState, useEffect } from "react";
import { FaArrowLeft } from "react-icons/fa"; // Back button icon
import { Sun, Moon } from "lucide-react"; // Theme toggle icons
import styles from "./headerVideo.module.css";

const Header = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Initialize theme based on saved preference or default to light mode
    const savedTheme = localStorage.getItem("theme") || "light";
    setIsDarkMode(savedTheme === "dark");
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = isDarkMode ? "light" : "dark";
    setIsDarkMode(!isDarkMode);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  const handleLogoClick = () => {
    window.location.reload();
  };

  const handleBackClick = () => {
    window.history.back();
  };

  return (
    <header
      className={`${styles.header} ${isDarkMode ? styles.headerDark : ""}`}
    >
      {/* Back Button */}
      <button
        className={`${styles.backButton} ${
          isDarkMode ? styles.backButtonDark : ""
        }`}
        onClick={handleBackClick}
        aria-label="Go back"
      >
        <FaArrowLeft size={20} color={isDarkMode ? "white" : "black"} />
      </button>

      {/* Logo */}
      <div className={styles.logo} onClick={handleLogoClick}>
        <img
          src={isDarkMode ? "/logo_dark.png" : "/logo.png"}
          alt="Topic Trail Logo"
          className={styles.logoImg}
        />
      </div>

      {/* Theme Toggle */}
      <div className={styles.icons}>
        <button
          className={styles.themeToggle}
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </header>
  );
};

export default Header;
