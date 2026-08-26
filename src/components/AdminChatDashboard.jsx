// src/components/AdminChatDashboard.jsx
import React, { useEffect, useMemo } from 'react';
import { MessageCircle, Users, Clock, User } from 'lucide-react';
import { useChat } from '../hooks/useChat';

export default function AdminChatDashboard({ onOpenChat }) {
    const { conversations, loading, loadAllConversations } = useChat();

    useEffect(() => {
        loadAllConversations();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const stats = useMemo(() => {
        const today = new Date().toDateString();
        const activeToday = conversations.filter(
            c => new Date(c.updated_at).toDateString() === today
        ).length;
        const parentCount = new Set(
            conversations.flatMap(c => [c.user1, c.user2])
                .filter(u => u?.role === 'parent')
                .map(u => u.id)
        ).size;
        return {
            total: conversations.length,
            activeToday,
            parentCount,
        };
    }, [conversations]);

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-2xl font-bold">Messagerie — Vue d'ensemble</h2>
                <p className="text-gray-600 text-sm">Toutes les conversations parents ↔ professeurs</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg shadow-md p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                        <MessageCircle className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{stats.total}</p>
                        <p className="text-xs text-gray-500">Conversations</p>
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow-md p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                        <Clock className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{stats.activeToday}</p>
                        <p className="text-xs text-gray-500">Actives aujourd'hui</p>
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow-md p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                        <Users className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{stats.parentCount}</p>
                        <p className="text-xs text-gray-500">Parents impliqués</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                {loading ? (
                    <p className="p-6 text-center text-gray-400">Chargement...</p>
                ) : conversations.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                        <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
                        <p>Aucune conversation dans l'établissement pour le moment.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {conversations.map(conv => (
                            <button
                                key={conv.id}
                                onClick={() => onOpenChat(conv.id, conv.user2 ?? conv.user1)}
                                className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
                            >
                                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                                    <User className="w-5 h-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium truncate">
                                        {conv.user1?.first_name} {conv.user1?.last_name}
                                        <span className="text-gray-400 mx-1">↔</span>
                                        {conv.user2?.first_name} {conv.user2?.last_name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Dernière activité : {new Date(conv.updated_at).toLocaleString('fr-FR')}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
