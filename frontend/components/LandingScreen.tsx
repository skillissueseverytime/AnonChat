'use client';

interface LandingScreenProps {
    onGetStarted: () => void;
}

export default function LandingScreen({ onGetStarted }: LandingScreenProps) {
    return (
        <section className="landing-screen">
            <div className="landing-container">

                <span
                    className="landing-chat-hint"
                    style={{ opacity: 0.7 }}
                >
                    Private, real-time one-to-one chats
                </span>

                <div className="logo-container">
                    <div className="logo-glow"></div>
                    <h1 className="logo">🎭</h1>
                </div>

                <h2 className="title">Controlled Anonymity</h2>

                <p
                    className="subtitle"
                    style={{ fontSize: '1.25rem', marginBottom: '2.5rem' }}
                >
                    Verified users. Anonymous conversations.
                </p>

                <div className="features" style={{ textAlign: 'left' }}>
                    <div className="feature">
                        <span className="feature-icon">🔒</span>
                        <div>
                            <strong style={{ display: 'block' }}>
                                Zero Data Retention
                            </strong>
                            <span
                                style={{
                                    fontSize: '0.9rem',
                                    color: 'var(--text-secondary)',
                                }}
                            >
                                No accounts, no history, no traces.
                            </span>
                        </div>
                    </div>

                    <div className="feature">
                        <span className="feature-icon">🤖</span>
                        <div>
                            <strong style={{ display: 'block' }}>
                                Verified Identities
                            </strong>
                            <span
                                style={{
                                    fontSize: '0.9rem',
                                    color: 'var(--text-secondary)',
                                }}
                            >
                                One-time AI check ensures real people.
                            </span>
                        </div>
                    </div>
                </div>

                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        alignItems: 'center',
                        marginTop: '2rem',
                    }}
                >
                    <button
                        className="btn-primary btn-large btn-full"
                        onClick={onGetStarted}
                    >
                        <span>Get Started Now</span>
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                    </button>

                    <button className="btn-text">
                        Learn how it works
                    </button>
                </div>

                <div className="trust-signals">
                    <span>No accounts</span>
                    <span>No chat history</span>
                    <span>Images deleted instantly</span>
                </div>
            </div>
        </section>
    );
}
