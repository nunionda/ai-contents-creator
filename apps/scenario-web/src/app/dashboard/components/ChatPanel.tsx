'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import './ChatPanel.css';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ChatPanelProps {
  scriptId: string;
  locale: 'en' | 'ko';
  strategy?: string;
}

export default function ChatPanel({ scriptId, locale, strategy }: ChatPanelProps) {
  // State
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedFollowUps, setSuggestedFollowUps] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const ko = locale === 'ko';

  // Default starter questions
  const starterQuestions = ko
    ? ['이 시나리오의 가장 큰 강점은?', '주인공의 캐릭터 아크를 분석해줘', '흥행 가능성을 높이려면?']
    : ['What are the key strengths?', 'Analyze the protagonist arc', 'How to improve box office potential?'];

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  async function sendMessage(text: string) {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: text.trim(), timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSuggestedFollowUps([]);
    setIsLoading(true);

    try {
      const res = await fetch('http://localhost:4005/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptId,
          message: text.trim(),
          history: [...messages, userMsg].slice(-10),
          strategy: strategy || 'auto',
          market: ko ? 'korean' : 'hollywood',
        }),
      });

      if (!res.ok) {
        throw new Error(`Chat failed (${res.status})`);
      }

      const data = await res.json();
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: data.reply,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, assistantMsg]);
      if (data.suggestedFollowUps?.length > 0) {
        setSuggestedFollowUps(data.suggestedFollowUps);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: ko ? `오류가 발생했습니다: ${err.message}` : `Error: ${err.message}`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  // Floating button when closed
  if (!isOpen) {
    return (
      <button
        className="chat-fab no-print"
        onClick={() => setIsOpen(true)}
        aria-label={ko ? 'AI 채팅 열기' : 'Open AI Chat'}
        title={ko ? 'AI에게 질문하기' : 'Ask AI about this screenplay'}
      >
        <MessageCircle size={24} />
      </button>
    );
  }

  return (
    <div className="chat-panel no-print">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-info">
          <MessageCircle size={18} />
          <span>{ko ? 'AI 스크립트 어시스턴트' : 'AI Script Assistant'}</span>
        </div>
        <button className="chat-close" onClick={() => setIsOpen(false)} aria-label="Close">
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p className="chat-empty-text">
              {ko ? '분석 결과에 대해 질문해보세요' : 'Ask questions about the analysis'}
            </p>
            <div className="chat-starters">
              {starterQuestions.map((q, i) => (
                <button key={i} className="chat-starter-chip" onClick={() => sendMessage(q)}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`chat-message chat-message-${msg.role}`}>
            <div className="chat-bubble">
              {msg.content.split('\n').map((line, j) => (
                <React.Fragment key={j}>
                  {line}
                  {j < msg.content.split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="chat-message chat-message-assistant">
            <div className="chat-bubble chat-loading">
              <Loader2 size={16} className="spin-icon" />
              <span>{ko ? '분석 중...' : 'Thinking...'}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Follow-up suggestions */}
      {suggestedFollowUps.length > 0 && !isLoading && (
        <div className="chat-followups">
          {suggestedFollowUps.map((q, i) => (
            <button key={i} className="chat-followup-chip" onClick={() => sendMessage(q)}>
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="chat-input-bar">
        <input
          ref={inputRef}
          type="text"
          className="chat-input"
          placeholder={ko ? '질문을 입력하세요...' : 'Ask about the screenplay...'}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
        <button
          className="chat-send"
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isLoading}
          aria-label="Send"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
