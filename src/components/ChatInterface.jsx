import React, { useState, useEffect, useMemo, useRef } from 'react';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import Loader from './Loader';
import { sendMessageStream } from '../utils/api';

function ChatInterface() {
  const [threads, setThreads] = useState(() => {
    const raw = localStorage.getItem('wc_threads');
    return raw ? JSON.parse(raw) : {};
  });
  const [activeId, setActiveId] = useState(() => {
    const raw = localStorage.getItem('wc_active');
    return raw || 'default';
  });
  const rollNumber = 59;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const chatEndRef = useRef(null);
  const abortRef = useRef(null);

  const messages = useMemo(() => threads[activeId]?.messages || [], [threads, activeId]);

  const visibleThreads = useMemo(() => {
    const items = Object.values(threads)
      .filter(t => !(t.isTemporary && !t.messages?.some(m => m.role === 'user')));
    if (!searchQuery.trim()) return items;
    const q = searchQuery.trim().toLowerCase();
    return items.filter(t => {
      const titleMatch = (t.title || '').toLowerCase().includes(q);
      const messageMatch = (t.messages || []).some(m => (m.content || '').toLowerCase().includes(q));
      return titleMatch || messageMatch;
    });
  }, [threads, searchQuery]);

  useEffect(() => {
    localStorage.setItem('wc_threads', JSON.stringify(threads));
  }, [threads]);

  useEffect(() => {
    localStorage.setItem('wc_active', activeId);
  }, [activeId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const ensureThread = (id) => {
    setThreads(prev => {
      const existing = prev[id];
      const welcomeMessage = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        role: 'agent',
        content: '🌤️ Hello! I\'m your weather assistant. How can I help you today?\n\n• Current weather in any city\n• Weather forecasts\n• Temperature conditions\n• Climate information\n\nJust type your question and I\'ll help you get the details!',
        timestamp: new Date().toISOString(),
        status: 'received'
      };

      if (!existing) {
        return { ...prev, [id]: { id, title: '', messages: [welcomeMessage], isTemporary: true } };
      }

      if (!existing.messages || existing.messages.length === 0) {
        return { ...prev, [id]: { ...existing, messages: [welcomeMessage] } };
      }

      return prev;
    });
  };

  useEffect(() => {
    ensureThread(activeId);
  }, []);

  useEffect(() => {
    ensureThread(activeId);
  }, [activeId]);

  const handleNewThread = () => {
    const id = `t_${Date.now()}`;
    const welcomeMessage = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      role: 'agent',
      content: '🌤️ Hello! I\'m your weather assistant. How can I help you today?\n\n• Current weather in any city\n• Weather forecasts\n• Temperature conditions\n• Climate information\n\nJust type your question and I\'ll help you get the details!',
      timestamp: new Date().toISOString(),
      status: 'received'
    };
    setThreads(prev => ({ ...prev, [id]: { id, title: '', messages: [welcomeMessage], isTemporary: true } }));
    setActiveId(id);
  };

  const handleRenameThread = (id, title) => {
    setThreads(prev => ({ ...prev, [id]: { ...prev[id], title } }));
  };

  const setThreadMessages = (id, updater) => {
    setThreads(prev => {
      const current = prev[id] || { id, title: '', messages: [], isTemporary: true };
      const updated = updater(current.messages);
      return { ...prev, [id]: { ...current, messages: updated } };
    });
  };

  const handleSend = async (msg) => {
    if (!msg.trim() || loading) return;
    setError('');

    const userMessage = { id: `${Date.now()}_${Math.random().toString(36).slice(2)}` , role: 'user', content: msg, timestamp: new Date().toISOString(), status: 'sent' };
    setThreadMessages(activeId, (prev) => [...prev, userMessage]);

    const currentThread = threads[activeId];
    if (currentThread && currentThread.isTemporary) {
      const threadTitle = msg.length > 30 ? msg.substring(0, 30) + '...' : msg;
      setThreads(prev => ({
        ...prev,
        [activeId]: { ...prev[activeId], title: threadTitle, isTemporary: false }
      }));
    }

    setLoading(true);
    const typingMessage = { id: `${Date.now()}_${Math.random().toString(36).slice(2)}`, role: 'agent', content: '', timestamp: new Date().toISOString(), status: 'typing' };
    setThreadMessages(activeId, (prev) => [...prev, typingMessage]);

    const controller = new AbortController();
    abortRef.current = controller;

    let content = '';
    try {
      const history = [...messages, userMessage].map(m => ({ role: m.role === 'agent' ? 'assistant' : m.role, content: m.content }));
      await sendMessageStream(history, { threadId: rollNumber, signal: controller.signal }, (chunk) => {
        content += chunk;
        setThreadMessages(activeId, (prev) => prev.map(m =>
          m.id === typingMessage.id ? { ...m, content } : m
        ));
      });
      setThreadMessages(activeId, (prev) => prev.map(m => m.id === typingMessage.id ? { ...m, status: 'received' } : m));
    } catch (e) {
      setError('Failed to fetch response');
      setThreadMessages(activeId, (prev) => prev.map(m => m.id === typingMessage.id ? { ...m, content: 'Error fetching response', status: 'error' } : m));
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const handleClear = () => {
    setThreadMessages(activeId, () => []);
    const welcomeMessage = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      role: 'agent',
      content: '🌤️ Hello! I\'m your weather assistant. How can I help you today?\n\n• Current weather in any city\n• Weather forecasts\n• Temperature conditions\n• Climate information\n\nJust type your question and I\'ll help you get the details!',
      timestamp: new Date().toISOString(),
      status: 'received'
    };
    setThreadMessages(activeId, (prev) => [welcomeMessage]);
  };

  const handleDeleteThread = (threadId, e) => {
    e.stopPropagation();
    if (Object.keys(threads).length <= 1) {
      setThreadMessages(threadId, () => []);
      return;
    }

    setThreads(prev => {
      const newThreads = { ...prev };
      delete newThreads[threadId];
      return newThreads;
    });

    if (activeId === threadId) {
      const remainingThreads = Object.keys(threads).filter(id => id !== threadId);
      if (remainingThreads.length > 0) {
        setActiveId(remainingThreads[0]);
      }
    }
  };

  const exportChat = () => {
    const content = messages.map(m => `${m.role.toUpperCase()} [${new Date(m.timestamp).toLocaleTimeString()}]: ${m.content}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${threads[activeId]?.title || 'chat'}_${activeId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="chat-layout">
      <aside className="chat-sidebar">
        <div className="sidebar-header">
          <button onClick={handleNewThread} className="new-thread-btn">
            <span>+</span> New Chat
          </button>
          <div className="roll-info">
            <span className="roll-label">Thread: {rollNumber}</span>
          </div>
        </div>
        <div className="thread-search">
          <input
            type="text"
            className="thread-search-input"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="thread-search-clear"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        <div className="thread-list">
          {visibleThreads
            .map(t => (
              <div key={t.id} className={`thread-item ${t.id === activeId ? 'active' : ''}`} onClick={() => setActiveId(t.id)}>
                <input
                  className="thread-title"
                  value={t.title}
                  onChange={(e) => handleRenameThread(t.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="thread-actions">
                  <button
                    className="delete-thread-btn"
                    onClick={(e) => handleDeleteThread(t.id, e)}
                    title="Delete thread"
                    aria-label="Delete thread"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
        </div>
      </aside>

      <div className="chat-interface">
        <div className="chat-window">
          {messages.map((msg, idx) => (
            <MessageBubble key={msg.id || idx} role={msg.role} content={msg.content} timestamp={msg.timestamp} status={msg.status} />
          ))}
          {loading && <Loader />}
          <div ref={chatEndRef} />
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="chat-bottom">
          <ChatInput onSend={handleSend} disabled={loading} />
          <div className="chat-actions">
            <button onClick={handleClear}>Clear Chat</button>
            <button onClick={exportChat}>Export Chat</button>
            {loading && <button onClick={() => abortRef.current?.abort()}>Stop</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatInterface;
