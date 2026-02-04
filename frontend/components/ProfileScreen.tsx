'use client';

import { useState } from 'react';

interface ProfileScreenProps {
    verifiedGender: string;
    onProfileComplete: (nickname: string, bio: string) => void;
    onError: (message: string) => void;
}

export default function ProfileScreen({ verifiedGender, onProfileComplete, onError }: ProfileScreenProps) {
    const [nickname, setNickname] = useState('');
    const [bio, setBio] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!nickname.trim()) {
            onError('Please enter a nickname');
            return;
        }

        setIsSubmitting(true);

        try {
            const deviceId = localStorage.getItem('controlled_anonymity_device_id') || '';

            const response = await fetch('https://anonchat-backend-xmqk.onrender.com/api/auth/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Device-ID': deviceId,
                },
                body: JSON.stringify({
                    nickname: nickname.trim(),
                    bio: bio.trim()
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Profile update failed' }));
                let errorMessage = 'Profile update failed';

                if (typeof errorData.detail === 'string') {
                    errorMessage = errorData.detail;
                } else if (Array.isArray(errorData.detail)) {
                    errorMessage = errorData.detail.map((err: any) => err.msg).join(', ');
                } else if (typeof errorData.detail === 'object') {
                    errorMessage = JSON.stringify(errorData.detail);
                }

                throw new Error(errorMessage);
            }

            onProfileComplete(nickname.trim(), bio.trim());
        } catch (e: any) {
            onError(e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section className="profile-screen">
            <div className="profile-container">
                <div className="verification-badge">
                    <span className="badge-icon">✓</span>
                    <span>Verified as {verifiedGender}</span>
                </div>

                <h2>Create Your Profile</h2>
                <p className="profile-subtitle">Choose how you want to appear in chats</p>

                <form className="profile-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="nickname">Nickname</label>
                        <input
                            type="text"
                            id="nickname"
                            placeholder="Enter a fun nickname"
                            maxLength={50}
                            required
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                        />
                        <span className="char-count"><span>{nickname.length}</span>/50</span>
                    </div>

                    <div className="form-group">
                        <label htmlFor="bio">Short Bio (optional)</label>
                        <textarea
                            id="bio"
                            placeholder="Tell others a bit about yourself..."
                            maxLength={200}
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                        ></textarea>
                        <span className="char-count"><span>{bio.length}</span>/200</span>
                    </div>

                    <button type="submit" className="btn-primary btn-full" disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : 'Continue to Chat'}
                        {!isSubmitting && (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                        )}
                    </button>
                </form>
            </div>
        </section>
    );
}
