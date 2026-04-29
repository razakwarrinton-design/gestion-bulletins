import React, { useState } from 'react';
import { X, Eye, EyeOff, Loader } from 'lucide-react';

export default function LoginModalSupabase({
  isRegister,
  setIsRegister,
  setShowLoginModal,
  onSignIn,
  onSignUp,
  loading
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
      // Inscription
      if (password.length < 6) {
        setError('Le mot de passe doit contenir au moins 6 caractères');
        return;
      }

      const result = await onSignUp(email, password, firstName, lastName, role);
      
      if (result.success) {
        setShowLoginModal(false);
        alert('Compte créé avec succès ! Vérifiez votre email pour confirmer votre compte.');
      } else {
        setError(result.error || 'Erreur lors de la création du compte');
      }
    } else {
      // Connexion
      const result = await onSignIn(email, password);
      
      if (result.success) {
        setShowLoginModal(false);
      } else {
        setError(result.error || 'Email ou mot de passe incorrect');
      }
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setRole('secretaire');
    setError('');
  };

  const toggleMode = () => {
    setIsRegister(!isRegister);
    resetForm();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {isRegister ? '📝 Créer un compte' : '🔐 Connexion'}
          </h2>
          <button
            onClick={() => setShowLoginModal(false)}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Prénom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Jean"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Nom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Dupont"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Rôle <span className="text-red-500">*</span>
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  disabled={loading}
                >
                  <option value="secretaire">👨‍💼 Secrétaire</option>
                  <option value="professeur">👨‍🏫 Professeur</option>
                  <option value="admin">🔧 Administrateur</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Les comptes seront validés par un administrateur
                </p>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="email@exemple.com"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Mot de passe <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-10"
                placeholder={isRegister ? 'Minimum 6 caractères' : '••••••••'}
                minLength={6}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                disabled={loading}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {isRegister && (
              <p className="text-xs text-gray-500 mt-1">
                Le mot de passe doit contenir au moins 6 caractères
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>{isRegister ? 'Création...' : 'Connexion...'}</span>
              </>
            ) : (
              <span>{isRegister ? 'Créer mon compte' : 'Se connecter'}</span>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            {isRegister ? 'Vous avez déjà un compte ?' : 'Pas encore de compte ?'}
          </p>
          <button
            onClick={toggleMode}
            disabled={loading}
            className="mt-2 text-blue-600 hover:text-blue-700 font-medium transition-colors disabled:opacity-50"
          >
            {isRegister ? 'Se connecter' : 'Créer un compte'}
          </button>
        </div>

        {!isRegister && (
          <div className="mt-4 text-center">
            <button
              onClick={() => alert('Fonctionnalité de réinitialisation à venir')}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              disabled={loading}
            >
              Mot de passe oublié ?
            </button>
          </div>
        )}

        {/* Comptes de démonstration */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-xs font-medium text-blue-800 mb-2">🔑 Comptes de démonstration :</p>
          <div className="text-xs text-blue-700 space-y-1">
            <p><strong>Admin :</strong> admin@ecole.com / admin123</p>
            <p><strong>Professeur :</strong> prof@ecole.com / prof123</p>
            <p><strong>Secrétaire :</strong> secret@ecole.com / secret123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
