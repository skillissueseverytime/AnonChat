'use client';

/**
 * API Module - Backend communication
 */

import { getDeviceId } from './deviceFingerprint';

const BASE_URL = 'http://localhost:8000';
const WS_URL = 'ws://localhost:8000';

export async function initAPI(id: string) {
    // Deprecated: Device ID is now handled automatically via headers
}

export async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;

    // Get device ID from storage
    const deviceId = getDeviceId();

    const headers = {
        'Content-Type': 'application/json',
        'X-Device-ID': deviceId,
        ...(options.headers || {})
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(error.detail || 'Request failed');
    }

    return response.json();
}

export async function register() {
    return request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({}),
    });
}

export async function verifyGender(imageBlob: Blob) {
    const formData = new FormData();
    formData.append('image', imageBlob, 'selfie.jpg');

    const deviceId = getDeviceId();

    const response = await fetch(`${BASE_URL}/api/auth/verify-gender`, {
        method: 'POST',
        headers: {
            'X-Device-ID': deviceId
        },
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Verification failed' }));
        throw new Error(error.detail || 'Verification failed');
    }

    return response.json();
}

export async function updateProfile(nickname: string, bio: string) {
    return request('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ nickname, bio }),
    });
}

export async function getMe() {
    return request(`/api/auth/me`);
}

export async function submitReport(reportedId: string, reason: string) {
    return request('/api/reports/submit', {
        method: 'POST',
        body: JSON.stringify({
            reported_device_id: reportedId,
            reason: reason,
        }),
    });
}

/**
 * WebSocket Manager - Real-time matching and chat
 */
export class WebSocketManager {
    private socket: WebSocket | null = null;
    private handlers: Record<string, ((data: any) => void)[]> = {};
    private reconnectAttempts = 0;
    private deviceId: string;

    constructor(deviceId: string) {
        this.deviceId = deviceId;
    }

    connect(): Promise<void> {
        if (this.socket?.readyState === WebSocket.OPEN) return Promise.resolve();

        return new Promise((resolve, reject) => {
            const url = `${WS_URL}/ws/chat/${this.deviceId}`;
            this.socket = new WebSocket(url);

            this.socket.onopen = () => {
                this.reconnectAttempts = 0;
                this.triggerHandler('connected', {});
                resolve();
            };

            this.socket.onclose = (e) => {
                this.triggerHandler('disconnected', { code: e.code, reason: e.reason });
                if (this.reconnectAttempts < 5) {
                    this.reconnectAttempts++;
                    setTimeout(() => this.connect(), 2000 * this.reconnectAttempts);
                }
            };

            this.socket.onerror = (e) => reject(e);

            this.socket.onmessage = (e) => {
                try {
                    const data = JSON.parse(e.data);
                    this.handleMessage(data);
                } catch (err) {
                    console.error(err);
                }
            };
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }

    send(type: string, data: Record<string, any> = {}): boolean {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return false;
        this.socket.send(JSON.stringify({ type, ...data }));
        return true;
    }

    joinQueue(lookingFor: string = 'any') {
        return this.send('join_queue', { looking_for: lookingFor });
    }

    leaveQueue() {
        return this.send('leave_queue');
    }

    sendMessage(content: string) {
        return this.send('send_message', { content });
    }

    leaveChat() {
        return this.send('leave_chat');
    }

    nextMatch(lookingFor: string = 'any') {
        return this.send('next_match', { looking_for: lookingFor });
    }

    on(event: string, handler: (data: any) => void) {
        if (!this.handlers[event]) this.handlers[event] = [];
        this.handlers[event].push(handler);
    }

    off(event: string, handler: (data: any) => void) {
        if (this.handlers[event]) {
            this.handlers[event] = this.handlers[event].filter(h => h !== handler);
        }
    }

    private triggerHandler(event: string, data: any) {
        if (this.handlers[event]) {
            this.handlers[event].forEach(h => h(data));
        }
    }

    private handleMessage(data: any) {
        const { type, ...payload } = data;
        this.triggerHandler(type, payload);
    }
}
