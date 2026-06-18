import React, { createContext, useContext, useState, useEffect } from "react";

export type Theme = "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme: Theme = "light";

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("dark");
    localStorage.setItem("cpms_preferred_theme", "light");
  }, []);

  const toggleTheme = () => {
    // Locked to light mode
  };

  const setTheme = (newTheme: Theme) => {
    // Locked to light mode
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

