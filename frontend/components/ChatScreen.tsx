'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
    content: string;
    type: 'sent' | 'received';
    timestamp: string;
}

interface PartnerData {
    nickname: string;
    device_id?: string;
}

interface ChatScreenProps {
    partner: PartnerData;
    messages: Message[];
    onSendMessage: (content: string) => void;
    onLeave: () => void;
    onNext: () => void;
    onReport: () => void;
}

export default function ChatScreen({ partner, messages, onSendMessage, onLeave, onNext, onReport }: ChatScreenProps) {
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const startTime = useRef(new Date().toLocaleTimeString());

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = () => {
        if (!inputValue.trim()) return;
        onSendMessage(inputValue.trim());
        setInputValue('');
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    };

    return (
        <section className="chat-screen">
            <div className="chat-container">
                <header className="chat-header">
                    <div className="partner-info">
                        <span className="partner-avatar">✨</span>
                        <div>
                            <span className="partner-name">{partner.nickname}</span>
                            <span className="partner-status">Connected</span>
                        </div>
                    </div>
                    <div className="chat-actions">
                        <button className="btn-icon btn-danger" title="Report user" onClick={onReport}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                                <line x1="4" y1="22" x2="4" y2="15" />
                            </svg>
                        </button>
                        <button className="btn-icon" title="Find next match" onClick={onNext}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M23 4v6h-6" />
                                <path d="M1 20v-6h6" />
                                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                            </svg>
                        </button>
                        <button className="btn-icon" title="Leave chat" onClick={onLeave}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                </header>

                <div className="chat-messages">
                    <div className="chat-start-message">
                        <p>You're now chatting with <strong>{partner.nickname}</strong></p>
                        <span className="chat-start-time">{startTime.current}</span>
                    </div>

                    {messages.map((msg, index) => (
                        <div key={index} className={`message ${msg.type}`}>
                            {msg.content}
                            <span className="message-time">{msg.timestamp}</span>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                <div className="chat-input-container">
                    <input
                        type="text"
                        className="message-input"
                        placeholder="Type a message..."
                        maxLength={1000}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                    />
                    <button className="btn-send" onClick={handleSend}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="22" y1="2" x2="11" y2="13" />
                            <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                    </button>
                </div>
            </div>
        </section>
    );
}
