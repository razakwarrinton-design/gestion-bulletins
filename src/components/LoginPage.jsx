import React, { useState } from 'react';
import { Eye, EyeOff, Loader, BarChart3, FileText, Users, Shield, ChartBar } from 'lucide-react';

const FEATURES = [
    { icon: FileText, label: 'Gestion des bulletins PDF' },
    { icon: Users, label: 'Suivi des élèves et parents' },
    { icon: BarChart3, label: 'Dashboard KPIs en temps réel' },
    { icon: Shield, label: 'Sécurisé avec 2FA' },
];

const DEMO_ACCOUNTS = [
    { label: '🛡️ Admin', email: 'admin@ecole.com', password: 'admin123' },
    { label: '👨‍🏫 Prof', email: 'prof@ecole.com', password: 'prof123' },
    { label: '💼 Secr.', email: 'secret@ecole.com', password: 'secret123' },
];

export default function LoginPage({ isRegister, setIsRegister, onSignIn, onSignUp, loading }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [role, setRole] = useState('secretaire');
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');

    const resetForm = () => {
        setEmail(''); setPassword('');
        setFirstName(''); setLastName('');
        setRole('secretaire'); setError('');
    };

    const switchMode = (register) => {
        setIsRegister(register);
        resetForm();
    };

    const fillDemo = (acc) => {
        setEmail(acc.email);
        setPassword(acc.password);
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (isRegister) {
            if (password.length < 6) {
                setError('Le mot de passe doit contenir au moins 6 caractères');
                return;
            }
            const res = await onSignUp(email, password, firstName, lastName, role);
            if (!res.success) setError(res.error || 'Erreur lors de la création du compte');
        } else {
            const res = await onSignIn(email, password);
            if (!res.success) setError(res.error || 'Email ou mot de passe incorrect');
        }
    };

    /* ── shared input style ── */
    const inp = {
        width: '100%', padding: '11px 14px', borderRadius: 10,
        border: '1.5px solid #E2E8F0', background: '#F8FAFF',
        fontSize: 13.5, fontFamily: 'inherit', color: '#0F172A', outline: 'none',
    };
    const lbl = {
        display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B',
        letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 6,
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#EFF6FF', position: 'relative', overflow: 'hidden', padding: 16,
            fontFamily: "'Outfit', 'Inter', sans-serif",
        }}>
            {/* Decorative circles */}
            {[
                { w: 500, h: 500, top: -150, left: -100, color: 'rgba(147,197,253,0.45)' },
                { w: 350, h: 350, bottom: -80, right: -60, color: 'rgba(147,197,253,0.35)' },
                { w: 200, h: 200, top: '40%', left: 30, color: 'rgba(96,165,250,0.25)' },
                { w: 120, h: 120, top: '18%', right: 80, color: 'rgba(147,197,253,0.3)' },
            ].map((c, i) => (
                <div key={i} style={{
                    position: 'absolute', borderRadius: '50%',
                    width: c.w, height: c.h,
                    top: c.top, left: c.left, bottom: c.bottom, right: c.right,
                    background: c.color,        // ← remplace l'ancien opacity
                    pointerEvents: 'none',
                }} />
            ))}

            {/* Card */}
            <div style={{
                width: '100%', maxWidth: 820, background: '#fff', borderRadius: 20,
                border: '1px solid #DBEAFE', boxShadow: '0 20px 60px rgba(37,99,235,0.08)',
                display: 'flex', overflow: 'hidden', position: 'relative', zIndex: 1,
            }}>

                {/* ── Left branding panel ── */}
                <div style={{
                    width: 320, flexShrink: 0, padding: '36px 28px',
                    background: 'linear-gradient(160deg, #1E3A5F 0%, #2563EB 100%)',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                }}>
                    <div>
                        {/* Logo */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
                            <div style={{
                                width: 38, height: 38, borderRadius: 10,
                                background: 'rgba(255,255,255,0.15)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <BarChart3 size={18} color="#fff" />
                            </div>
                            <div>
                                <div style={{ color: '#fff', fontSize: 16, fontWeight: 800, lineHeight: 1.1 }}>EduPulse</div>
                                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10.5 }}>Gestion scolaire</div>
                            </div>
                        </div>

                        {/* Headline */}
                        <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 800, lineHeight: 1.25, marginBottom: 10 }}>
                            Gérez votre école{' '}
                            <span style={{ color: '#93C5FD' }}>avec intelligence.</span>
                        </h2>
                        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12.5, lineHeight: 1.65, marginBottom: 24 }}>
                            EduPulse centralise la gestion des notes, bulletins, paiements et communication parents en une seule plateforme.
                        </p>

                        {/* Feature pills */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {FEATURES.map(({ icon: Icon, label }) => (
                                <div key={label} style={{
                                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                                    borderRadius: 9, background: 'rgba(37,99,235,0.18)',
                                }}>
                                    <div style={{
                                        width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                                        background: 'rgba(255,255,255,0.12)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <Icon size={13} color="#93C5FD" />
                                    </div>
                                    <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12.5, fontWeight: 500 }}>
                                        {label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, marginTop: 24 }}>
                        EduPulse © 2026 — Tous droits réservés
                    </p>
                </div>

                {/* ── Right form panel ── */}
                <div style={{ flex: 1, padding: '36px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'center', overflowY: 'auto' }}>

                    {/* Tabs */}
                    <div style={{
                        display: 'flex', gap: 4, background: '#F1F5F9',
                        padding: 4, borderRadius: 10, marginBottom: 24,
                    }}>
                        {[
                            { label: 'Connexion', reg: false },
                            { label: 'Créer un compte', reg: true },
                        ].map(t => (
                            <button key={t.label} onClick={() => switchMode(t.reg)} style={{
                                flex: 1, padding: '8px 0', borderRadius: 8, border: 'none',
                                fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
                                transition: 'all .15s',
                                background: isRegister === t.reg ? '#2563EB' : 'transparent',
                                color: isRegister === t.reg ? '#fff' : '#94A3B8',
                            }}>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Heading */}
                    <div style={{ marginBottom: 22 }}>
                        <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>
                            {isRegister ? 'Créer un compte 📝' : 'Bon retour 👋'}
                        </h3>
                        <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>
                            {isRegister
                                ? 'Rejoignez EduPulse et gérez votre établissement'
                                : 'Connectez-vous à votre espace EduPulse'}
                        </p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div style={{
                            marginBottom: 16, padding: '10px 14px', background: '#FEF2F2',
                            border: '1px solid #FECACA', borderRadius: 10, fontSize: 13, color: '#DC2626',
                        }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>

                        {/* Register fields */}
                        {isRegister && (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                                    <div>
                                        <label style={lbl}>Prénom</label>
                                        <input style={inp} required value={firstName}
                                            onChange={e => setFirstName(e.target.value)}
                                            placeholder="Jean" disabled={loading}
                                            onFocus={e => { e.target.style.borderColor = '#2563EB'; e.target.style.background = '#fff'; }}
                                            onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.background = '#F8FAFF'; }}
                                        />
                                    </div>
                                    <div>
                                        <label style={lbl}>Nom</label>
                                        <input style={inp} required value={lastName}
                                            onChange={e => setLastName(e.target.value)}
                                            placeholder="Dupont" disabled={loading}
                                            onFocus={e => { e.target.style.borderColor = '#2563EB'; e.target.style.background = '#fff'; }}
                                            onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.background = '#F8FAFF'; }}
                                        />
                                    </div>
                                </div>
                                <div style={{ marginBottom: 14 }}>
                                    <label style={lbl}>Rôle</label>
                                    <select style={{ ...inp }} value={role}
                                        onChange={e => setRole(e.target.value)} disabled={loading}
                                        onFocus={e => { e.target.style.borderColor = '#2563EB'; e.target.style.background = '#fff'; }}
                                        onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.background = '#F8FAFF'; }}
                                    >
                                        <option value="secretaire">💼 Secrétaire</option>
                                        <option value="professeur">👨‍🏫 Professeur</option>
                                        <option value="admin">🛡️ Administrateur</option>
                                    </select>
                                </div>
                            </>
                        )}

                        {/* Email */}
                        <div style={{ marginBottom: 14 }}>
                            <label style={lbl}>Email</label>
                            <input style={inp} type="email" required value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="votre@email.com" disabled={loading}
                                onFocus={e => { e.target.style.borderColor = '#2563EB'; e.target.style.background = '#fff'; }}
                                onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.background = '#F8FAFF'; }}
                            />
                        </div>

                        {/* Password */}
                        <div style={{ marginBottom: 4 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <label style={{ ...lbl, margin: 0 }}>Mot de passe</label>
                                {!isRegister && (
                                    <span style={{ fontSize: 12, color: '#2563EB', fontWeight: 600, cursor: 'pointer' }}>
                                        Oublié ?
                                    </span>
                                )}
                            </div>
                            <div style={{ position: 'relative' }}>
                                <input style={{ ...inp, paddingRight: 42 }}
                                    type={showPass ? 'text' : 'password'} required value={password}
                                    onChange={e => setPassword(e.target.value)} minLength={6}
                                    placeholder={isRegister ? 'Minimum 6 caractères' : '••••••••'} disabled={loading}
                                    onFocus={e => { e.target.style.borderColor = '#2563EB'; e.target.style.background = '#fff'; }}
                                    onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.background = '#F8FAFF'; }}
                                />
                                <button type="button" onClick={() => setShowPass(!showPass)} style={{
                                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 0,
                                }}>
                                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button type="submit" disabled={loading} style={{
                            width: '100%', background: loading ? '#93C5FD' : '#2563EB',
                            color: '#fff', border: 'none', borderRadius: 10, padding: '12px 0',
                            fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            marginTop: 18, marginBottom: 14, transition: 'background .15s',
                        }}>
                            {loading && <Loader size={15} style={{ animation: 'spin 1s linear infinite' }} />}
                            {loading
                                ? (isRegister ? 'Création en cours...' : 'Connexion...')
                                : (isRegister ? 'Créer mon compte' : 'Se connecter →')}
                        </button>
                    </form>

                    {/* Toggle */}
                    <p style={{ textAlign: 'center', fontSize: 13, color: '#94A3B8', margin: '0 0 18px' }}>
                        {isRegister ? 'Déjà un compte ?' : 'Pas encore de compte ?'}{' '}
                        <span onClick={() => switchMode(!isRegister)} style={{
                            color: '#2563EB', fontWeight: 700, cursor: 'pointer',
                        }}>
                            {isRegister ? 'Se connecter' : 'Créer un compte'}
                        </span>
                    </p>

                    {/* Demo accounts — login only */}
                    {!isRegister && (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                                <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
                                <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, letterSpacing: '.05em' }}>DÉMO</span>
                                <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {DEMO_ACCOUNTS.map(acc => (
                                    <button key={acc.label} onClick={() => fillDemo(acc)} style={{
                                        flex: 1, padding: '7px 6px', borderRadius: 9,
                                        border: '1.5px solid #E2E8F0', background: '#F8FAFF',
                                        fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                                        color: '#475569', cursor: 'pointer', transition: 'all .15s',
                                    }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.color = '#2563EB'; e.currentTarget.style.background = '#EFF6FF'; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.background = '#F8FAFF'; }}
                                    >
                                        {acc.label}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}