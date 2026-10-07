import { Clock, LogOut, RefreshCw } from 'lucide-react';

/**
 * Écran affiché à un compte qui vient de s'inscrire (rôle « en_attente ») : il n'a accès à
 * aucune donnée tant qu'un administrateur ne l'a pas validé dans « Utilisateurs ».
 */
export default function PendingApproval({ currentUser, onRefresh, onSignOut }) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-amber-600" />
                </div>
                <h1 className="text-xl font-bold text-gray-900 mb-2">Compte en attente de validation</h1>
                <p className="text-sm text-gray-600 mb-1">
                    Votre compte{currentUser?.email ? <> (<strong>{currentUser.email}</strong>)</> : null} a bien été créé.
                </p>
                <p className="text-sm text-gray-600 mb-6">
                    Pour protéger les données des élèves, l'administrateur de l'établissement doit le valider avant
                    que vous puissiez accéder à l'application. Contactez-le si cela tarde.
                </p>
                <div className="flex gap-3 justify-center">
                    <button
                        onClick={onRefresh}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" /> Vérifier maintenant
                    </button>
                    <button
                        onClick={onSignOut}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors"
                    >
                        <LogOut className="w-4 h-4" /> Se déconnecter
                    </button>
                </div>
            </div>
        </div>
    );
}
