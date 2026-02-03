'use client';

import { useEffect, useRef, useState } from 'react';

interface VerificationScreenProps {
    onBack: () => void;
    onVerified: (gender: string) => void;
    onError: (message: string) => void;
}

export default function VerificationScreen({ onBack, onVerified, onError }: VerificationScreenProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const [cameraReady, setCameraReady] = useState(false);
    const [cameraError, setCameraError] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);

    useEffect(() => {
        startCamera();
        return () => {
            stopCamera();
        };
    }, []);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
                audio: false
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setCameraStream(stream);
            setCameraReady(true);
            setCameraError(false);
        } catch (e) {
            console.error('Camera error:', e);
            setCameraError(true);
            setCameraReady(false);
        }
    };

    const stopCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };

    const capturePhoto = async () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0);

        setIsVerifying(true);

        try {
            const blob = await new Promise<Blob | null>(resolve =>
                canvas.toBlob(resolve, 'image/jpeg', 0.8)
            );

            if (!blob) throw new Error('Failed to capture image');

            // Get device ID from localStorage
            const deviceId = localStorage.getItem('controlled_anonymity_device_id') || '';

            const formData = new FormData();
            formData.append('image', blob, 'selfie.jpg');

            const response = await fetch(`http://localhost:8000/api/auth/verify-gender?device_id=${deviceId}`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ detail: 'Verification failed' }));
                throw new Error(error.detail || 'Verification failed');
            }

            const result = await response.json();

            // Stop camera immediately after successful verification
            stopCamera();

            // Small delay to ensure camera is fully released before navigation
            await new Promise(resolve => setTimeout(resolve, 100));

            onVerified(result.gender);
        } catch (e: any) {
            onError(e.message);
        } finally {
            setIsVerifying(false);
        }
    };

    return (
        <section className="verification-screen">
            <div className="verification-container">
                <button className="btn-back" onClick={onBack} disabled title="Verification required to continue">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                </button>

                <h2>
                    <span style={{ marginRight: '10px' }}>🔒</span>
                    Quick Safety Check
                </h2>
                <p className="verification-subtitle">
                    Quick selfie verification to keep our community safe.
                    <br />
                    <span style={{ color: 'var(--success)', marginTop: '8px', display: 'inline-block' }}>
                        No uploads allowed. Your photo is deleted immediately.
                    </span>
                    <br />
                    <span style={{ color: 'var(--text-secondary)', marginTop: '8px', display: 'inline-block', fontSize: '0.9rem' }}>
                        We only verify gender. No face data is stored.
                    </span>
                </p>

                <div className="camera-container" style={{
                    maxHeight: 'none',
                    aspectRatio: '9/16',
                    height: '60vh',
                    borderRadius: '24px',
                    borderColor: 'var(--bg-tertiary)'
                }}>
                    <video ref={videoRef} className="camera-preview" autoPlay playsInline></video>
                    <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
                    <div className="camera-overlay">
                        <div className="face-guide"></div>
                    </div>
                    {cameraError && (
                        <div className="camera-error">
                            <span>📸</span>
                            <p>Camera access required</p>
                            <button className="btn-secondary" onClick={startCamera}>Enable Camera</button>
                        </div>
                    )}
                </div>

                {!isVerifying ? (
                    <div className="verification-actions">
                        <button className="btn-capture" disabled={!cameraReady} onClick={capturePhoto}>
                            <div className="capture-inner"></div>
                        </button>
                        <p className="capture-hint">Tap to capture</p>
                    </div>
                ) : (
                    <div className="verification-status">
                        <div className="status-spinner"></div>
                        <p>Checking… Image will be deleted in a moment.</p>
                    </div>
                )}
            </div>
        </section>
    );
}
