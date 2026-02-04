/**
 * API Module - Backend communication
 */
const API = {
    BASE_URL: 'http://localhost:8000',
    WS_URL: 'ws://localhost:8000',
    deviceId: null,

    async init() {
        this.deviceId = await DeviceFingerprint.getDeviceIdHash();
        return this.deviceId;
    },

    async request(endpoint, options = {}) {
        const url = `${this.BASE_URL}${endpoint}`;
        
        // Mandatory headers for the backend
        const defaultOptions = { 
            headers: { 
                'Content-Type': 'application/json',
                'X-Device-ID': this.deviceId
            } 
        };
        
        const response = await fetch(url, { ...defaultOptions, ...options });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Request failed' }));
            throw new Error(error.detail || 'Request failed');
        }
        return response.json();
    },

    async register() {
        return this.request('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({}), // Body device_id is optional, header is primary
        });
    },

    async verifyGender(imageBlob) {
        const formData = new FormData();
        formData.append('image', imageBlob, 'selfie.jpg');
        
        const url = `${this.BASE_URL}/api/auth/verify-gender`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'X-Device-ID': this.deviceId
            },
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Verification failed' }));
            throw new Error(error.detail || 'Verification failed');
        }
        return response.json();
    },

    async updateProfile(nickname, bio) {
        return this.request('/api/auth/profile', {
            method: 'PUT',
            body: JSON.stringify({ nickname, bio }),
        });
    },

    async getMe() {
        return this.request(`/api/auth/me`);
    },

    async submitReport(reportedDeviceId, reason, details) {
        return this.request('/api/reports/submit', {
            method: 'POST',
            body: JSON.stringify({
                reported_device_id: reportedDeviceId,
                reason: `${reason}: ${details}`,
            }),
        });
    },

    async completeChat() {
        return this.request(`/api/reports/chat-complete`, { method: 'POST' });
    },

    async getKarma() {
        return this.request(`/api/reports/karma`);
    },
};

/**
 * WebSocket Manager - Real-time matching and chat
 */
const WebSocketManager = {
    socket: null,
    handlers: {},
    reconnectAttempts: 0,

    connect() {
        if (this.socket?.readyState === WebSocket.OPEN) return Promise.resolve();
        return new Promise((resolve, reject) => {
            const url = `${API.WS_URL}/ws/chat/${API.deviceId}`;
            console.log('🔌 [WS-Static] Connecting to:', url);
            this.socket = new WebSocket(url);
            this.socket.onopen = () => { this.reconnectAttempts = 0; resolve(); };
            this.socket.onclose = (e) => {
                this.triggerHandler('disconnected', { code: e.code, reason: e.reason });
                if (this.reconnectAttempts < 5) {
                    this.reconnectAttempts++;
                    setTimeout(() => this.connect(), 2000 * this.reconnectAttempts);
                }
            };
            this.socket.onerror = (e) => reject(e);
            this.socket.onmessage = (e) => {
                try { this.handleMessage(JSON.parse(e.data)); } catch (err) { console.error(err); }
            };
        });
    },

    disconnect() { if (this.socket) { this.socket.close(); this.socket = null; } },

    send(type, data = {}) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return false;
        this.socket.send(JSON.stringify({ type, ...data }));
        return true;
    },

    joinQueue(lookingFor = 'any') { return this.send('join_queue', { looking_for: lookingFor }); },
    leaveQueue() { return this.send('leave_queue'); },
    sendMessage(content) { return this.send('send_message', { content }); },
    leaveChat() { return this.send('leave_chat'); },
    nextMatch(lookingFor = 'any') { return this.send('next_match', { looking_for: lookingFor }); },

    on(event, handler) {
        if (!this.handlers[event]) this.handlers[event] = [];
        this.handlers[event].push(handler);
    },
    off(event, handler) {
        if (this.handlers[event]) this.handlers[event] = this.handlers[event].filter(h => h !== handler);
    },
    triggerHandler(event, data) {
        if (this.handlers[event]) this.handlers[event].forEach(h => h(data));
    },
    handleMessage(data) {
        const { type, ...payload } = data;
        this.triggerHandler(type, payload);
    },
};

window.API = API;
window.WebSocketManager = WebSocketManager;
