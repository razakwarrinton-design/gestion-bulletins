import React, { useState } from 'react';
import { Image, Users, Plus, Trash2, Activity, Download } from 'lucide-react';
import MFAManager from './MFAManager';

export default function Settings({
    schoolLogo,
    handleLogoUpload,
    schoolInfo,
    updateSchoolInfo,
    appColors,
    updateColor,
    currentUser,
    handleRegister,
    showNotification,
    activities
}) {
    const [filterRole, setFilterRole] = useState('all');
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">⚙️ Paramètres et Personnalisation</h2>

            {/* Gestion des utilisateurs (Admin uniquement) */}
            {currentUser?.role === 'admin' && (
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-xl font-bold mb-4 flex items-center">
                        <Users className="w-6 h-6 mr-2 text-purple-600" />
                        Gestion des utilisateurs
                    </h3>

                    <button
                        onClick={() => {
                            const email = prompt('Email du nouvel utilisateur:');
                            if (!email) return;

                            const password = prompt('Mot de passe:');
                            if (!password) return;

                            const firstName = prompt('Prénom:');
                            if (!firstName) return;

                            const lastName = prompt('Nom:');
                            if (!lastName) return;

                            const role = prompt('Rôle (professeur/admin):', 'professeur');

                            if (role === 'professeur' || role === 'admin') {
                                handleRegister(email, password, firstName, lastName, role);
                            } else {
                                alert('Rôle invalide. Utilisez "professeur" ou "admin"');
                            }
                        }}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors mb-4 flex items-center space-x-2"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Créer un compte Professeur/Admin</span>
                    </button>

                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                        <p className="text-sm text-blue-800">
                            <strong>Note :</strong> Avec l'authentification Supabase, les utilisateurs sont maintenant gérés dans Authentication → Users dans votre dashboard Supabase.
                            <br />
                            <a
                                href="https://supabase.com/dashboard"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 underline hover:text-blue-800 mt-2 inline-block"
                            >
                                Gérer les utilisateurs dans Supabase →
                            </a>
                        </p>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center">
                    <Image className="w-6 h-6 mr-2 text-blue-600" />
                    Logo de l'établissement
                </h3>

                <div className="flex items-center space-x-6">
                    {schoolLogo && (
                        <div className="w-32 h-32 border-2 border-gray-300 rounded-lg overflow-hidden">
                            <img src={schoolLogo} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                    )}

                    <div className="flex-1">
                        <p className="text-sm text-gray-600 mb-3">Téléchargez le logo de votre établissement (PNG, JPG)</p>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold mb-4">🏫 Informations de l'établissement</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Nom de l'établissement:</label>
                        <input
                            type="text"
                            value={schoolInfo.name}
                            onChange={(e) => updateSchoolInfo('name', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Ex: Collège Jean Moulin"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Adresse:</label>
                        <input
                            type="text"
                            value={schoolInfo.address}
                            onChange={(e) => updateSchoolInfo('address', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Ex: 123 Rue de l'École, Paris"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Téléphone:</label>
                        <input
                            type="text"
                            value={schoolInfo.phone}
                            onChange={(e) => updateSchoolInfo('phone', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Ex: 01 23 45 67 89"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Email:</label>
                        <input
                            type="email"
                            value={schoolInfo.email}
                            onChange={(e) => updateSchoolInfo('email', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Ex: contact@ecole.fr"
                        />
                    </div>
                </div>
            </div>
            {/* ── Section pays / ministère ── */}
            <div className="mt-6 pt-4 border-t border-gray-100">
                <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    🌍 En-tête officiel (affiché sur les bulletins)
                </h4>
                <div className="grid grid-cols-1 gap-3">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                            République / Pays
                        </label>
                        <input
                            type="text"
                            value={schoolInfo.republic || ''}
                            onChange={e => updateSchoolInfo('republic', e.target.value)}
                            className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                            placeholder="ex: REPUBLIQUE TOGOLAISE"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                            Devise nationale
                        </label>
                        <input
                            type="text"
                            value={schoolInfo.countryMotto || ''}
                            onChange={e => updateSchoolInfo('countryMotto', e.target.value)}
                            className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                            placeholder="ex: Travail · Liberté · Patrie"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                            Ministère de tutelle
                        </label>
                        <input
                            type="text"
                            value={schoolInfo.ministry || ''}
                            onChange={e => updateSchoolInfo('ministry', e.target.value)}
                            className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                            placeholder="ex: Ministère des Enseignements Primaire et Secondaire"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                            Devise de l'école
                        </label>
                        <input
                            type="text"
                            value={schoolInfo.devise || ''}
                            onChange={e => updateSchoolInfo('devise', e.target.value)}
                            className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                            placeholder="ex: L'excellence avant tout"
                        />
                    </div>
                </div>
            </div>

            {/* ── Signatures des bulletins ── */}
            <div className="mt-4 pt-4 border-t border-gray-100">
                <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    ✍️ Signatures numériques des bulletins
                </h4>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                            Nom du Directeur
                        </label>
                        <input
                            type="text"
                            value={schoolInfo.directorName || ''}
                            onChange={e => updateSchoolInfo('directorName', e.target.value)}
                            className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                            placeholder="M. / Mme ..."
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                            Professeur Principal
                        </label>
                        <input
                            type="text"
                            value={schoolInfo.principalTeacher || ''}
                            onChange={e => updateSchoolInfo('principalTeacher', e.target.value)}
                            className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                            placeholder="M. / Mme ..."
                        />
                    </div>
                </div>
            </div>


            <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold mb-4">🎨 Thème de couleurs</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-medium mb-2">Couleur principale:</label>
                        <div className="flex items-center space-x-3">
                            <input
                                type="color"
                                value={appColors.primary}
                                onChange={(e) => updateColor('primary', e.target.value)}
                                className="w-16 h-16 rounded-lg cursor-pointer border-2 border-gray-300"
                            />
                            <div className="flex-1">
                                <input
                                    type="text"
                                    value={appColors.primary}
                                    onChange={(e) => updateColor('primary', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg font-mono text-sm"
                                />
                                <p className="text-xs text-gray-500 mt-1">Utilisée pour les en-têtes</p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Couleur secondaire:</label>
                        <div className="flex items-center space-x-3">
                            <input
                                type="color"
                                value={appColors.secondary}
                                onChange={(e) => updateColor('secondary', e.target.value)}
                                className="w-16 h-16 rounded-lg cursor-pointer border-2 border-gray-300"
                            />
                            <div className="flex-1">
                                <input
                                    type="text"
                                    value={appColors.secondary}
                                    onChange={(e) => updateColor('secondary', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg font-mono text-sm"
                                />
                                <p className="text-xs text-gray-500 mt-1">Boutons de succès</p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Couleur accent:</label>
                        <div className="flex items-center space-x-3">
                            <input
                                type="color"
                                value={appColors.accent}
                                onChange={(e) => updateColor('accent', e.target.value)}
                                className="w-16 h-16 rounded-lg cursor-pointer border-2 border-gray-300"
                            />
                            <div className="flex-1">
                                <input
                                    type="text"
                                    value={appColors.accent}
                                    onChange={(e) => updateColor('accent', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg font-mono text-sm"
                                />
                                <p className="text-xs text-gray-500 mt-1">Éléments d'accentuation</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 p-6 bg-gray-50 rounded-lg">
                    <h4 className="font-bold mb-3">Aperçu des couleurs:</h4>
                    <div className="flex space-x-3">
                        <div
                            className="flex-1 h-24 rounded-lg flex items-center justify-center text-white font-bold shadow-md"
                            style={{ backgroundColor: appColors.primary }}
                        >
                            Principale
                        </div>
                        <div
                            className="flex-1 h-24 rounded-lg flex items-center justify-center text-white font-bold shadow-md"
                            style={{ backgroundColor: appColors.secondary }}
                        >
                            Secondaire
                        </div>
                        <div
                            className="flex-1 h-24 rounded-lg flex items-center justify-center text-white font-bold shadow-md"
                            style={{ backgroundColor: appColors.accent }}
                        >
                            Accent
                        </div>
                    </div>
                </div>

                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                    <h4 className="font-bold text-yellow-800 mb-2">💡 Astuce</h4>
                    <p className="text-sm text-yellow-700">Les modifications sont sauvegardées automatiquement et seront appliquées aux prochains bulletins générés.</p>
                </div>
            </div>

            {/* Historique des activités (Admin uniquement) */}
            {currentUser?.role === 'admin' && (
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-xl font-bold mb-4 flex items-center">
                        <Activity className="w-6 h-6 mr-2 text-green-600" />
                        Historique des activités
                    </h3>

                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-2">Filtrer par rôle:</label>
                        <select
                            value={filterRole}
                            onChange={(e) => setFilterRole(e.target.value)}
                            className="w-full md:w-64 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="all">Tous les rôles</option>
                            <option value="admin">Admin</option>
                            <option value="professeur">Professeur</option>
                            <option value="secretaire">Secrétaire</option>
                        </select>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Date/Heure</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Utilisateur</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Rôle</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Action</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Détails</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {activities
                                    .filter(activity => filterRole === 'all' || activity.userRole === filterRole)
                                    .slice(0, 50)
                                    .map(activity => (
                                        <tr key={activity.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-2 text-sm whitespace-nowrap">
                                                {new Date(activity.timestamp).toLocaleString('fr-FR')}
                                            </td>
                                            <td className="px-4 py-2 text-sm">{activity.user}</td>
                                            <td className="px-4 py-2">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${activity.userRole === 'admin' ? 'bg-red-100 text-red-800' :
                                                    activity.userRole === 'professeur' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-green-100 text-green-800'
                                                    }`}>
                                                    {activity.userRole === 'admin' ? '👨‍💼 Admin' :
                                                        activity.userRole === 'professeur' ? '👨‍🏫 Professeur' :
                                                            '💼 Secrétaire'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 text-sm font-medium">{activity.action}</td>
                                            <td className="px-4 py-2 text-sm text-gray-600">{activity.details}</td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                        {activities.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                <p>Aucune activité enregistrée</p>
                            </div>
                        )}
                    </div>

                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-700">
                            <strong>Total:</strong> {activities.filter(a => filterRole === 'all' || a.userRole === filterRole).length} activités enregistrées
                        </p>
                    </div>
                </div>
            )}
            {/* ── Section Sécurité 2FA ─────────────────────────────────── */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <MFAManager showNotification={showNotification} />
            </div>

        </div>
    );
}