import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import App from './App';
import SplashScreen from './components/SplashScreen';
import { ToastProvider } from './hooks/useToast';
import './index.css';

// Apply dark mode on initial load
const savedDarkMode = localStorage.getItem('darkMode');
if (savedDarkMode === 'true') {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

function Root() {
  const [showSplash, setShowSplash] = useState(true);

  // Hide splash after animation completes
  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  return (
    <React.StrictMode>
      <BrowserRouter>
        <ToastProvider>
          <AnimatePresence mode="wait">
            {showSplash ? (
              <SplashScreen key="splash" onComplete={handleSplashComplete} />
            ) : (
              <App key="app" />
            )}
          </AnimatePresence>
        </ToastProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Root />);
