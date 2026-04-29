import React, { useState } from 'react';
import { BarChart3, TrendingDown, AlertCircle, Award } from 'lucide-react';
import { calculateClassStats, calculateStudentRank, isAtRisk } from '../utils/calculUtils';

/**
 * Composant: Analyse avancée des performances
 * Affiche statistiques, tendances, alertes
 */
export default function AdvancedAnalytics({
  students,
  classes,
  grades,
  subjects,
  selectedClass,
  selectedTrimester,
  calculateTrimesterAverage,
  getMention
}) {
  const classStudents = students.filter(s => s.classId === selectedClass);
  const classInfo = classes.find(c => c.id === selectedClass);

  // Calculer les statistiques
  const stats = calculateClassStats(classStudents, selectedTrimester, grades, subjects);

  // Élèves et leurs scores
  const studentScores = classStudents
    .map(student => {
      const average = calculateTrimesterAverage(student.id, selectedTrimester, grades, subjects);
      const rank = calculateStudentRank(student.id, selectedTrimester, classStudents, grades, subjects);
      return {
        student,
        average,
        mention: getMention(average),
        rank: rank.rank,
        percentile: rank.percentile,
        atRisk: isAtRisk(average)
      };
    })
    .sort((a, b) => b.average - a.average);

  // Élèves en risque
  const atRiskStudents = studentScores.filter(s => s.atRisk);

  // Distribution des notes
  const distribution = {
    excellent: studentScores.filter(s => s.average >= 18).length,
    veryGood: studentScores.filter(s => s.average >= 16 && s.average < 18).length,
    good: studentScores.filter(s => s.average >= 14 && s.average < 16).length,
    decent: studentScores.filter(s => s.average >= 12 && s.average < 14).length,
    acceptable: studentScores.filter(s => s.average >= 10 && s.average < 12).length,
    poor: studentScores.filter(s => s.average < 10).length
  };

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold flex items-center space-x-2">
        <BarChart3 className="w-6 h-6 text-indigo-600" />
        <span>Analyse avancée - {classInfo?.name} - Trimestre {selectedTrimester}</span>
      </h3>

      {/* Cards de statistiques clés */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border-l-4 border-blue-500">
            <p className="text-xs text-blue-600 font-semibold">MOYENNE</p>
            <p className="text-2xl font-bold text-blue-800">{stats.mean.toFixed(2)}</p>
            <p className="text-xs text-blue-600 mt-1">Classe</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border-l-4 border-green-500">
            <p className="text-xs text-green-600 font-semibold">MÉDIANE</p>
            <p className="text-2xl font-bold text-green-800">{stats.median.toFixed(2)}</p>
            <p className="text-xs text-green-600 mt-1">Valeur centrale</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border-l-4 border-purple-500">
            <p className="text-xs text-purple-600 font-semibold">PLAGE</p>
            <p className="text-2xl font-bold text-purple-800">
              {stats.min.toFixed(1)}-{stats.max.toFixed(1)}
            </p>
            <p className="text-xs text-purple-600 mt-1">Min - Max</p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border-l-4 border-orange-500">
            <p className="text-xs text-orange-600 font-semibold">ÉCART-TYPE</p>
            <p className="text-2xl font-bold text-orange-800">{stats.stdDev.toFixed(2)}</p>
            <p className="text-xs text-orange-600 mt-1">Dispersion</p>
          </div>
        </div>
      )}

      {/* Distribution des mentions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h4 className="font-bold mb-4">📊 Distribution des mentions</h4>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-lg">🌟</span>
            </div>
            <div>
              <p className="text-xs text-gray-600">Excellent (≥18)</p>
              <p className="text-lg font-bold">{distribution.excellent}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center">
              <span className="text-lg">⭐</span>
            </div>
            <div>
              <p className="text-xs text-gray-600">Très bien (16-17)</p>
              <p className="text-lg font-bold">{distribution.veryGood}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-lg">👍</span>
            </div>
            <div>
              <p className="text-xs text-gray-600">Bien (14-15)</p>
              <p className="text-lg font-bold">{distribution.good}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-lg">👌</span>
            </div>
            <div>
              <p className="text-xs text-gray-600">Assez bien (12-13)</p>
              <p className="text-lg font-bold">{distribution.decent}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-lg">⚠️</span>
            </div>
            <div>
              <p className="text-xs text-gray-600">Acceptable (10-11)</p>
              <p className="text-lg font-bold">{distribution.acceptable}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-red-200 rounded-full flex items-center justify-center">
              <span className="text-lg">❌</span>
            </div>
            <div>
              <p className="text-xs text-gray-600">Insuffisant (&lt;10)</p>
              <p className="text-lg font-bold">{distribution.poor}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alertes - Élèves en risque */}
      {atRiskStudents.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <h4 className="font-bold text-red-900">Élèves en difficulté ({atRiskStudents.length})</h4>
          </div>
          
          <div className="space-y-2">
            {atRiskStudents.map(s => (
              <div key={s.student.id} className="bg-white rounded p-3 flex justify-between items-center">
                <div>
                  <p className="font-semibold text-sm text-gray-900">
                    {s.student.lastName} {s.student.firstName}
                  </p>
                  <p className="text-xs text-gray-500">Moyenne: {s.average.toFixed(2)}/20</p>
                </div>
                <span className="text-sm font-bold text-red-600">{s.mention.text}</span>
              </div>
            ))}
          </div>
          
          <p className="text-xs text-red-800 mt-4">
            💡 Conseil: Envisager une aide pédagogique ou un suivi personnalisé
          </p>
        </div>
      )}

      {/* Top 5 meilleurs élèves */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h4 className="font-bold mb-4 flex items-center space-x-2">
          <Award className="w-5 h-5 text-yellow-600" />
          <span>🏆 Top 5 de la classe</span>
        </h4>

        <div className="space-y-2">
          {studentScores.slice(0, 5).map((s, idx) => (
            <div key={s.student.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
              <span className="text-2xl font-bold text-gray-400 w-8">
                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`}
              </span>
              <div className="flex-1">
                <p className="font-semibold">{s.student.lastName} {s.student.firstName}</p>
                <p className="text-xs text-gray-500">Rang: {s.rank}/{classStudents.length}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-blue-600">{s.average.toFixed(2)}</p>
                <p className="text-xs" style={{ color: s.mention.color }}>
                  {s.mention.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tendances par matière */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h4 className="font-bold mb-4 flex items-center space-x-2">
          <TrendingDown className="w-5 h-5 text-blue-600" />
          <span>📈 Moyennes par matière</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subjects.map(subject => {
            const subjectAverages = classStudents
              .map(s => {
                const subjectGrades = grades.filter(g =>
                  g.studentId === s.id &&
                  g.subjectId === subject.id &&
                  g.trimester === selectedTrimester
                );
                if (subjectGrades.length === 0) return 0;
                return subjectGrades.reduce((sum, g) => sum + g.value, 0) / subjectGrades.length;
              })
              .filter(a => a > 0);

            if (subjectAverages.length === 0) return null;

            const avg = subjectAverages.reduce((a, b) => a + b, 0) / subjectAverages.length;
            const minAvg = Math.min(...subjectAverages);
            const maxAvg = Math.max(...subjectAverages);

            return (
              <div key={subject.id} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4">
                <p className="font-bold text-sm mb-2">{subject.name}</p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Moyenne:</span>
                    <span className="font-bold">{avg.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Min - Max:</span>
                    <span>{minAvg.toFixed(2)} - {maxAvg.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Écart:</span>
                    <span>{(maxAvg - minAvg).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Indicateurs de qualité */}
      <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-6">
        <h4 className="font-bold mb-3">📋 Indicateurs de qualité</h4>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span>% d'élèves avec mention bien ou mieux</span>
            <span className="font-bold text-blue-600">
              {Math.round((distribution.excellent + distribution.veryGood + distribution.good) / classStudents.length * 100)}%
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span>% d'élèves en difficulté</span>
            <span className="font-bold text-red-600">
              {Math.round(atRiskStudents.length / classStudents.length * 100)}%
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span>Homogénéité de la classe (σ)</span>
            <span className="font-bold">
              {stats?.stdDev ? (stats.stdDev > 3 ? '⚠️ Hétérogène' : '✓ Homogène') : '-'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
