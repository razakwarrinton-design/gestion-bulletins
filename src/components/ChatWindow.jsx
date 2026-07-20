// src/components/ChatWindow.jsx
import React, { useEffect, useState } from 'react';
import { Send, X, Phone, Info } from 'lucide-react';
import { useChat } from '../hooks/useChat';

export default function ChatWindow({ conversationId, otherUser, currentUser, onClose }) {
    const { messages, sendMessage, loading, markAsRead } = useChat();
    const [messageText, setMessageText] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (conversationId && currentUser?.id) {
            markAsRead(conversationId, currentUser.id);
        }
    }, [conversationId, currentUser?.id, markAsRead]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!messageText.trim() || sending) return;

        setSending(true);
        const result = await sendMessage(
            conversationId,
            currentUser.id,
            currentUser.role,
            messageText
        );

        if (result.success) {
            setMessageText('');
        }
        setSending(false);
    };

    return (
        <div className="flex flex-col h-screen bg-white">
            {/* Header */}
            <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
                <div>
                    <h2 className="font-bold">
                        {otherUser?.first_name} {otherUser?.last_name}
                    </h2>
                    <p className="text-sm text-blue-100">En ligne</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="p-2 hover:bg-blue-700 rounded">
                        <Phone className="w-5 h-5" />
                    </button>
                    <button className="p-2 hover:bg-blue-700 rounded">
                        <Info className="w-5 h-5" />
                    </button>
                    <button onClick={onClose} className="p-2 hover:bg-blue-700 rounded">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="text-center text-gray-400 py-12">
                        <p>Aucun message yet. Commencez la conversation!</p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.sender_id === currentUser?.id ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-xs px-4 py-2 rounded-lg ${msg.sender_id === currentUser?.id
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-200 text-gray-900'
                                    }`}
                            >
                                <p>{msg.content}</p>
                                <p className="text-xs mt-1 opacity-70">
                                    {new Date(msg.created_at).toLocaleTimeString('fr-FR', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="border-t p-4 flex gap-2">
                <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Écrivez votre message..."
                    className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-600"
                    disabled={sending}
                />
                <button
                    type="submit"
                    disabled={sending || !messageText.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
                >
                    <Send className="w-4 h-4" />
                    Envoyer
                </button>
            </form>
        </div>
    );
}