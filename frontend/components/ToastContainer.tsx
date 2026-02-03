'use client';

import { useEffect, useState } from 'react';

export interface ToastMessage {
    id: string;
    type: 'success' | 'error' | 'warning';
    message: string;
}

interface ToastContainerProps {
    toasts: ToastMessage[];
    onRemove: (id: string) => void;
}

export default function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
    return (
        <div className="toast-container">
            {toasts.map((toast) => (
                <Toast key={toast.id} toast={toast} onRemove={onRemove} />
            ))}
        </div>
    );
}

function Toast({ toast, onRemove }: { toast: ToastMessage; onRemove: (id: string) => void }) {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(() => onRemove(toast.id), 300);
        }, 3000);

        return () => clearTimeout(timer);
    }, [toast.id, onRemove]);

    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️'
    };

    return (
        <div
            className={`toast ${toast.type}`}
            style={isExiting ? { animation: 'fadeIn 0.3s ease reverse' } : {}}
        >
            <span className="toast-icon">{icons[toast.type]}</span>
            <span>{toast.message}</span>
        </div>
    );
}

// Utility hook for managing toasts
export function useToast() {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const showToast = (type: 'success' | 'error' | 'warning', message: string) => {
        const id = Date.now().toString();
        setToasts((prev) => [...prev, { id, type, message }]);
    };

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return { toasts, showToast, removeToast };
}
