import React, { useState } from 'react';
import { X, Eye, EyeOff, Loader, BarChart3, GraduationCap, Users, FileText, Shield } from 'lucide-react';

export default function LoginModalSupabase({
    isRegister,
    setIsRegister,
    setShowLoginModal,
    onSignIn,
    onSignUp,
    loading,
    inline = false
}) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [role, setRole] = useState('secretaire');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (isRegister) {
            if (password.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères'); return; }
            const result = await onSignUp(email, password, firstName, lastName, role);
            if (result.success) setShowLoginModal(false);
            else setError(result.error || 'Erreur lors de la création du compte');
        } else {
            const result = await onSignIn(email, password);
            if (result.success) setShowLoginModal(false);
            else setError(result.error || 'Email ou mot de passe incorrect');
        }
    };

    const resetForm = () => { setEmail(''); setPassword(''); setFirstName(''); setLastName(''); setRole('secretaire'); setError(''); };
    const toggleMode = () => { setIsRegister(!isRegister); resetForm(); };

    /* ── Shared input style ─────────────────────────────────────── */
    const inputCls = `w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 bg-gray-50
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white
    transition-all duration-150 placeholder-gray-400`;

    const labelCls = `block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide`;

    /* ── Form ───────────────────────────────────────────────────── */
    const formContent = (
        <div className="flex-1 flex flex-col justify-center px-8 py-8 overflow-y-auto">

            {/* Header */}
            <div className="mb-7">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                    {isRegister ? 'Créer un compte' : 'Bon retour 👋'}
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                    {isRegister
                        ? 'Rejoignez EduPulse et gérez votre établissement'
                        : 'Connectez-vous pour accéder à votre tableau de bord'}
                </p>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-200 rounded-full flex items-center justify-center flex-shrink-0">
                        <X className="w-2.5 h-2.5 text-red-700" />
                    </div>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

                {/* Register fields */}
                {isRegister && (
                    <>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelCls}>Prénom</label>
                                <input type="text" required value={firstName}
                                    onChange={e => setFirstName(e.target.value)}
                                    className={inputCls} placeholder="Jean" disabled={loading} />
                            </div>
                            <div>
                                <label className={labelCls}>Nom</label>
                                <input type="text" required value={lastName}
                                    onChange={e => setLastName(e.target.value)}
                                    className={inputCls} placeholder="Dupont" disabled={loading} />
                            </div>
                        </div>
                        <div>
                            <label className={labelCls}>Rôle</label>
                            <select value={role} onChange={e => setRole(e.target.value)}
                                className={inputCls} disabled={loading}>
                                <option value="secretaire">💼 Secrétaire</option>
                                <option value="professeur">👨‍🏫 Professeur</option>
                                <option value="admin">🛡️ Administrateur</option>
                            </select>
                        </div>
                    </>
                )}

                <div>
                    <label className={labelCls}>Adresse email</label>
                    <input type="email" required value={email}
                        onChange={e => setEmail(e.target.value)}
                        className={inputCls} placeholder="email@exemple.com" disabled={loading} />
                </div>

                <div>
                    <label className={labelCls}>Mot de passe</label>
                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'} required value={password}
                            onChange={e => setPassword(e.target.value)}
                            className={`${inputCls} pr-10`}
                            placeholder={isRegister ? 'Minimum 6 caractères' : '••••••••'}
                            minLength={6} disabled={loading}
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {!isRegister && (
                    <div className="text-right -mt-1">
                        <button type="button" className="text-xs text-blue-500 hover:text-blue-700 font-medium transition-colors">
                            Mot de passe oublié ?
                        </button>
                    </div>
                )}

                <button type="submit" disabled={loading}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-all duration-150 disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm hover:shadow-md mt-2">
                    {loading
                        ? <><Loader className="w-4 h-4 animate-spin" /><span>{isRegister ? 'Création...' : 'Connexion...'}</span></>
                        : <span>{isRegister ? 'Créer mon compte' : 'Se connecter'}</span>}
                </button>
            </form>

            {/* Toggle */}
            <p className="mt-5 text-center text-sm text-gray-500">
                {isRegister ? 'Déjà un compte ?' : 'Pas encore de compte ?'}
                <button onClick={toggleMode} disabled={loading}
                    className="ml-1.5 text-blue-600 hover:text-blue-700 font-semibold transition-colors">
                    {isRegister ? 'Se connecter' : 'Créer un compte'}
                </button>
            </p>

            {/* Demo accounts */}
            {!isRegister && (
                <div className="mt-5 p-4 rounded-xl" style={{ background: '#F0F5FF', border: '1px solid #DBEAFE' }}>
                    <p className="text-xs font-bold text-blue-700 mb-2 flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5" /> Comptes de démonstration
                    </p>
                    <div className="space-y-1 text-xs text-blue-600">
                        <p><span className="font-semibold">Admin :</span> admin@ecole.com / admin123</p>
                        <p><span className="font-semibold">Prof :</span> prof@ecole.com / prof123</p>
                        <p><span className="font-semibold">Secrétaire :</span> secret@ecole.com / secret123</p>
                    </div>
                </div>
            )}
        </div>
    );

    /* ── Left branding panel ────────────────────────────────────── */
    const brandPanel = (
        <div className="hidden md:flex flex-col justify-between p-8 text-white"
            style={{ background: 'linear-gradient(145deg, #1E3A5F 0%, #1D5FA6 60%, #2563EB 100%)', minWidth: '260px' }}>
            <div>
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                        <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <div className="text-lg font-black tracking-tight">EduPulse</div>
                        <div className="text-[11px] text-white/50">Gestion scolaire</div>
                    </div>
                </div>
                <h3 className="text-xl font-bold leading-tight mb-2">
                    Gérez votre établissement avec intelligence
                </h3>
                <p className="text-sm text-white/60 leading-relaxed">
                    Bulletins, notes, statistiques et bien plus — tout en un seul endroit.
                </p>
            </div>

            {/* Feature list */}
            <div className="space-y-3 mt-8">
                {[
                    { Icon: GraduationCap, label: 'Gestion des classes & élèves' },
                    { Icon: FileText, label: 'Bulletins PDF en un clic' },
                    { Icon: BarChart3, label: 'Statistiques & analyses' },
                    { Icon: Users, label: 'Portail parents intégré' },
                ].map(({ Icon, label }) => (
                    <div key={label} className="flex items-center gap-3">
                        <div className="w-7 h-7 bg-white/15 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Icon className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="text-sm text-white/80 font-medium">{label}</span>
                    </div>
                ))}
            </div>

            <p className="text-[10px] text-white/30 mt-6">© 2024-2025 EduPulse · Tous droits réservés</p>
        </div>
    );

    /* ── inline mode (LoginPage) ────────────────────────────────── */
    if (inline) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4"
                style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 50%, #EFF6FF 100%)' }}>
                <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl overflow-hidden flex"
                    style={{ border: '1px solid #DBEAFE' }}>
                    {brandPanel}
                    <div className="flex-1 flex flex-col min-w-0">
                        {formContent}
                    </div>
                </div>
            </div>
        );
    }

    /* ── modal mode ─────────────────────────────────────────────── */
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex max-h-[95vh]"
                style={{ border: '1px solid #DBEAFE' }}>
                {brandPanel}
                <div className="flex-1 flex flex-col min-w-0 relative">
                    <button onClick={() => setShowLoginModal(false)}
                        className="absolute top-4 right-4 w-7 h-7 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors z-10">
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                    {formContent}
                </div>
            </div>
        </div>
    );
}