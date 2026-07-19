// src/components/AdminPaymentsDashboard.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../config/supabase';
import { CheckCircle, Clock, XCircle, Eye } from 'lucide-react';

/**
 * Dashboard admin pour gérer tous les paiements
 * Adapté à la structure réelle : id, student_id, fee_type_id, amount_paid, status
 */
export default function AdminPaymentsDashboard() {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        completed: 0,
        failed: 0,
        totalAmount: 0
    });
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');

    /**
     * Charger les paiements
     */
    useEffect(() => {
        loadPayments();
    }, []);

    const loadPayments = async () => {
        try {
            setLoading(true);

            // Récupérer tous les paiements avec les infos étudiant et type de frais
            const { data, error } = await supabase
                .from('payments')
                .select(`
          *,
          student:student_id(id, first_name, last_name, email),
          fee_type:fee_type_id(id, name, amount)
        `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            setPayments(data || []);

            // Calculer les stats
            const pendingCount = data?.filter(p => p.status === 'pending').length || 0;
            const completedCount = data?.filter(p => p.status === 'completed').length || 0;
            const failedCount = data?.filter(p => p.status === 'failed').length || 0;
            const totalAmount = data?.reduce((sum, p) => sum + (parseFloat(p.amount_paid) || 0), 0) || 0;

            setStats({
                total: data?.length || 0,
                pending: pendingCount,
                completed: completedCount,
                failed: failedCount,
                totalAmount,
            });
        } catch (error) {
            console.error('Erreur chargement paiements:', error);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Marquer un paiement comme complété
     */
    const markAsCompleted = async (paymentId) => {
        try {
            const { error } = await supabase
                .from('payments')
                .update({ status: 'completed', updated_at: new Date().toISOString() })
                .eq('id', paymentId);

            if (error) throw error;

            alert('✅ Paiement marqué comme complété !');
            loadPayments();
            setSelectedPayment(null);
        } catch (error) {
            alert(`❌ Erreur: ${error.message}`);
        }
        // Envoyer SMS de validation
        const { smsService } = require('../services/SMSService');
        await smsService.notifyPaymentValidated(
            selectedPayment.student?.phoneNumber, // Si available
            selectedPayment.student?.first_name,
            selectedPayment.amount_paid,
            selectedPayment.student?.first_name
        );
    };

    /**
     * Marquer un paiement comme échoué
     */
    const markAsFailed = async (paymentId) => {
        try {
            const { error } = await supabase
                .from('payments')
                .update({ status: 'failed', updated_at: new Date().toISOString() })
                .eq('id', paymentId);

            if (error) throw error;

            alert('❌ Paiement marqué comme échoué !');
            loadPayments();
            setSelectedPayment(null);
        } catch (error) {
            alert(`❌ Erreur: ${error.message}`);
        }
    };

    /**
     * Filtrer les paiements
     */
    const filteredPayments = payments.filter(p => {
        if (filterStatus === 'all') return true;
        return p.status === filterStatus;
    });

    /**
     * Formater un montant
     */
    const formatAmount = (amount) => {
        return new Intl.NumberFormat('fr-TG', {
            style: 'currency',
            currency: 'XOF',
        }).format(parseFloat(amount) || 0);
    };

    /**
     * Obtenir la couleur du badge de statut
     */
    const getStatusColor = (status) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'failed':
                return 'bg-red-100 text-red-800';
            case 'processing':
                return 'bg-blue-100 text-blue-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    /**
     * Obtenir l'icône du statut
     */
    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed':
                return <CheckCircle className="w-5 h-5 text-green-600" />;
            case 'pending':
                return <Clock className="w-5 h-5 text-yellow-600" />;
            case 'failed':
                return <XCircle className="w-5 h-5 text-red-600" />;
            default:
                return <Clock className="w-5 h-5 text-blue-600" />;
        }
    };



    return (
        <div className="space-y-6 p-6 bg-gray-50 rounded-xl">
            {/* ──── STATISTIQUES ──── */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-600">
                    <p className="text-gray-600 text-sm font-medium">Total paiements</p>
                    <p className="text-3xl font-bold text-blue-600 mt-2">{stats.total}</p>
                </div>

                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-600">
                    <p className="text-gray-600 text-sm font-medium">En attente</p>
                    <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.pending}</p>
                </div>

                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-600">
                    <p className="text-gray-600 text-sm font-medium">Complétés</p>
                    <p className="text-3xl font-bold text-green-600 mt-2">{stats.completed}</p>
                </div>

                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-600">
                    <p className="text-gray-600 text-sm font-medium">Échoués</p>
                    <p className="text-3xl font-bold text-red-600 mt-2">{stats.failed}</p>
                </div>

                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-600">
                    <p className="text-gray-600 text-sm font-medium">Montant total</p>
                    <p className="text-2xl font-bold text-purple-600 mt-2">{formatAmount(stats.totalAmount)}</p>
                </div>
            </div>

            {/* ──── FILTRES ──── */}
            <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex gap-2 flex-wrap">
                    {['all', 'pending', 'completed', 'failed'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-4 py-2 rounded-lg font-medium transition ${filterStatus === status
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                                }`}
                        >
                            {status === 'all' ? '📋 Tous' : status === 'pending' ? '⏳ En attente' : status === 'completed' ? '✅ Complétés' : '❌ Échoués'}
                        </button>
                    ))}
                </div>
            </div>

            {/* ──── TABLEAU DES PAIEMENTS ──── */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-100 border-b">
                            <tr>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Étudiant</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Montant</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Type de frais</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Statut</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredPayments.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                        Aucun paiement trouvé
                                    </td>
                                </tr>
                            ) : (
                                filteredPayments.map(payment => (
                                    <tr key={payment.id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-medium text-gray-900">
                                                    {payment.student?.first_name} {payment.student?.last_name}
                                                </p>
                                                <p className="text-sm text-gray-500">{payment.student?.email}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-gray-900">
                                            {formatAmount(payment.amount_paid)}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {payment.fee_type?.name || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {new Date(payment.created_at).toLocaleDateString('fr-FR')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(payment.status)}
                                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(payment.status)}`}>
                                                    {payment.status === 'completed' ? '✅ Complété' :
                                                        payment.status === 'pending' ? '⏳ En attente' :
                                                            payment.status === 'processing' ? '🔄 Traitement' :
                                                                '❌ Échoué'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => setSelectedPayment(payment)}
                                                className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition text-sm font-medium"
                                            >
                                                <Eye className="w-4 h-4" />
                                                Détails
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ──── MODAL DÉTAILS ──── */}
            {selectedPayment && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                        <div className="bg-blue-600 text-white p-6">
                            <h2 className="text-2xl font-bold">💳 Détails du paiement</h2>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Infos étudiant */}
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-sm text-gray-600">Étudiant</p>
                                <p className="font-bold text-lg">
                                    {selectedPayment.student?.first_name} {selectedPayment.student?.last_name}
                                </p>
                                <p className="text-sm text-gray-600">{selectedPayment.student?.email}</p>
                            </div>

                            {/* Montant */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <p className="text-sm text-gray-600">Montant</p>
                                    <p className="font-bold text-2xl text-green-600">
                                        {formatAmount(selectedPayment.amount_paid)}
                                    </p>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <p className="text-sm text-gray-600">Type de frais</p>
                                    <p className="font-bold">{selectedPayment.fee_type?.name || 'N/A'}</p>
                                </div>
                            </div>

                            {/* Statut actuel */}
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-sm text-gray-600 mb-2">Statut actuel</p>
                                <div className="flex items-center gap-2">
                                    {getStatusIcon(selectedPayment.status)}
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedPayment.status)}`}>
                                        {selectedPayment.status === 'completed' ? '✅ Complété' :
                                            selectedPayment.status === 'pending' ? '⏳ En attente' :
                                                selectedPayment.status === 'processing' ? '🔄 Traitement' :
                                                    '❌ Échoué'}
                                    </span>
                                </div>
                            </div>

                            {/* Date */}
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-sm text-gray-600">Date du paiement</p>
                                <p className="font-medium">
                                    {new Date(selectedPayment.created_at).toLocaleDateString('fr-FR', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </p>
                            </div>

                            {/* Boutons d'action */}
                            {selectedPayment.status === 'pending' && (
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                    <p className="text-sm text-blue-700 mb-3 font-medium">
                                        ⚠️ Ce paiement est en attente. Marquer comme :
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => markAsCompleted(selectedPayment.id)}
                                            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium transition"
                                        >
                                            ✅ Complété
                                        </button>
                                        <button
                                            onClick={() => markAsFailed(selectedPayment.id)}
                                            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium transition"
                                        >
                                            ❌ Échoué
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Bouton fermer */}
                            <button
                                onClick={() => setSelectedPayment(null)}
                                className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded font-medium transition"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}