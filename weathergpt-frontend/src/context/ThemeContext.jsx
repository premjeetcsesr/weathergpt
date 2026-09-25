import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme] = useState('dark');

  useEffect(() => {
    const root = document.documentElement;
    localStorage.setItem('weathergpt_theme', 'dark');
    root.classList.add('dark');
    root.classList.remove('light');
  }, []);

  // Permanent dark theme: light mode disabled as requested
  const toggleTheme = () => {};
  const setTheme = () => {};

  return (
    <ThemeContext.Provider value={{ theme: 'dark', setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
