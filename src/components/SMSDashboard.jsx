// src/components/SMSDashboard.jsx
import React, { useEffect, useState } from 'react';
import { smsService } from '../services/SMSService';
import { MessageSquare, CheckCircle, AlertCircle, Clock, Phone } from 'lucide-react';

/**
 * Dashboard pour voir tous les SMS envoyés
 */
export default function SMSDashboard() {
    const [smsHistory, setSmsHistory] = useState([]);
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        loadSMSHistory();
    }, []);

    const loadSMSHistory = () => {
        const history = smsService.getSMSHistory();
        setSmsHistory(history);
    };

    /**
     * Filtrer les SMS
     */
    const filteredSMS = smsHistory.filter(sms => {
        if (filterStatus === 'all') return true;
        return sms.status === filterStatus;
    });

    /**
     * Obtenir l'icône du statut
     */
    const getStatusIcon = (status) => {
        switch (status) {
            case 'sent':
                return <CheckCircle className="w-5 h-5 text-green-600" />;
            case 'failed':
                return <AlertCircle className="w-5 h-5 text-red-600" />;
            case 'pending':
                return <Clock className="w-5 h-5 text-yellow-600" />;
            default:
                return <MessageSquare className="w-5 h-5 text-gray-600" />;
        }
    };

    /**
     * Obtenir la couleur du badge
     */
    const getStatusColor = (status) => {
        switch (status) {
            case 'sent':
                return 'bg-green-100 text-green-800';
            case 'failed':
                return 'bg-red-100 text-red-800';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    /**
     * Formater la date
     */
    const formatDate = (isoString) => {
        return new Date(isoString).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="space-y-6 p-6 bg-gray-50 rounded-xl">
            {/* ──── STATISTIQUES ──── */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-600">
                    <p className="text-gray-600 text-sm font-medium">Total SMS</p>
                    <p className="text-3xl font-bold text-blue-600 mt-2">{smsHistory.length}</p>
                </div>

                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-600">
                    <p className="text-gray-600 text-sm font-medium">Envoyés</p>
                    <p className="text-3xl font-bold text-green-600 mt-2">
                        {smsHistory.filter(s => s.status === 'sent').length}
                    </p>
                </div>

                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-600">
                    <p className="text-gray-600 text-sm font-medium">Échoués</p>
                    <p className="text-3xl font-bold text-red-600 mt-2">
                        {smsHistory.filter(s => s.status === 'failed').length}
                    </p>
                </div>

                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-600">
                    <p className="text-gray-600 text-sm font-medium">En attente</p>
                    <p className="text-3xl font-bold text-yellow-600 mt-2">
                        {smsHistory.filter(s => s.status === 'pending').length}
                    </p>
                </div>
            </div>

            {/* ──── FILTRES ──── */}
            <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex gap-2 flex-wrap">
                    {['all', 'sent', 'failed', 'pending'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-4 py-2 rounded-lg font-medium transition ${filterStatus === status
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                                }`}
                        >
                            {status === 'all' ? '📋 Tous' : status === 'sent' ? '✅ Envoyés' : status === 'failed' ? '❌ Échoués' : '⏳ En attente'}
                        </button>
                    ))}
                </div>
            </div>

            {/* ──── TABLEAU DES SMS ──── */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-100 border-b">
                            <tr>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Numéro</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Message</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Statut</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredSMS.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                                        Aucun SMS trouvé
                                    </td>
                                </tr>
                            ) : (
                                filteredSMS.map(sms => (
                                    <tr key={sms.id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Phone className="w-4 h-4 text-gray-400" />
                                                <span className="font-medium text-gray-900">{sms.phoneNumber}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 max-w-md truncate">
                                            {sms.message}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {formatDate(sms.timestamp)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(sms.status)}
                                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(sms.status)}`}>
                                                    {sms.status === 'sent' ? '✅ Envoyé' :
                                                        sms.status === 'failed' ? '❌ Échoué' :
                                                            sms.status === 'pending' ? '⏳ En attente' :
                                                                'Inconnu'}
                                                </span>
                                            </div>
                                            {sms.error && (
                                                <p className="text-xs text-red-600 mt-1">{sms.error}</p>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ──── INFO ──── */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-800">
                    💡 <strong>Info :</strong> Tous les SMS envoyés aux parents sont enregistrés ici. Mode sandbox utilise des SMS simulés pour les tests.
                </p>
            </div>
        </div>
    );
}