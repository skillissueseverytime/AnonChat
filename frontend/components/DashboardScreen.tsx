'use client';

import { useState } from 'react';

interface UserData {
    nickname: string;
    karma_score: number;
    daily_matches_remaining: number;
}

interface DashboardScreenProps {
    userData: UserData;
    onFindMatch: (filter: string) => void;
    isLoading: boolean;
}

export default function DashboardScreen({ userData, onFindMatch, isLoading }: DashboardScreenProps) {
    const [selectedFilter, setSelectedFilter] = useState('any');

    const handleFilterClick = (filter: string) => {
        setSelectedFilter(filter);
    };

    const handleFindMatch = () => {
        onFindMatch(selectedFilter);
    };

    return (
        <section className="dashboard-screen">
            <div className="dashboard-container">
                <header className="dashboard-header">
                    <div className="user-info">
                        <span className="user-avatar">✨</span>
                        <div>
                            <span className="user-name">{userData.nickname || 'Anonymous'}</span>
                            <div className="karma-badge">
                                <span className="karma-icon">💫</span>
                                <span>{userData.karma_score}</span> Karma
                            </div>
                        </div>
                    </div>
                    <button className="btn-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                        </svg>
                    </button>
                </header>

                <div className="match-section">
                    <h3>Find a Chat Partner</h3>
                    <p className="match-subtitle">Select who you'd like to talk to</p>

                    <div className="filter-options">
                        <button
                            className={`filter-btn ${selectedFilter === 'any' ? 'active' : ''}`}
                            onClick={() => handleFilterClick('any')}
                        >
                            <span className="filter-icon">🌟</span>
                            <span>Anyone</span>
                        </button>
                        <button
                            className={`filter-btn ${selectedFilter === 'female' ? 'active' : ''}`}
                            onClick={() => handleFilterClick('female')}
                        >
                            <span className="filter-icon">🌸</span>
                            <span>Women</span>
                        </button>
                        <button
                            className={`filter-btn ${selectedFilter === 'male' ? 'active' : ''}`}
                            onClick={() => handleFilterClick('male')}
                        >
                            <span className="filter-icon">🔷</span>
                            <span>Men</span>
                        </button>
                    </div>

                    <div className="daily-limit">
                        <span className="limit-icon">🎁</span>
                        <span>Specific filters: <strong>{userData.daily_matches_remaining}</strong>/5 remaining today</span>
                    </div>

                    <button className="btn-primary btn-large" onClick={handleFindMatch} disabled={isLoading}>
                        {isLoading ? (
                            <div className="btn-loader"></div>
                        ) : (
                            <span className="btn-text">Find Match</span>
                        )}
                    </button>
                </div>

                <div className="tips-section">
                    <h4>⚡ Tips for great conversations</h4>
                    <ul>
                        <li>Be respectful and kind</li>
                        <li>Keep conversations appropriate</li>
                        <li>Report any inappropriate behavior</li>
                    </ul>
                </div>
            </div>
        </section>
    );
}
