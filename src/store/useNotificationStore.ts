import { create } from 'zustand';

export interface Notification {
    id: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    timestamp: number;
}

interface NotificationState {
    notifications: Notification[];
    addNotification: (message: string, type?: Notification['type']) => void;
    removeNotification: (id: string) => void;
    clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
    notifications: [],
    addNotification: (message, type = 'info') => {
        const id = Math.random().toString(36).substring(2, 9);
        const notification = { id, message, type, timestamp: Date.now() };

        set((state) => ({
            notifications: [notification, ...state.notifications].slice(0, 5), // Keep last 5
        }));

        // Auto-remove after 5 seconds
        setTimeout(() => {
            set((state) => ({
                notifications: state.notifications.filter((n) => n.id !== id),
            }));
        }, 5000);
    },
    removeNotification: (id) =>
        set((state) => ({
            notifications: state.notifications.filter((n) => n.id !== id),
        })),
    clearAll: () => set({ notifications: [] }),
}));
