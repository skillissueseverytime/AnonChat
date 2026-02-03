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
    const [isTyping, setIsTyping] = useState(false); // Simulate partner typing for UX
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const startTime = useRef(new Date().toLocaleTimeString());

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Simple simulation of "Stranger is typing" when a message is received
    // In a real app, this would be triggered by a WebSocket event
    useEffect(() => {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.type === 'received') {
            setIsTyping(false);
        }
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="partner-name">{partner.nickname}</span>
                                <span className="chat-badge">Verified</span>
                            </div>
                            <span className="partner-status" style={{ color: 'var(--success)', fontSize: '0.75rem' }}>● Online</span>
                        </div>
                    </div>
                    <div className="chat-actions">
                        <button className="btn-icon" title="Find next match" onClick={onNext}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M23 4v6h-6" />
                                <path d="M1 20v-6h6" />
                                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                            </svg>
                        </button>


                        <button className="btn-icon btn-report" title="Report User" onClick={onReport}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                        </button>


                        <button className="btn-icon btn-exit" title="Exit Chat" onClick={onLeave}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M13 16l5-4-5-4M18 12H9" />
                                <path d="M13 4h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" />
                            </svg>
                        </button>
                    </div>
                </header>

                <div className="chat-messages">
                    <div className="chat-start-message">
                        <p>You're now chatting with <strong>{partner.nickname}</strong></p>
                        <span className="chat-start-time">{startTime.current}</span>
                    </div>

                    {messages.length === 0 && (
                        <div className="chat-welcome-message">
                            <p>You're now connected. Say hi 👋</p>
                        </div>
                    )}

                    {messages.map((msg, index) => {
                        // Logic to only show timestamp if it's the first message or a significant gap
                        // For simplicity in this demo, we'll show it for the very first message and then intermittently
                        const showTime = index === 0 || index % 5 === 0;

                        return (
                            <div key={index}
                                className="message-slide-in"
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: msg.type === 'sent' ? 'flex-end' : 'flex-start',
                                    marginBottom: '1rem'
                                }}>
                                <div className={`chat-bubble ${msg.type}`}>
                                    {msg.content}
                                </div>
                                {showTime && (
                                    <div className="message-time" style={{
                                        fontSize: '0.65rem',
                                        opacity: 0.4,
                                        marginTop: '4px',
                                        marginRight: msg.type === 'sent' ? '8px' : '0',
                                        marginLeft: msg.type === 'received' ? '8px' : '0',
                                    }}>
                                        {msg.timestamp}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {isTyping && (
                        <div className="typing-container" style={{ marginBottom: '1rem' }}>
                            <div className="typing-indicator">
                                <div className="typing-dot"></div>
                                <div className="typing-dot"></div>
                                <div className="typing-dot"></div>
                            </div>
                            <span className="typing-text">Stranger is typing...</span>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="chat-input-container">
                    <input
                        type="text"
                        className="message-input"
                        placeholder="Say something respectful..."
                        maxLength={1000}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                    />
                    <button
                        className={`btn-send ${inputValue.trim() ? 'btn-send-pulse' : ''}`}
                        onClick={handleSend}
                        disabled={!inputValue.trim()}
                    >
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
