'use client';

import { useState, useEffect } from 'react';

interface QueueScreenProps {
    filter: string;
    onCancel: () => void;
}

export default function QueueScreen({ filter, onCancel }: QueueScreenProps) {
    const [elapsedTime, setElapsedTime] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setElapsedTime(prev => prev + 1);
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getFilterLabel = () => {
        switch (filter) {
            case 'female': return 'women';
            case 'male': return 'men';
            default: return 'anyone';
        }
    };

    return (
        <section className="queue-screen">
            <div className="queue-container">
                <div className="queue-animation">
                    <div className="pulse-ring"></div>
                    <div className="pulse-ring delay-1"></div>
                    <div className="pulse-ring delay-2"></div>
                    <span className="queue-icon">🔮</span>
                </div>

                <h2>Finding your match...</h2>
                <p className="queue-subtitle">Looking for <span>{getFilterLabel()}</span></p>

                <div className="queue-stats">
                    <div className="stat">
                        <span className="stat-value">{formatTime(elapsedTime)}</span>
                        <span className="stat-label">Time in queue</span>
                    </div>
                </div>

                <button className="btn-secondary" onClick={onCancel}>
                    Cancel
                </button>
            </div>
        </section>
    );
}
