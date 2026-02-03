'use client';

import { useState, useEffect } from 'react';

interface QueueScreenProps {
    filter: string;
    onCancel: () => void;
}

export default function QueueScreen({ filter, onCancel }: QueueScreenProps) {
    const [elapsedTime, setElapsedTime] = useState(0);
    const [currentTip, setCurrentTip] = useState(0);

    const tips = [
        "Be kind. Real people here.",
        "Anonymous doesn't mean unaccountable.",
        "Say 'Hello' to start things off right.",
        "Respect boundaries.",
        "Reporting bad behavior helps everyone."
    ];

    useEffect(() => {
        const timer = setInterval(() => setElapsedTime(prev => prev + 1), 1000);
        const tipInterval = setInterval(() => {
            setCurrentTip(prev => (prev + 1) % tips.length);
        }, 4000);

        return () => {
            clearInterval(timer);
            clearInterval(tipInterval);
        };
    }, []);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <section className="queue-screen">
            <div className="queue-container">

                <div className="pulse-container">
                    <div className="pulse-circle"></div>
                    <div className="pulse-circle"></div>
                    <div className="pulse-circle"></div>
                    <span
                        style={{
                            fontSize: '2.5rem',
                            zIndex: 10,
                            position: 'relative'
                        }}
                    >
                        ✨
                    </span>
                </div>

                <h2 style={{ marginBottom: '0.5rem' }}>
                    Finding someone to talk to...
                </h2>

                <p className="queue-subtitle" style={{ opacity: 0.7 }}>
                    This usually takes a few seconds.
                </p>

                <div className="queue-stats" style={{ margin: '2rem 0' }}>
                    <div
                        className="stat-value"
                        style={{ fontSize: '1.2rem', fontWeight: 'bold' }}
                    >
                        {formatTime(elapsedTime)}
                    </div>
                </div>

                <div
                    style={{
                        minHeight: '60px',
                        marginBottom: '2rem',
                        color: 'var(--accent-primary)',
                        fontStyle: 'italic',
                        transition: 'opacity 0.5s ease',
                    }}
                >
                    "{tips[currentTip]}"
                </div>

                <button className="btn-secondary" onClick={onCancel}>
                    Cancel Search
                </button>
            </div>
        </section>
    );
}
