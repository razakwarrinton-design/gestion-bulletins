import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { CreditCard, Check, AlertCircle, Calendar, DollarSign } from 'lucide-react';

export default function PaymentHistory({ child }) {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalAmount, setTotalAmount] = useState(0);

    useEffect(() => {
        if (child?.id) {
            fetchPayments();
        }
    }, [child?.id]);

    const fetchPayments = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('payments')
                .select(`
                    *,
                    fee_type:fee_type_id(id, name)
                `)
                .eq('student_id', child.id)
                .order('created_at', { ascending: false });

            if (!error && data) {
                setPayments(data);
                const total = data.reduce((sum, p) => sum + (parseFloat(p.amount_paid) || 0), 0);
                setTotalAmount(total);
            }
        } catch (err) {
            console.error('Erreur chargement paiements:', err);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Formater un montant
     */
    const formatAmount = (amount) => {
        return new Intl.NumberFormat('fr-TG', {
            style: 'currency',
            currency: 'XOF',
        }).format(parseFloat(amount) || 0);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Résumé */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm">Montant total payé</p>
                            <p className="text-3xl font-bold text-blue-600">{formatAmount(totalAmount)}</p>
                        </div>
                        <DollarSign className="w-12 h-12 text-blue-400" />
                    </div>
                </div>

                <div className="bg-green-50 rounded-2xl p-6 border border-green-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm">Nombre de paiements</p>
                            <p className="text-3xl font-bold text-green-600">{payments.length}</p>
                        </div>
                        <Check className="w-12 h-12 text-green-400" />
                    </div>
                </div>
            </div>

            {/* Liste des paiements */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="text-lg font-bold">Historique des paiements</h3>
                </div>

                {payments.length === 0 ? (
                    <div className="text-center py-12">
                        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">Aucun paiement enregistré</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {payments.map((payment) => (
                            <div key={payment.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                            <CreditCard className="w-5 h-5 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">
                                                {payment.fee_type?.name || 'Frais de scolarité'}
                                            </p>
                                            <p className="text-sm text-gray-500 flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(payment.created_at).toLocaleDateString('fr-FR')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-green-600">{formatAmount(payment.amount_paid)}</p>
                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                            ✓ Payé
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Message info */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                <p className="text-sm text-blue-800">
                    💡 <strong>Info :</strong> Tous les paiements effectués pour {child?.firstName} {child?.lastName} sont affichés ci-dessus.
                </p>
            </div>
        </div>
    );
}