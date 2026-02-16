import React from 'react';
import { useNotificationStore } from '../../store/useNotificationStore';
import { Info, CheckCircle, AlertTriangle, XCircle, X } from 'lucide-react';

export const NotificationTray: React.FC = () => {
    const { notifications, removeNotification } = useNotificationStore();

    if (notifications.length === 0) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            zIndex: 1000,
            maxWidth: 350,
        }}>
            {notifications.map((n) => (
                <div
                    key={n.id}
                    style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        padding: '12px 16px',
                        background: '#1e1e1e',
                        borderLeft: `4px solid ${getColor(n.type)}`,
                        borderRadius: 4,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                        color: '#eee',
                        fontSize: '14px',
                        animation: 'slideIn 0.3s ease-out forwards',
                    }}
                >
                    <div style={{ marginTop: 2, color: getColor(n.type) }}>
                        {getIcon(n.type)}
                    </div>
                    <div style={{ flex: 1, wordBreak: 'break-word', lineHeight: '1.4' }}>
                        {n.message}
                    </div>
                    <button
                        onClick={() => removeNotification(n.id)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#666',
                            cursor: 'pointer',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>
            ))}
            <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
        </div>
    );
};

function getColor(type: string) {
    switch (type) {
        case 'success': return '#4caf50';
        case 'warning': return '#ff9800';
        case 'error': return '#f44336';
        default: return '#2196f3';
    }
}

function getIcon(type: string) {
    switch (type) {
        case 'success': return <CheckCircle size={18} />;
        case 'warning': return <AlertTriangle size={18} />;
        case 'error': return <XCircle size={18} />;
        default: return <Info size={18} />;
    }
}
