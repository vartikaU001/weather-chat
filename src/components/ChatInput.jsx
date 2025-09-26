import React, { useState } from 'react';

function ChatInput({ onSend, disabled }) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (disabled) return;
    const message = input.trim();
    if (!message) return;
    onSend(message);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-input-container">
      <input
        type="text"
        placeholder="Type a message..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />
      <button onClick={handleSend} disabled={disabled}>Send</button>
    </div>
  );
}

export default ChatInput;
