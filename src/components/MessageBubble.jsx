import React from 'react';

function MessageBubble({ role, content, timestamp, status }) {
  const isUser = role === 'user';
  const statusIcon = {
    sent: '✓',
    received: '✓✓',
    typing: '...',
    error: '⚠️'
  };

  const ts = timestamp instanceof Date ? timestamp : new Date(timestamp);
  const timeStr = isNaN(ts.getTime()) ? '' : ts.toLocaleTimeString();

  return (
    <div className={`message-row ${isUser ? 'user' : 'agent'}`}>
      {!isUser && <div className="avatar">🌤️</div>}
      <div className={`message-bubble ${isUser ? 'user' : 'agent'}`}>
        <div className="message-content">{content}</div>
        <div className="message-meta">
          <span className="message-time">{timeStr}</span>
          {!isUser && <span className="message-status">{statusIcon[status]}</span>}
        </div>
      </div>
      {isUser && <div className="avatar">🙂</div>}
    </div>
  );
}

export default MessageBubble;
