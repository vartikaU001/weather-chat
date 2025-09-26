import React, { useState } from 'react';
import ChatInterface from './components/chatInterface';


function App() {
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className={darkMode ? "app-container dark" : "app-container"}>
      <header className="app-header">
        <h1>Weather Agent Chat</h1>
        <button className="theme-toggle" onClick={() => setDarkMode(!darkMode)}>
          {darkMode ? "Light Mode" : "Dark Mode"}
        </button>
      </header>
      <main className="app-main">
        <ChatInterface />
      </main>
    </div>
  );
}

export default App;
