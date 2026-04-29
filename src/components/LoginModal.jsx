import React from 'react';
import { X } from 'lucide-react';

export default function LoginModal({
  isRegister,
  setIsRegister,
  registerData,
  setRegisterData,
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  setShowLoginModal,
  handleLogin,
  handleRegister
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (isRegister) {
      if (handleRegister(registerData)) {
        setIsRegister(false);
        setLoginEmail(registerData.email);
        setLoginPassword(registerData.password);
        setRegisterData({
          email: '',
          password: '',
          firstName: '',
          lastName: '',
              role: 'secretaire'
        });
      }
    } else {
      handleLogin(loginEmail, loginPassword);
    }
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
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Prénom:</label>
                <input
                  type="text"
                  required
                  value={registerData.firstName}
                  onChange={(e) => setRegisterData({ ...registerData, firstName: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Jean"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Nom:</label>
                <input
                  type="text"
                  required
                  value={registerData.lastName}
                  onChange={(e) => setRegisterData({ ...registerData, lastName: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Dupont"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Rôle:</label>
                <select
                  value={registerData.role}
                  onChange={(e) => setRegisterData({ ...registerData, role: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled
                >
                  <option value="secretaire">Secrétaire</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Les comptes professeurs sont créés par l'administrateur</p>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Email:</label>
            <input
              type="email"
              required
              value={isRegister ? registerData.email : loginEmail}
              onChange={(e) => isRegister
                ? setRegisterData({ ...registerData, email: e.target.value })
                : setLoginEmail(e.target.value)
              }
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="email@exemple.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Mot de passe:</label>
            <input
              type="password"
              required
              value={isRegister ? registerData.password : loginPassword}
              onChange={(e) => isRegister
                ? setRegisterData({ ...registerData, password: e.target.value })
                : setLoginPassword(e.target.value)
              }
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            {isRegister ? 'Créer mon compte' : 'Se connecter'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-blue-600 hover:underline text-sm"
          >
            {isRegister ? 'Déjà un compte ? Se connecter' : 'Créer un compte'}
          </button>
        </div>

        {!isRegister && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-800 font-bold mb-2">🔐 Comptes de test :</p>
            <p className="text-xs text-blue-700">Admin: admin@ecole.com / admin123</p>
          </div>
        )}
      </div>
    </div>
  );
}
