// src/components/ProfesseurChatDashboard.jsx
import React, { useEffect, useState } from 'react';
import { MessageCircle, Plus, User } from 'lucide-react';
import { useChat } from '../hooks/useChat';
import { chatService } from '../services/ChatService';

export default function ProfesseurChatDashboard({ currentUser, onOpenChat }) {
    const { conversations, loading, loadConversations } = useChat();
    const [parents, setParents] = useState([]);
    const [showNewChat, setShowNewChat] = useState(false);
    const [starting, setStarting] = useState(false);

    const loadParents = async () => {
        const result = await chatService.listUsersByRole('parent');
        setParents(result.users || []);
    };

    useEffect(() => {
        if (currentUser?.id) loadConversations(currentUser.id);
        loadParents();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser?.id]);

    const otherUserOf = (conv) =>
        conv.user1_id === currentUser?.id ? conv.user2 : conv.user1;

    const handleStartChat = async (parent) => {
        setStarting(true);
        const result = await chatService.getOrCreateConversation(
            currentUser.id,
            parent.id,
            'professeur',
            'parent'
        );
        setStarting(false);
        if (result.success) {
            setShowNewChat(false);
            onOpenChat(result.conversation.id, parent);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">Messagerie</h2>
                    <p className="text-gray-600 text-sm">Échangez avec les parents d'élèves</p>
                </div>
                <button
                    onClick={() => setShowNewChat(v => !v)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    <span>Nouvelle conversation</span>
                </button>
            </div>

            {showNewChat && (
                <div className="bg-white rounded-lg shadow-md p-4">
                    <h3 className="font-semibold mb-3">Contacter un parent :</h3>
                    {parents.length === 0 ? (
                        <p className="text-gray-400 text-sm">Aucun parent enregistré pour le moment.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {parents.map(parent => (
                                <button
                                    key={parent.id}
                                    disabled={starting}
                                    onClick={() => handleStartChat(parent)}
                                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-blue-50 transition-colors text-left disabled:opacity-50"
                                >
                                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                                        <User className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="font-medium">{parent.first_name} {parent.last_name}</p>
                                        <p className="text-xs text-gray-500">{parent.email}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                {loading ? (
                    <p className="p-6 text-center text-gray-400">Chargement...</p>
                ) : conversations.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                        <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
                        <p>Aucune conversation pour le moment.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {conversations.map(conv => {
                            const other = otherUserOf(conv);
                            return (
                                <button
                                    key={conv.id}
                                    onClick={() => onOpenChat(conv.id, other)}
                                    className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
                                >
                                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-medium truncate">
                                            {other?.first_name} {other?.last_name}
                                        </p>
                                        <p className="text-xs text-gray-500 capitalize">{other?.role}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
