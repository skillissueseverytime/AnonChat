'use client';

interface LandingScreenProps {
    onGetStarted: () => void;
}

export default function LandingScreen({ onGetStarted }: LandingScreenProps) {
    return (
        <section className="landing-screen">
            <div className="landing-content">
                <div className="landing-left">
                    <div className="logo-container">
                        <div className="logo-glow"></div>
                        <h1 className="logo">✨</h1>
                    </div>
                    <h2 className="title">Controlled Anonymity</h2>
                    <p className="subtitle">Chat freely. Stay safe. Remain anonymous.</p>

                    <div className="features">
                        <div className="feature">
                            <span className="feature-icon">🛡️</span>
                            <span>No email or phone required</span>
                        </div>
                        <div className="feature">
                            <span className="feature-icon">🎯</span>
                            <span>AI-verified identity</span>
                        </div>
                        <div className="feature">
                            <span className="feature-icon">💭</span>
                            <span>Ephemeral conversations</span>
                        </div>
                    </div>

                    <button className="btn-primary btn-large" onClick={onGetStarted}>
                        <span>Get Started</span>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                    </button>

                    <p className="privacy-note">
                        Your privacy matters. We never store your photos or personal data.
                    </p>
                </div>

                <div className="landing-right">
                    <div className="hero-image-container">
                        <img
                            src="/hero-image.png"
                            alt="Anonymous Chat Illustration"
                            className="hero-image"
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}
