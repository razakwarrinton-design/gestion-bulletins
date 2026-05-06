import React, { useState } from 'react';
import { X, Eye, EyeOff, Loader, BarChart3, Mail, Lock, User, Briefcase, Shield } from 'lucide-react';

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

  const resetForm = () => {
    setEmail(''); setPassword(''); setFirstName(''); setLastName('');
    setRole('secretaire'); setError('');
  };

  const toggleMode = () => { setIsRegister(!isRegister); resetForm(); };

  /* ── Shared input style ── */
  const inputCls = `w-full pl-9 pr-3 py-2.5 text-sm border border-blue-100 rounded-xl
    bg-blue-50/50 text-gray-800 placeholder-gray-400
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white
    disabled:opacity-50 transition-all duration-150`;

  /* ── Field wrapper with icon ── */
  const Field = ({ icon: Icon, children }) => (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 pointer-events-none" />
      {children}
    </div>
  );

  /* ── Form content ── */
  const formContent = (
    <div className="space-y-4">

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs">
          <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">

        {/* Register extra fields */}
        {isRegister && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1">Prénom *</label>
                <Field icon={User}>
                  <input type="text" required value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className={inputCls} placeholder="Jean" disabled={loading} />
                </Field>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1">Nom *</label>
                <Field icon={User}>
                  <input type="text" required value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className={inputCls} placeholder="Dupont" disabled={loading} />
                </Field>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1">Rôle *</label>
              <Field icon={Briefcase}>
                <select value={role} onChange={e => setRole(e.target.value)}
                  className={inputCls} disabled={loading}>
                  <option value="secretaire">Secrétaire</option>
                  <option value="professeur">Professeur</option>
                  <option value="admin">Administrateur</option>
                </select>
              </Field>
            </div>
          </>
        )}

        {/* Email */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1">Email *</label>
          <Field icon={Mail}>
            <input type="email" required value={email}
              onChange={e => setEmail(e.target.value)}
              className={inputCls} placeholder="email@exemple.com" disabled={loading} />
          </Field>
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1">Mot de passe *</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 pointer-events-none" />
            <input
              type={showPassword ? 'text' : 'password'} required value={password}
              onChange={e => setPassword(e.target.value)}
              className={`${inputCls} pr-10`}
              placeholder={isRegister ? 'Minimum 6 caractères' : '••••••••'}
              minLength={6} disabled={loading}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Forgot password */}
        {!isRegister && (
          <div className="text-right">
            <button type="button" className="text-xs text-blue-500 hover:text-blue-700 font-medium transition-colors">
              Mot de passe oublié ?
            </button>
          </div>
        )}

        {/* Submit */}
        <button type="submit" disabled={loading}
          className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-semibold text-sm
            hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50
            flex items-center justify-center gap-2 mt-2 shadow-sm shadow-blue-200">
          {loading
            ? <><Loader className="w-4 h-4 animate-spin" /><span>{isRegister ? 'Création...' : 'Connexion...'}</span></>
            : <span>{isRegister ? 'Créer mon compte' : 'Se connecter'}</span>}
        </button>
      </form>

      {/* Toggle mode */}
      <p className="text-center text-xs text-gray-400">
        {isRegister ? 'Déjà un compte ?' : 'Pas encore de compte ?'}
        <button onClick={toggleMode} disabled={loading}
          className="ml-1 text-blue-600 hover:text-blue-700 font-semibold transition-colors">
          {isRegister ? 'Se connecter' : 'Créer un compte'}
        </button>
      </p>

      {/* Demo credentials */}
      {!isRegister && (
        <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
          <p className="text-xs font-semibold text-blue-700 mb-1.5 flex items-center gap-1">
            <Shield className="w-3.5 h-3.5" /> Comptes de démonstration
          </p>
          <div className="text-xs text-blue-600 space-y-1">
            <p><span className="font-semibold">Admin :</span> admin@ecole.com / admin123</p>
            <p><span className="font-semibold">Prof :</span> prof@ecole.com / prof123</p>
            <p><span className="font-semibold">Secrétaire :</span> secret@ecole.com / secret123</p>
          </div>
        </div>
      )}
    </div>
  );

  /* ── Inline mode (full login page) ── */
  if (inline) {
    return (
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-5 text-center">
          {isRegister ? 'Créer un compte' : 'Connexion'}
        </h2>
        {formContent}
      </div>
    );
  }

  /* ── Modal mode ── */
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">

        {/* Modal header */}
        <div className="relative bg-gradient-to-br from-blue-600 to-blue-800 p-5 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-base">EduPulse</div>
              <div className="text-white/70 text-xs">{isRegister ? 'Créer un compte' : 'Connexion à votre espace'}</div>
            </div>
          </div>
          <button
            onClick={() => setShowLoginModal(false)}
            className="absolute top-4 right-4 w-7 h-7 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 max-h-[80vh] overflow-y-auto">
          {formContent}
        </div>
      </div>
    </div>
  );
}