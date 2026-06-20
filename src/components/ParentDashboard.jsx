import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, Award, BookOpen, CheckCircle } from 'lucide-react';

const getMention = (avg) => {
    const v = parseFloat(avg);
    if (isNaN(v) || v === 0) return { text: '—', color: '#9ca3af' };
    if (v >= 16) return { text: 'Très Bien', color: '#059669' };
    if (v >= 14) return { text: 'Bien', color: '#2563eb' };
    if (v >= 12) return { text: 'Assez Bien', color: '#7c3aed' };
    if (v >= 10) return { text: 'Passable', color: '#d97706' };
    return { text: 'Insuffisant', color: '#dc2626' };
};

export default function ParentDashboard({ child, calculateAverage, paymentStatus, rankData, onPrint, getStudentGrades }) {
    if (!child) return null;

    const avg = calculateAverage(child.id, '1'); // T1 par défaut
    const mention = getMention(avg);
    const status = paymentStatus[child.id];
    const rank = rankData[`${child.id}_1`];

    // Données pour le graphique d'évolution
    const evolutionData = [
        { trimestre: 'T1', moyenne: parseFloat(calculateAverage(child.id, '1')) || 0 },
        { trimestre: 'T2', moyenne: parseFloat(calculateAverage(child.id, '2')) || 0 },
        { trimestre: 'T3', moyenne: parseFloat(calculateAverage(child.id, '3')) || 0 },
    ];

    return (
        <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm">Moyenne</p>
                            <p className="text-3xl font-bold text-blue-600">{avg}/20</p>
                        </div>
                        <TrendingUp className="w-10 h-10 text-blue-400" />
                    </div>
                </div>

                <div className="bg-purple-50 rounded-2xl p-5 border border-purple-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm">Mention</p>
                            <p className="text-lg font-bold" style={{ color: mention.color }}>{mention.text}</p>
                        </div>
                        <Award className="w-10 h-10 text-purple-400" />
                    </div>
                </div>

                <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm">Classement</p>
                            <p className="text-2xl font-bold text-amber-600">
                                {rank ? `${rank.rang}/${rank.total}` : '—'}
                            </p>
                        </div>
                        <BookOpen className="w-10 h-10 text-amber-400" />
                    </div>
                </div>

                <div className={`rounded-2xl p-5 border ${status?.isPaid ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm">Paiement</p>
                            <p className={`text-lg font-bold ${status?.isPaid ? 'text-green-600' : 'text-red-600'}`}>
                                {status?.isPaid ? '✓ Payé' : '⚠ Dû'}
                            </p>
                        </div>
                        <CheckCircle className={`w-10 h-10 ${status?.isPaid ? 'text-green-400' : 'text-red-400'}`} />
                    </div>
                </div>
            </div>

            {/* Graphique d'évolution */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <h3 className="text-lg font-bold mb-4">📈 Évolution de la moyenne</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={evolutionData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="trimestre" />
                        <YAxis domain={[0, 20]} />
                        <Tooltip />
                        <Line type="monotone" dataKey="moyenne" stroke="#2563eb" strokeWidth={3} name="Moyenne" />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}