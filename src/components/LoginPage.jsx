import React, { useState } from 'react';
import { Eye, EyeOff, Loader, Shield, BookOpen, Users, BarChart3 } from 'lucide-react';

/**
 * Page de connexion full-screen premium EduPulse
 * Remplace l'écran de login dans App.jsx quand !currentUser
 */
export default function LoginPage({
    isRegister, setIsRegister,
    onSignIn, onSignUp, loading,
    alertMessage, showAlert
}) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [role, setRole] = useState('professeur');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (isRegister) {
            if (password.length < 6) { setError('Mot de passe minimum 6 caractères'); return; }
            const result = await onSignUp(email, password, firstName, lastName, role);
            if (!result.success) setError(result.error || 'Erreur lors de la création');
        } else {
            const result = await onSignIn(email, password);
            if (!result.success) setError(result.error || 'Email ou mot de passe incorrect');
        }
    };

    const reset = () => {
        setEmail(''); setPassword(''); setFirstName(''); setLastName('');
        setRole('professeur'); setError('');
    };

    const features = [
        { icon: BookOpen, text: 'Gestion des bulletins PDF' },
        { icon: Users, text: 'Suivi des élèves et parents' },
        { icon: BarChart3, text: 'Dashboard KPIs en temps réel' },
        { icon: Shield, text: 'Sécurisé avec 2FA' },
    ];

    return (
        <div className="min-h-screen flex">

            {/* ── Panneau gauche — Branding ─────────────────────────────────── */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex-col justify-between p-12 relative overflow-hidden">
                {/* Cercles décoratifs */}
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-white opacity-5 rounded-full" />
                <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-white opacity-5 rounded-full" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white opacity-3 rounded-full" />

                {/* Logo */}
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                            <span className="text-2xl">📚</span>
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white">EduPulse</h1>
                            <p className="text-blue-200 text-xs">Plateforme scolaire intelligente</p>
                        </div>
                    </div>
                </div>

                {/* Message central */}
                <div className="relative z-10 space-y-6">
                    <div>
                        <h2 className="text-4xl font-black text-white leading-tight mb-4">
                            Gérez votre école<br />
                            <span className="text-blue-200">avec intelligence.</span>
                        </h2>
                        <p className="text-blue-200 text-lg leading-relaxed">
                            EduPulse centralise la gestion des notes, bulletins, paiements et communication parents en une seule plateforme moderne.
                        </p>
                    </div>

                    {/* Features */}
                    <div className="space-y-3">
                        {features.map((f, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <f.icon className="w-4 h-4 text-white" />
                                </div>
                                <span className="text-blue-100 text-sm font-medium">{f.text}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="relative z-10">
                    <p className="text-blue-300 text-xs">EduPulse © {new Date().getFullYear()} — Tous droits réservés</p>
                </div>
            </div>

            {/* ── Panneau droit — Formulaire ────────────────────────────────── */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 bg-gray-50 dark:bg-gray-900 relative">

                {/* Notification */}
                {showAlert && (
                    <div className="absolute top-6 right-6 bg-green-100 border border-green-400 text-green-800 px-4 py-3 rounded-xl shadow-lg text-sm font-medium">
                        {alertMessage}
                    </div>
                )}

                {/* Logo mobile uniquement */}
                <div className="lg:hidden text-center mb-8">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                        <span className="text-3xl">📚</span>
                    </div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white">EduPulse</h1>
                </div>

                {/* Carte formulaire */}
                <div className="w-full max-w-md">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8">

                        {/* Header */}
                        <div className="mb-8">
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                                {isRegister ? 'Créer un compte' : 'Bon retour 👋'}
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                                {isRegister
                                    ? 'Rejoignez EduPulse pour gérer votre école'
                                    : 'Connectez-vous à votre espace EduPulse'}
                            </p>
                        </div>

                        {/* Erreur */}
                        {error && (
                            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                                ⚠️ {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">

                            {/* Champs inscription */}
                            {isRegister && (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-1.5">Prénom</label>
                                            <input type="text" required value={firstName}
                                                onChange={e => setFirstName(e.target.value)}
                                                placeholder="Jean" disabled={loading}
                                                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-1.5">Nom</label>
                                            <input type="text" required value={lastName}
                                                onChange={e => setLastName(e.target.value)}
                                                placeholder="Dupont" disabled={loading}
                                                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-1.5">Rôle</label>
                                        <select value={role} onChange={e => setRole(e.target.value)} disabled={loading}
                                            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition">
                                            <option value="professeur">👨‍🏫 Professeur</option>
                                            <option value="secretaire">💼 Secrétaire</option>
                                            <option value="admin">🛡️ Administrateur</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            {/* Email */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-1.5">Email</label>
                                <input type="email" required value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="votre@email.com" disabled={loading}
                                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition" />
                            </div>

                            {/* Mot de passe */}
                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Mot de passe</label>
                                    {!isRegister && (
                                        <button type="button" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                                            Oublié ?
                                        </button>
                                    )}
                                </div>
                                <div className="relative">
                                    <input type={showPassword ? 'text' : 'password'} required value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder={isRegister ? 'Minimum 6 caractères' : '••••••••'}
                                        minLength={6} disabled={loading}
                                        className="w-full px-4 py-3 pr-12 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition" />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Bouton submit */}
                            <button type="submit" disabled={loading}
                                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-200 disabled:opacity-60 flex items-center justify-center gap-2 mt-2">
                                {loading
                                    ? <><Loader className="w-4 h-4 animate-spin" /> {isRegister ? 'Création...' : 'Connexion...'}</>
                                    : isRegister ? 'Créer mon compte' : 'Se connecter →'}
                            </button>
                        </form>

                        {/* Toggle mode */}
                        <div className="mt-6 text-center">
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                {isRegister ? 'Vous avez déjà un compte ? ' : "Pas encore de compte ? "}
                                <button onClick={() => { setIsRegister(!isRegister); reset(); }} disabled={loading}
                                    className="text-blue-600 hover:text-blue-700 font-semibold transition-colors">
                                    {isRegister ? 'Se connecter' : 'Créer un compte'}
                                </button>
                            </span>
                        </div>

                        {/* Séparateur */}
                        <div className="my-6 flex items-center gap-3">
                            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-600" />
                            <span className="text-xs text-gray-400 uppercase tracking-wide">Démo</span>
                            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-600" />
                        </div>

                        {/* Comptes démo */}
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { label: '🛡️ Admin', email: 'admin@ecole.com', pwd: 'admin123' },
                                { label: '👨‍🏫 Prof', email: 'prof@ecole.com', pwd: 'prof123' },
                                { label: '💼 Secr.', email: 'secret@ecole.com', pwd: 'secret123' },
                            ].map((acc, i) => (
                                <button key={i} type="button"
                                    onClick={() => { setEmail(acc.email); setPassword(acc.pwd); setIsRegister(false); }}
                                    className="px-2 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs text-gray-600 dark:text-gray-300 hover:bg-blue-50 hover:border-blue-200 transition-all text-center font-medium">
                                    {acc.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}