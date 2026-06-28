// src/components/PaymentModal.jsx
import React, { useState } from 'react';
import { usePayments } from '../hooks/usePayments';
import { X, Loader, CheckCircle, AlertCircle } from 'lucide-react';

/**
 * Modal pour effectuer un paiement
 * Usage: <PaymentModal studentId="123" amount={50000} onClose={() => {}} onSuccess={callback} />
 */
export default function PaymentModal({
    isOpen,
    studentId,
    amount,
    description,
    onClose,
    onSuccess,
}) {
    const [selectedProvider, setSelectedProvider] = useState(null);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [email, setEmail] = useState('');
    const [step, setStep] = useState('provider'); // provider, details, processing, success, error

    const {
        loading,
        error,
        currentPayment,
        initiatePayment,
        getProviders,
        formatAmount,
    } = usePayments();

    const providers = getProviders();

    /**
     * Étape 1 : Sélectionner le provider
     */
    const handleSelectProvider = (provider) => {
        setSelectedProvider(provider);
        setStep('details');
    };

    /**
     * Étape 2 : Remplir les détails et initier le paiement
     */
    const handlePaymentSubmit = async (e) => {
        e.preventDefault();

        // Valider les données
        if (!selectedProvider) {
            alert('Sélectionnez un moyen de paiement');
            return;
        }

        // Certains providers nécessitent le numéro de téléphone
        if (
            ['orange_money', 'moov_money', 'vodafone_cash', 'wave'].includes(
                selectedProvider.id
            ) &&
            !phoneNumber
        ) {
            alert('Numéro de téléphone requis');
            return;
        }

        setStep('processing');

        const result = await initiatePayment({
            studentId,
            amount,
            provider: selectedProvider.id,
            description,
            phoneNumber,
            email,
        });

        if (result.success) {
            setStep('success');
            // Si c'est une redirection, rediriger après 2 secondes
            if (result.redirectUrl) {
                setTimeout(() => {
                    window.location.href = result.redirectUrl;
                }, 2000);
            }
            // Appeler le callback de succès
            if (onSuccess) {
                setTimeout(() => onSuccess(result), 2000);
            }
        } else {
            setStep('error');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between">
                    <h2 className="text-lg font-bold">💳 Effectuer un paiement</h2>
                    <button
                        onClick={onClose}
                        className="hover:bg-blue-500 p-2 rounded-lg transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Montant à payer */}
                    <div className="bg-blue-50 rounded-xl p-4 mb-6 border-2 border-blue-200">
                        <p className="text-sm text-blue-600 font-semibold">Montant à payer</p>
                        <p className="text-3xl font-bold text-blue-900">
                            {formatAmount(amount)}
                        </p>
                        {description && (
                            <p className="text-sm text-blue-600 mt-2">{description}</p>
                        )}
                    </div>

                    {/* STEP 1: Sélectionner le provider */}
                    {step === 'provider' && (
                        <div>
                            <h3 className="font-bold text-gray-800 mb-4">
                                Choisir un moyen de paiement
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {providers.map((provider) => (
                                    <button
                                        key={provider.id}
                                        onClick={() => handleSelectProvider(provider)}
                                        className="p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition text-left"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{provider.icon}</span>
                                            <div>
                                                <p className="font-semibold text-gray-800">
                                                    {provider.label}
                                                </p>
                                                <p className="text-xs text-gray-500">{provider.region}</p>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Remplir les détails */}
                    {step === 'details' && selectedProvider && (
                        <form onSubmit={handlePaymentSubmit} className="space-y-4">
                            <h3 className="font-bold text-gray-800 mb-4">
                                {selectedProvider.label}
                            </h3>

                            {/* Numéro de téléphone (pour mobile money) */}
                            {['orange_money', 'moov_money', 'vodafone_cash', 'wave'].includes(
                                selectedProvider.id
                            ) && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Numéro de téléphone
                                        </label>
                                        <input
                                            type="tel"
                                            value={phoneNumber}
                                            onChange={(e) => setPhoneNumber(e.target.value)}
                                            placeholder="+228 90 123 456"
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            required
                                        />
                                    </div>
                                )}

                            {/* Email (pour Stripe, PayPal) */}
                            {['stripe', 'paypal'].includes(selectedProvider.id) && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="exemple@email.com"
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                            )}

                            {/* Boutons */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setStep('provider')}
                                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
                                >
                                    ← Retour
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
                                >
                                    {loading ? 'Traitement...' : 'Confirmer le paiement'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* STEP 3: En cours de traitement */}
                    {step === 'processing' && (
                        <div className="text-center py-8">
                            <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                            <p className="text-gray-700 font-medium">Traitement en cours...</p>
                            <p className="text-sm text-gray-500 mt-2">
                                Redirection vers {selectedProvider?.label}
                            </p>
                        </div>
                    )}

                    {/* STEP 4: Succès */}
                    {step === 'success' && (
                        <div className="text-center py-8">
                            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                            <p className="text-gray-800 font-bold text-lg mb-2">
                                Paiement initié avec succès !
                            </p>
                            <p className="text-sm text-gray-600">
                                Référence : {currentPayment?.reference}
                            </p>
                            {currentPayment?.redirectUrl && (
                                <p className="text-sm text-gray-500 mt-4">
                                    Redirection en cours...
                                </p>
                            )}
                            <button
                                onClick={onClose}
                                className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Fermer
                            </button>
                        </div>
                    )}

                    {/* STEP 5: Erreur */}
                    {step === 'error' && (
                        <div className="text-center py-8">
                            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
                            <p className="text-gray-800 font-bold text-lg mb-2">
                                Erreur lors du paiement
                            </p>
                            <p className="text-sm text-red-600">{error}</p>
                            <button
                                onClick={() => setStep('details')}
                                className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Réessayer
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}