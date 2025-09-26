import React from 'react';
import './Loader.css';

function Loader() {
  return (
    <div className="typing-loader">
      <div className="typing-indicator">
        <span className="typing-dot"></span>
        <span className="typing-dot"></span>
        <span className="typing-dot"></span>
      </div>
      <span className="typing-text">Weather agent is typing...</span>
    </div>
  );
}

export default Loader;
