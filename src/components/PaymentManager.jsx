import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { usePayments } from '../hooks/usePayments';
import { Plus, Search, Printer, Trash2, CheckCircle, Clock, XCircle, TrendingUp, DollarSign, AlertTriangle, ChevronDown, BookOpen, ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import { supabase } from '../config/supabase';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n || 0) + ' FCFA';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

const STATUS_CONFIG = {
    paye: { label: 'Payé', color: '#059669', bg: '#ecfdf5', icon: CheckCircle },
    partiel: { label: 'Partiel', color: '#d97706', bg: '#fffbeb', icon: Clock },
    impaye: { label: 'Impayé', color: '#dc2626', bg: '#fef2f2', icon: XCircle },
};

const METHOD_LABELS = {
    especes: '💵 Espèces',
    mobile_money: '📱 Mobile Money',
    virement: '🏦 Virement',
    cheque: '📝 Chèque',
};

// ── Modal ajout paiement ──────────────────────────────────────────────────────
function PaymentModal({ isOpen, onClose, onSave, students, feeTypes, classes }) {
    const [studentId, setStudentId] = useState('');
    const [feeTypeId, setFeeTypeId] = useState('');
    const [amountPaid, setAmountPaid] = useState('');
    const [amountDue, setAmountDue] = useState('');
    const [method, setMethod] = useState('especes');
    const [notes, setNotes] = useState('');
    const [classFilter, setClassFilter] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const filteredStudents = classFilter
        ? students.filter(s => (s.classId || s.class_id) === classFilter)
        : students;

    const handleFeeChange = (id) => {
        setFeeTypeId(id);
        const fee = feeTypes.find(f => f.id === id);
        if (fee) setAmountDue(fee.amount.toString());
    };

    const handleSave = async () => {
        if (!studentId || !feeTypeId || !amountPaid || !amountDue) {
            setError('Tous les champs obligatoires doivent être remplis'); return;
        }
        setLoading(true); setError('');
        try {
            await onSave({ studentId, feeTypeId, amountPaid: parseFloat(amountPaid), amountDue: parseFloat(amountDue), paymentMethod: method, notes });
            setStudentId(''); setFeeTypeId(''); setAmountPaid(''); setAmountDue(''); setNotes('');
            onClose();
        } catch (e) { setError('Erreur : ' + e.message); }
        finally { setLoading(false); }
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-screen overflow-y-auto">
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900">💰 Enregistrer un paiement</h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">✕</button>
                </div>
                <div className="p-5 space-y-4">
                    {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}

                    {/* Filtre classe + Élève */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Classe</label>
                            <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                <option value="">Toutes</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Élève <span className="text-red-500">*</span></label>
                            <select value={studentId} onChange={e => setStudentId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                <option value="">Sélectionner</option>
                                {filteredStudents.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Type de frais */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type de frais <span className="text-red-500">*</span></label>
                        <select value={feeTypeId} onChange={e => handleFeeChange(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                            <option value="">Sélectionner</option>
                            {feeTypes.map(f => <option key={f.id} value={f.id}>{f.name} — {fmt(f.amount)}</option>)}
                        </select>
                    </div>

                    {/* Montants */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Montant dû (FCFA) <span className="text-red-500">*</span></label>
                            <input type="number" value={amountDue} onChange={e => setAmountDue(e.target.value)} placeholder="Ex: 150000" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Montant payé (FCFA) <span className="text-red-500">*</span></label>
                            <input type="number" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} placeholder="Ex: 75000" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                    </div>

                    {/* Solde restant */}
                    {amountDue && amountPaid && (
                        <div className={`px-3 py-2 rounded-lg text-sm font-semibold ${parseFloat(amountPaid) >= parseFloat(amountDue) ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                            {parseFloat(amountPaid) >= parseFloat(amountDue)
                                ? '✅ Paiement complet'
                                : `⚠️ Reste à payer : ${fmt(parseFloat(amountDue) - parseFloat(amountPaid))}`}
                        </div>
                    )}

                    {/* Mode de paiement */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Mode de paiement</label>
                        <div className="grid grid-cols-2 gap-2">
                            {Object.entries(METHOD_LABELS).map(([key, label]) => (
                                <button key={key} onClick={() => setMethod(key)}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition ${method === key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'}`}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optionnel)</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Remarques..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
                    </div>
                </div>
                <div className="flex gap-3 px-5 pb-5">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition">Annuler</button>
                    <button onClick={handleSave} disabled={loading} className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
                        {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '💾'}
                        Enregistrer
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Reçu PDF ──────────────────────────────────────────────────────────────────
function generateReceipt(payment, schoolInfo) {
    const student = payment.students;
    const feeName = payment.fee_types?.name || 'N/A';
    const reste = (payment.amount_due - payment.amount_paid);
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>Reçu ${payment.receipt_number}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1e293b; padding: 20mm; }
  .header { text-align: center; border-bottom: 3px double #2563eb; padding-bottom: 12px; margin-bottom: 16px; }
  .school-name { font-size: 18pt; font-weight: 800; color: #2563eb; }
  .school-info { font-size: 9pt; color: #64748b; margin-top: 3px; }
  .receipt-title { font-size: 14pt; font-weight: 700; text-align: center; background: #2563eb; color: white; padding: 8px; margin: 16px 0; border-radius: 6px; letter-spacing: 2px; }
  .receipt-number { text-align: right; font-size: 10pt; color: #64748b; margin-bottom: 16px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
  .info-box { border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 12px; }
  .info-box h4 { font-size: 8pt; text-transform: uppercase; color: #94a3b8; font-weight: 700; margin-bottom: 6px; }
  .info-box p { font-size: 10pt; font-weight: 600; line-height: 1.7; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #0f172a; color: white; padding: 8px 12px; text-align: left; font-size: 9pt; }
  td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 10pt; }
  .total-row td { background: #f8fafc; font-weight: 700; }
  .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 9pt; font-weight: 700;
    background: ${payment.status === 'paye' ? '#ecfdf5' : payment.status === 'partiel' ? '#fffbeb' : '#fef2f2'};
    color: ${payment.status === 'paye' ? '#059669' : payment.status === 'partiel' ? '#d97706' : '#dc2626'};
    border: 1.5px solid ${payment.status === 'paye' ? '#059669' : payment.status === 'partiel' ? '#d97706' : '#dc2626'};
  }
  .sigs { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 24px; }
  .sig-box { border: 1.5px dashed #cbd5e1; border-radius: 8px; padding: 12px; height: 70px; }
  .sig-label { font-size: 8pt; font-weight: 700; color: #64748b; text-transform: uppercase; }
  .footer { text-align: center; font-size: 8pt; color: #94a3b8; margin-top: 16px; border-top: 1px solid #e2e8f0; padding-top: 8px; }
  @page { size: A5; margin: 8mm; }
  @media print { body { padding: 0; } }
</style></head><body>
  <div class="header">
    <div class="school-name">${schoolInfo?.name || 'ÉTABLISSEMENT SCOLAIRE'}</div>
    <div class="school-info">${schoolInfo?.address || ''} ${schoolInfo?.phone ? '| ' + schoolInfo.phone : ''}</div>
  </div>
  <div class="receipt-title">REÇU DE PAIEMENT</div>
  <div class="receipt-number">N° <strong>${payment.receipt_number}</strong> &nbsp;|&nbsp; Date : <strong>${fmtDate(payment.payment_date)}</strong></div>
  <div class="info-grid">
    <div class="info-box">
      <h4>Élève</h4>
      <p>${student?.first_name} ${student?.last_name}<br><span style="color:#64748b;font-weight:400;font-size:9pt;">Année : ${payment.academic_year}</span></p>
    </div>
    <div class="info-box">
      <h4>Mode de paiement</h4>
      <p>${METHOD_LABELS[payment.payment_method] || payment.payment_method}</p>
    </div>
  </div>
  <table>
    <thead><tr><th>Désignation</th><th>Montant dû</th><th>Montant payé</th><th>Reste</th></tr></thead>
    <tbody>
      <tr>
        <td>${feeName}</td>
        <td>${fmt(payment.amount_due)}</td>
        <td style="color:#059669;font-weight:700;">${fmt(payment.amount_paid)}</td>
        <td style="color:${reste > 0 ? '#dc2626' : '#059669'};font-weight:700;">${fmt(reste)}</td>
      </tr>
      <tr class="total-row">
        <td colspan="2">Statut</td>
        <td colspan="2"><span class="status-badge">${STATUS_CONFIG[payment.status]?.label}</span></td>
      </tr>
    </tbody>
  </table>
  ${payment.notes ? `<p style="font-size:9pt;color:#64748b;font-style:italic;margin-bottom:12px;">Note : ${payment.notes}</p>` : ''}
  <div class="sigs">
    <div class="sig-box"><div class="sig-label">Signature du caissier</div></div>
    <div class="sig-box"><div class="sig-label">Signature du parent</div></div>
  </div>
  <div class="footer">${schoolInfo?.name || ''} — Reçu officiel — Conservez ce document</div>
</body></html>`;
    const win = window.open('', '_blank', 'width=700,height=600');
    if (!win) { alert('Autorisez les pop-ups pour imprimer.'); return; }
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.print(); setTimeout(() => win.close(), 500); }, 400);
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function PaymentManager({ students, classes, currentUser, schoolInfo, currentYear = '2024-2025' }) {
    const { payments, feeTypes, loading, addPayment, deletePayment, getStats } = usePayments(currentYear);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', onConfirm: null });
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterClass, setFilterClass] = useState('');
    const [activeTab, setActiveTab] = useState('liste'); // 'liste' | 'stats'

    const stats = getStats();

    // ── Accès bulletins ───────────────────────────────────────────────────────
    const [accessList, setAccessList] = useState([]); // { id, firstName, lastName, className, bulletin_access, totalPaid, totalDue }
    const [loadingAccess, setLoadingAccess] = useState(false);
    const [togglingId, setTogglingId] = useState(null);
    const [accessSearch, setAccessSearch] = useState('');
    const [accessClass, setAccessClass] = useState('');

    const fetchAccessList = useCallback(async () => {
        setLoadingAccess(true);
        const { data: stds } = await supabase
            .from('students')
            .select('id, first_name, last_name, bulletin_access, class_id, classes(name)')
            .order('last_name');

        const { data: pays } = await supabase
            .from('payments')
            .select('student_id, amount_paid, amount_due');

        if (!stds) { setLoadingAccess(false); return; }

        const list = stds.map(s => {
            const rows = (pays || []).filter(p => p.student_id === s.id);
            const totalPaid = rows.reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0);
            const totalDue = rows.reduce((sum, p) => sum + parseFloat(p.amount_due || 0), 0);
            return {
                id: s.id,
                firstName: s.first_name,
                lastName: s.last_name,
                className: s.classes?.name || '—',
                classId: s.class_id,
                bulletinAccess: s.bulletin_access,
                totalPaid,
                totalDue,
                isFullyPaid: totalDue > 0 && totalPaid >= totalDue,
            };
        });
        setAccessList(list);
        setLoadingAccess(false);
    }, []);

    useEffect(() => { fetchAccessList(); }, [fetchAccessList]);

    const toggleAccess = async (student) => {
        setTogglingId(student.id);
        const newVal = !student.bulletinAccess;
        await supabase
            .from('students')
            .update({ bulletin_access: newVal })
            .eq('id', student.id);
        setAccessList(prev =>
            prev.map(s => s.id === student.id ? { ...s, bulletinAccess: newVal } : s)
        );
        setTogglingId(null);
    };

    const grantAll = async () => {
        const ids = filteredAccessList.filter(s => !s.bulletinAccess).map(s => s.id);
        if (ids.length === 0) return;
        await supabase.from('students').update({ bulletin_access: true }).in('id', ids);
        setAccessList(prev => prev.map(s => ids.includes(s.id) ? { ...s, bulletinAccess: true } : s));
    };

    const revokeAll = async () => {
        const ids = filteredAccessList.filter(s => s.bulletinAccess).map(s => s.id);
        if (ids.length === 0) return;
        await supabase.from('students').update({ bulletin_access: false }).in('id', ids);
        setAccessList(prev => prev.map(s => ids.includes(s.id) ? { ...s, bulletinAccess: false } : s));
    };

    // Liste filtrée pour l'onglet accès bulletins
    const filteredAccessList = useMemo(() => {
        return accessList.filter(s => {
            const name = `${s.firstName} ${s.lastName}`.toLowerCase();
            const matchSearch = !accessSearch || name.includes(accessSearch.toLowerCase());
            const matchClass = !accessClass || s.classId === accessClass;
            return matchSearch && matchClass;
        });
    }, [accessList, accessSearch, accessClass]);

    // Filtres
    const filtered = useMemo(() => {
        return payments.filter(p => {
            const student = p.students;
            const name = `${student?.first_name} ${student?.last_name}`.toLowerCase();
            const matchSearch = !search || name.includes(search.toLowerCase()) || (p.receipt_number || '').toLowerCase().includes(search.toLowerCase());
            const matchStatus = !filterStatus || p.status === filterStatus;
            const matchClass = !filterClass || student?.class_id === filterClass;
            return matchSearch && matchStatus && matchClass;
        });
    }, [payments, search, filterStatus, filterClass]);

    const handleDelete = (payment) => {
        setConfirmModal({
            open: true,
            title: 'Supprimer ce paiement ?',
            message: `Le reçu ${payment.receipt_number} sera définitivement supprimé.`,
            onConfirm: async () => { await deletePayment(payment.id); setConfirmModal(m => ({ ...m, open: false })); }
        });
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500">Chargement des paiements...</p>
        </div>
    );

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">💰 Gestion des Paiements</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Suivi des frais scolaires — {currentYear}</p>
                </div>
                {(currentUser?.role === 'admin' || currentUser?.role === 'secretaire') && (
                    <button onClick={() => setPaymentModalOpen(true)} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition-colors font-semibold">
                        <Plus className="w-4 h-4" /> Enregistrer un paiement
                    </button>
                )}
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                    { label: 'Total dû', value: fmt(stats.totalDu), color: '#1e40af', bg: '#eff6ff' },
                    { label: 'Total payé', value: fmt(stats.totalPaye), color: '#059669', bg: '#ecfdf5' },
                    { label: 'Reste', value: fmt(stats.totalReste), color: '#dc2626', bg: '#fef2f2' },
                    { label: '✅ Payés', value: stats.nbPaye, color: '#059669', bg: '#ecfdf5' },
                    { label: '⏳ Partiels', value: stats.nbPartiel, color: '#d97706', bg: '#fffbeb' },
                    { label: '❌ Impayés', value: stats.nbImpaye, color: '#dc2626', bg: '#fef2f2' },
                ].map((kpi, i) => (
                    <div key={i} className="rounded-xl p-3 text-center border border-gray-100" style={{ background: kpi.bg }}>
                        <div className="text-sm font-black" style={{ color: kpi.color }}>{kpi.value}</div>
                        <div className="text-xs text-gray-500 font-medium mt-0.5">{kpi.label}</div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200">
                {[
                    { key: 'liste', label: '📋 Paiements' },
                    { key: 'acces', label: '🔓 Accès bulletins' },
                ].map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === tab.key
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── Onglet Accès bulletins ── */}
            {activeTab === 'acces' && (
                <div className="space-y-4">

                    {/* En-tête + actions globales */}
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <BookOpen className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="font-bold text-blue-800 text-sm">Gestion des accès aux bulletins</p>
                                <p className="text-blue-600 text-xs mt-0.5">
                                    Activez ou désactivez l'accès au bulletin pour chaque élève, indépendamment de son statut de paiement.
                                </p>
                            </div>
                        </div>
                        <button onClick={fetchAccessList} className="p-1.5 text-blue-500 hover:bg-blue-100 rounded-lg transition-colors flex-shrink-0" title="Actualiser">
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Compteurs rapides */}
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { label: 'Accès activé', value: accessList.filter(s => s.bulletinAccess).length, color: '#059669', bg: '#ecfdf5' },
                            { label: 'Accès bloqué', value: accessList.filter(s => !s.bulletinAccess).length, color: '#dc2626', bg: '#fef2f2' },
                            { label: 'Totalement payé', value: accessList.filter(s => s.isFullyPaid).length, color: '#2563eb', bg: '#eff6ff' },
                        ].map((k, i) => (
                            <div key={i} className="rounded-xl p-3 text-center border" style={{ background: k.bg, borderColor: k.color + '33' }}>
                                <div className="text-2xl font-black" style={{ color: k.color }}>{k.value}</div>
                                <div className="text-xs font-semibold text-gray-500 mt-0.5">{k.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Recherche + Filtre classe */}
                    <div className="flex gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={accessSearch}
                                onChange={e => setAccessSearch(e.target.value)}
                                placeholder="Rechercher un élève..."
                                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <select
                            value={accessClass}
                            onChange={e => setAccessClass(e.target.value)}
                            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none min-w-[140px]"
                        >
                            <option value="">Toutes les classes</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    {/* Actions groupées (sur la sélection filtrée) */}
                    <div className="flex gap-3">
                        <button onClick={grantAll}
                            className="flex-1 flex items-center justify-center gap-2 bg-green-50 border border-green-200 text-green-700 font-semibold text-sm py-2.5 rounded-xl hover:bg-green-100 transition-colors">
                            <ToggleRight className="w-4 h-4" />
                            Tout autoriser {accessSearch || accessClass ? '(filtrés)' : ''}
                        </button>
                        <button onClick={revokeAll}
                            className="flex-1 flex items-center justify-center gap-2 bg-red-50 border border-red-200 text-red-700 font-semibold text-sm py-2.5 rounded-xl hover:bg-red-100 transition-colors">
                            <ToggleLeft className="w-4 h-4" />
                            Tout bloquer {accessSearch || accessClass ? '(filtrés)' : ''}
                        </button>
                    </div>

                    {/* Liste élèves */}
                    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="font-bold text-gray-800 text-sm">Liste des élèves</h3>
                            <span className="text-xs text-gray-400">
                                {filteredAccessList.length} élève{filteredAccessList.length > 1 ? 's' : ''}
                                {(accessSearch || accessClass) && ` sur ${accessList.length}`}
                            </span>
                        </div>

                        {loadingAccess ? (
                            <div className="flex items-center justify-center py-10 gap-3">
                                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                <span className="text-sm text-gray-400">Chargement...</span>
                            </div>
                        ) : filteredAccessList.length === 0 ? (
                            <div className="py-10 text-center">
                                <p className="text-sm text-gray-400">Aucun élève trouvé</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {filteredAccessList.map(student => {
                                    const pct = student.totalDue > 0 ? Math.round((student.totalPaid / student.totalDue) * 100) : null;
                                    const isToggling = togglingId === student.id;
                                    return (
                                        <div key={student.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                                            {/* Avatar */}
                                            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                                style={{ background: student.bulletinAccess ? 'linear-gradient(135deg,#059669,#10b981)' : 'linear-gradient(135deg,#9ca3af,#6b7280)' }}>
                                                {student.firstName?.[0]}{student.lastName?.[0]}
                                            </div>

                                            {/* Nom + classe */}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-gray-800 text-sm">{student.firstName} {student.lastName}</p>
                                                <p className="text-xs text-gray-400">{student.className}</p>
                                            </div>

                                            {/* Situation paiement */}
                                            <div className="hidden md:block text-right min-w-[140px]">
                                                {student.totalDue > 0 ? (
                                                    <>
                                                        <p className="text-xs font-semibold" style={{ color: student.isFullyPaid ? '#059669' : '#d97706' }}>
                                                            {pct}% réglé
                                                        </p>
                                                        <p className="text-xs text-gray-400">
                                                            {fmt(student.totalPaid)} / {fmt(student.totalDue)}
                                                        </p>
                                                    </>
                                                ) : (
                                                    <p className="text-xs text-gray-400 italic">Aucun frais enregistré</p>
                                                )}
                                            </div>

                                            {/* Statut + Toggle */}
                                            <div className="flex items-center gap-3 flex-shrink-0">
                                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${student.bulletinAccess ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                    {student.bulletinAccess ? '🔓 Autorisé' : '🔒 Bloqué'}
                                                </span>
                                                <button
                                                    onClick={() => toggleAccess(student)}
                                                    disabled={isToggling}
                                                    className="relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none disabled:opacity-60"
                                                    style={{ background: student.bulletinAccess ? '#059669' : '#d1d5db' }}
                                                    title={student.bulletinAccess ? "Bloquer l'accès" : "Autoriser l'accès"}
                                                >
                                                    {isToggling
                                                        ? <span className="absolute inset-0 flex items-center justify-center"><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /></span>
                                                        : <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300"
                                                            style={{ transform: student.bulletinAccess ? 'translateX(24px)' : 'translateX(0)' }} />
                                                    }
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Onglet Paiements ── */}
            {activeTab === 'liste' && (<>

                {stats.totalDu > 0 && (
                    <div className="bg-white border border-gray-100 rounded-xl p-4">
                        <div className="flex justify-between text-sm font-semibold text-gray-700 mb-2">
                            <span>Taux de recouvrement</span>
                            <span style={{ color: '#059669' }}>{((stats.totalPaye / stats.totalDu) * 100).toFixed(1)}%</span>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all" style={{ width: `${Math.min((stats.totalPaye / stats.totalDu) * 100, 100)}%` }} />
                        </div>
                    </div>
                )}

                {/* Filtres */}
                <div className="flex flex-wrap gap-3">
                    <div className="flex-1 min-w-48 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher élève ou N° reçu..." className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="">Tous les statuts</option>
                        <option value="paye">✅ Payé</option>
                        <option value="partiel">⏳ Partiel</option>
                        <option value="impaye">❌ Impayé</option>
                    </select>
                    <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="">Toutes les classes</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>

                {/* Liste des paiements */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                        <h3 className="font-bold text-gray-800">Historique des paiements</h3>
                        <span className="text-sm text-gray-400">{filtered.length} enregistrement{filtered.length > 1 ? 's' : ''}</span>
                    </div>

                    {filtered.length === 0 ? (
                        <div className="py-16 text-center">
                            <DollarSign className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                            <p className="text-gray-400">Aucun paiement enregistré</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {['N° Reçu', 'Élève', 'Frais', 'Dû', 'Payé', 'Reste', 'Mode', 'Date', 'Statut', 'Actions'].map(h => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filtered.map(payment => {
                                        const student = payment.students;
                                        const sc = STATUS_CONFIG[payment.status] || STATUS_CONFIG.impaye;
                                        const reste = payment.amount_due - payment.amount_paid;
                                        return (
                                            <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3 text-xs font-mono text-gray-600 whitespace-nowrap">{payment.receipt_number}</td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="font-semibold text-sm text-gray-900">{student?.first_name} {student?.last_name}</div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{payment.fee_types?.name}</td>
                                                <td className="px-4 py-3 text-sm font-semibold text-gray-700 whitespace-nowrap">{fmt(payment.amount_due)}</td>
                                                <td className="px-4 py-3 text-sm font-bold whitespace-nowrap" style={{ color: '#059669' }}>{fmt(payment.amount_paid)}</td>
                                                <td className="px-4 py-3 text-sm font-bold whitespace-nowrap" style={{ color: reste > 0 ? '#dc2626' : '#059669' }}>{fmt(reste)}</td>
                                                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{METHOD_LABELS[payment.payment_method]}</td>
                                                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(payment.payment_date)}</td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ color: sc.color, background: sc.bg }}>
                                                        {sc.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={() => generateReceipt(payment, schoolInfo)} title="Imprimer le reçu" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                            <Printer className="w-4 h-4" />
                                                        </button>
                                                        {currentUser?.role === 'admin' && (
                                                            <button onClick={() => handleDelete(payment)} title="Supprimer" className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Modals — toujours montés pour fonctionner correctement */}
                <PaymentModal
                    isOpen={paymentModalOpen}
                    onClose={() => setPaymentModalOpen(false)}
                    onSave={addPayment}
                    students={students}
                    feeTypes={feeTypes}
                    classes={classes}
                />

                <ConfirmModal
                    isOpen={confirmModal.open}
                    onClose={() => setConfirmModal(m => ({ ...m, open: false }))}
                    onConfirm={confirmModal.onConfirm}
                    title={confirmModal.title}
                    message={confirmModal.message}
                />
            </>)}
        </div>
    );
}