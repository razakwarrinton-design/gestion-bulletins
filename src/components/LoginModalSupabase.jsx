import React, { useState } from 'react';
import { X, Eye, EyeOff, Loader } from 'lucide-react';

export default function LoginModalSupabase({
  isRegister,
  setIsRegister,
  setShowLoginModal,
  onSignIn,
  onSignUp,
  loading,
  inline = false  // ← nouveau prop pour mode page complète
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
      if (password.length < 6) {
        setError('Le mot de passe doit contenir au moins 6 caractères');
        return;
      }
      const result = await onSignUp(email, password, firstName, lastName, role);
      if (result.success) {
        setShowLoginModal(false);
      } else {
        setError(result.error || 'Erreur lors de la création du compte');
      }
    } else {
      const result = await onSignIn(email, password);
      if (result.success) {
        setShowLoginModal(false);
      } else {
        setError(result.error || 'Email ou mot de passe incorrect');
      }
    }
  };

  const resetForm = () => {
    setEmail(''); setPassword('');
    setFirstName(''); setLastName('');
    setRole('secretaire'); setError('');
  };

  const toggleMode = () => { setIsRegister(!isRegister); resetForm(); };

  // ── Contenu du formulaire (partagé entre les deux modes) ──────────────────
  const formContent = (
    <>
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {isRegister && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Prénom *</label>
                <input type="text" required value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Jean" disabled={loading} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Nom *</label>
                <input type="text" required value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Dupont" disabled={loading} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Rôle *</label>
              <select value={role} onChange={e => setRole(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={loading}>
                <option value="secretaire">💼 Secrétaire</option>
                <option value="professeur">👨‍🏫 Professeur</option>
                <option value="admin">🛡️ Administrateur</option>
              </select>
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">Email *</label>
          <input type="email" required value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="email@exemple.com" disabled={loading} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">Mot de passe *</label>
          <div className="relative">
            <input type={showPassword ? 'text' : 'password'} required value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
              placeholder={isRegister ? 'Minimum 6 caractères' : '••••••••'}
              minLength={6} disabled={loading} />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          {loading
            ? <><Loader className="w-5 h-5 animate-spin" /><span>{isRegister ? 'Création...' : 'Connexion...'}</span></>
            : <span>{isRegister ? 'Créer mon compte' : 'Se connecter'}</span>}
        </button>
      </form>

      <div className="mt-5 text-center space-y-2">
        <p className="text-sm text-gray-500">
          {isRegister ? 'Déjà un compte ?' : 'Pas encore de compte ?'}
          <button onClick={toggleMode} disabled={loading}
            className="ml-1 text-blue-600 hover:text-blue-700 font-semibold transition-colors">
            {isRegister ? 'Se connecter' : 'Créer un compte'}
          </button>
        </p>
        {!isRegister && (
          <button className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            Mot de passe oublié ?
          </button>
        )}
      </div>

      {/* Comptes démo — masqués en production */}
      {!isRegister && (
        <div className="mt-5 p-3 bg-blue-50 rounded-xl border border-blue-100">
          <p className="text-xs font-semibold text-blue-800 mb-1">🔑 Comptes de démonstration :</p>
          <div className="text-xs text-blue-700 space-y-0.5">
            <p><strong>Admin :</strong> admin@ecole.com / admin123</p>
            <p><strong>Prof :</strong> prof@ecole.com / prof123</p>
            <p><strong>Secrétaire :</strong> secret@ecole.com / secret123</p>
          </div>
        </div>
      )}
    </>
  );

  // ── Mode inline (page de connexion) ──────────────────────────────────────
  if (inline) {
    return (
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
          {isRegister ? '📝 Créer un compte' : '🔐 Connexion'}
        </h2>
        {formContent}
      </div>
    );
  }

  // ── Mode modal (ancien comportement) ─────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {isRegister ? '📝 Créer un compte' : '🔐 Connexion'}
          </h2>
          <button onClick={() => setShowLoginModal(false)}
            className="text-gray-500 hover:text-gray-700 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        {formContent}
      </div>
    </div>
  );
}