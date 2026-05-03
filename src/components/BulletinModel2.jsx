/**
 * BULLETIN MODEL 2 — Minimaliste Officiel Impression
 * Style : Administratif, A4, Noir/Blanc compatible, typographie académique
 * Usage : <BulletinModel2 student={...} grades={...} subjects={...} ... />
 */
import React, { useMemo } from 'react';

// ─── Données de démo ───────────────────────────────────────────────────────────
const DEMO = {
    schoolInfo: {
        name: 'LYCÉE NATIONAL ADMINISTRATIF',
        ministry: 'MINISTÈRE DE L\'ÉDUCATION NATIONALE',
        address: 'BP 4021, Lomé – Togo',
        phone: '+228 22 21 00 00',
        email: 'contact@lna.gouv.tg',
        motto: 'République Togolaise · Travail – Liberté – Patrie',
    },
    schoolLogo: null,
    currentYear: '2025-2026',
    selectedTrimester: '1',
    student: {
        firstName: 'Kofi',
        lastName: 'MENSAH',
        id: 'LNA-2025-0312',
        gender: 'M',
        birthDate: '04/07/2008',
        nationality: 'Togolaise',
    },
    className: 'Terminale D',
    classStats: { rank: 5, effectif: 42, successRate: 71 },
    discipline: {
        absJust: 4, absNonJust: 1,
        comportement: 'Satisfaisant',
    },
    decision: 'Passage en classe supérieure',
    subjects: [
        { id: 1, name: 'Mathématiques', coefficient: 5 },
        { id: 2, name: 'Sciences Physiques', coefficient: 4 },
        { id: 3, name: 'SVT', coefficient: 3 },
        { id: 4, name: 'Français', coefficient: 3 },
        { id: 5, name: 'Histoire-Géographie', coefficient: 3 },
        { id: 6, name: 'Anglais', coefficient: 3 },
        { id: 7, name: 'Philosophie', coefficient: 2 },
        { id: 8, name: 'EPS', coefficient: 2 },
    ],
    gradeRows: [
        { subjectId: 1, interro: 14, devoir: 15, compo: 13, moyenne: 14.0, observation: 'Bien' },
        { subjectId: 2, interro: 12, devoir: 13, compo: 11, moyenne: 12.2, observation: 'Assez bien' },
        { subjectId: 3, interro: 16, devoir: 15, compo: 17, moyenne: 16.0, observation: 'Très bien' },
        { subjectId: 4, interro: 11, devoir: 12, compo: 10, moyenne: 11.0, observation: 'Passable' },
        { subjectId: 5, interro: 13, devoir: 14, compo: 13, moyenne: 13.3, observation: 'Assez bien' },
        { subjectId: 6, interro: 15, devoir: 14, compo: 16, moyenne: 15.0, observation: 'Bien' },
        { subjectId: 7, interro: 10, devoir: 11, compo: 10, moyenne: 10.3, observation: 'Passable' },
        { subjectId: 8, interro: 17, devoir: 16, compo: 17, moyenne: 16.7, observation: 'Excellent' },
    ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getMention = (avg) => {
    if (avg >= 16) return 'Excellent';
    if (avg >= 14) return 'Très bien';
    if (avg >= 12) return 'Bien';
    if (avg >= 10) return 'Passable';
    return 'Insuffisant';
};

// ─── Composant ────────────────────────────────────────────────────────────────
export default function BulletinModel2({
    schoolInfo = DEMO.schoolInfo,
    schoolLogo = DEMO.schoolLogo,
    currentYear = DEMO.currentYear,
    selectedTrimester = DEMO.selectedTrimester,
    student = DEMO.student,
    className = DEMO.className,
    classStats = DEMO.classStats,
    discipline = DEMO.discipline,
    decision = DEMO.decision,
    subjects = DEMO.subjects,
    gradeRows = DEMO.gradeRows,
}) {
    const totalCoef = useMemo(() =>
        subjects.reduce((acc, s) => acc + s.coefficient, 0), [subjects]);

    const totalPoints = useMemo(() =>
        gradeRows.reduce((acc, r) => {
            const s = subjects.find(x => x.id === r.subjectId);
            return acc + (r.moyenne * (s?.coefficient || 1));
        }, 0), [gradeRows, subjects]);

    const generalAvg = useMemo(() =>
        totalCoef > 0 ? (totalPoints / totalCoef).toFixed(2) : '—', [totalPoints, totalCoef]);

    const mention = getMention(parseFloat(generalAvg));

    // Styles pour impression parfaite
    const S = {
        page: {
            fontFamily: "'Times New Roman', Georgia, serif",
            background: '#ffffff',
            maxWidth: 850,
            margin: '0 auto',
            padding: 0,
            color: '#000',
            boxShadow: '0 0 40px rgba(0,0,0,.12)',
        },
        header: {
            borderBottom: '3px double #000',
            padding: '20px 40px',
            display: 'flex',
            alignItems: 'center',
            gap: 20,
        },
        logo: {
            width: 70, height: 70, border: '2px solid #000',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, flexShrink: 0,
        },
        title: { textAlign: 'center', borderBottom: '2px solid #000', padding: '10px 40px' },
        section: { padding: '0 40px', marginBottom: 6 },
        sectionHead: {
            background: '#000', color: '#fff',
            fontSize: 11, fontWeight: 700, fontFamily: "'Arial Narrow','Arial',sans-serif",
            padding: '4px 10px', letterSpacing: 1, textTransform: 'uppercase',
            marginBottom: 8,
        },
        table: {
            width: '100%', borderCollapse: 'collapse',
            fontSize: 12, fontFamily: "'Arial','Helvetica',sans-serif",
        },
        thHead: {
            background: '#000', color: '#fff',
            padding: '7px 8px', fontSize: 10, fontWeight: 700,
            textAlign: 'center', letterSpacing: .5,
            borderRight: '1px solid #555',
        },
        td: {
            padding: '6px 8px', borderBottom: '1px solid #ccc',
            borderRight: '1px solid #ccc', fontSize: 11,
        },
        tdCenter: {
            padding: '6px 8px', borderBottom: '1px solid #ccc',
            borderRight: '1px solid #ccc', fontSize: 11, textAlign: 'center',
        },
    };

    return (
        <div style={S.page}>
            {/* ── HEADER OFFICIEL ─────────────────────────────────────────────── */}
            <div style={{ ...S.header, flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
                <div style={{ fontSize: 10, textAlign: 'center', letterSpacing: 1.5, color: '#444', fontFamily: "'Arial',sans-serif", textTransform: 'uppercase' }}>
                    {schoolInfo.motto}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 8 }}>
                    <div style={S.logo}>
                        {schoolLogo ? <img src={schoolLogo} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🏛️'}
                    </div>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: 11, letterSpacing: 2, color: '#555', fontFamily: "'Arial',sans-serif", textTransform: 'uppercase', marginBottom: 4 }}>
                            {schoolInfo.ministry}
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', lineHeight: 1.2 }}>
                            {schoolInfo.name}
                        </div>
                        <div style={{ fontSize: 10, color: '#666', marginTop: 6, fontFamily: "'Arial',sans-serif" }}>
                            {schoolInfo.address} · Tél : {schoolInfo.phone} · {schoolInfo.email}
                        </div>
                    </div>
                    {/* Cachet placeholder */}
                    <div style={{ width: 70, height: 70, border: '2px dashed #ccc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#ccc', textAlign: 'center', flexShrink: 0 }}>
                        CACHET
                    </div>
                </div>
            </div>

            {/* ── TITRE BULLETIN ──────────────────────────────────────────────── */}
            <div style={{ ...S.title }}>
                <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>
                    Bulletin de Notes
                </div>
                <div style={{ fontSize: 12, marginTop: 4, fontFamily: "'Arial',sans-serif" }}>
                    Année Scolaire {currentYear} — Trimestre {selectedTrimester}
                </div>
            </div>

            {/* ── INFORMATIONS ÉLÈVE ──────────────────────────────────────────── */}
            <div style={{ ...S.section, marginTop: 16 }}>
                <div style={S.sectionHead}>Informations de l'élève</div>
                <table style={{ ...S.table, border: '1px solid #000' }}>
                    <tbody>
                        <tr>
                            <td style={{ ...S.td, fontWeight: 700, width: '15%', background: '#f5f5f5', fontFamily: "'Arial',sans-serif", fontSize: 10, textTransform: 'uppercase' }}>Nom</td>
                            <td style={{ ...S.td, width: '35%', fontWeight: 600 }}>{student.lastName} {student.firstName}</td>
                            <td style={{ ...S.td, fontWeight: 700, width: '15%', background: '#f5f5f5', fontFamily: "'Arial',sans-serif", fontSize: 10, textTransform: 'uppercase' }}>Matricule</td>
                            <td style={{ ...S.td, width: '35%' }}>{student.id}</td>
                        </tr>
                        <tr>
                            <td style={{ ...S.td, fontWeight: 700, background: '#f5f5f5', fontFamily: "'Arial',sans-serif", fontSize: 10, textTransform: 'uppercase' }}>Classe</td>
                            <td style={{ ...S.td, fontWeight: 600 }}>{className}</td>
                            <td style={{ ...S.td, fontWeight: 700, background: '#f5f5f5', fontFamily: "'Arial',sans-serif", fontSize: 10, textTransform: 'uppercase' }}>Date Naissance</td>
                            <td style={S.td}>{student.birthDate}</td>
                        </tr>
                        <tr>
                            <td style={{ ...S.td, fontWeight: 700, background: '#f5f5f5', fontFamily: "'Arial',sans-serif", fontSize: 10, textTransform: 'uppercase' }}>Sexe</td>
                            <td style={S.td}>{student.gender === 'M' ? 'Masculin' : 'Féminin'}</td>
                            <td style={{ ...S.td, fontWeight: 700, background: '#f5f5f5', fontFamily: "'Arial',sans-serif", fontSize: 10, textTransform: 'uppercase' }}>Nationalité</td>
                            <td style={S.td}>{student.nationality || 'Togolaise'}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* ── TABLEAU DES NOTES ───────────────────────────────────────────── */}
            <div style={{ ...S.section, marginTop: 14 }}>
                <div style={S.sectionHead}>Relevé de Notes</div>
                <table style={{ ...S.table, border: '1px solid #000' }}>
                    <thead>
                        <tr>
                            {['Matière', 'Coef.', 'Interro.', 'Devoir', 'Compo.', 'Moyenne', 'Observation'].map((h, i) => (
                                <th key={i} style={{ ...S.thHead, textAlign: i === 0 ? 'left' : 'center' }}>
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {subjects.map((subj, idx) => {
                            const row = gradeRows.find(r => r.subjectId === subj.id);
                            if (!row) return null;
                            const isBelow = row.moyenne < 10;
                            return (
                                <tr key={subj.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                                    <td style={{ ...S.td, fontWeight: 600, minWidth: 160 }}>{subj.name}</td>
                                    <td style={{ ...S.tdCenter, fontWeight: 700 }}>{subj.coefficient}</td>
                                    <td style={S.tdCenter}>{row.interro}</td>
                                    <td style={S.tdCenter}>{row.devoir}</td>
                                    <td style={S.tdCenter}>{row.compo}</td>
                                    <td style={{ ...S.tdCenter, fontWeight: 700, textDecoration: isBelow ? 'underline' : 'none', color: isBelow ? '#000' : '#000' }}>
                                        {row.moyenne.toFixed(2)}
                                    </td>
                                    <td style={{ ...S.td, fontSize: 10, fontStyle: 'italic' }}>{row.observation}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* ── RÉSUMÉ GÉNÉRAL ──────────────────────────────────────────────── */}
            <div style={{ ...S.section, marginTop: 14 }}>
                <div style={S.sectionHead}>Résumé Général</div>
                <table style={{ ...S.table, border: '1px solid #000' }}>
                    <tbody>
                        <tr>
                            <td style={{ ...S.td, fontWeight: 700, background: '#f5f5f5', fontFamily: "'Arial',sans-serif", fontSize: 10, textTransform: 'uppercase', width: '20%' }}>Moy. Générale</td>
                            <td style={{ ...S.tdCenter, fontWeight: 800, fontSize: 16, width: '15%', border: '2px solid #000' }}>
                                {generalAvg}/20
                            </td>
                            <td style={{ ...S.td, fontWeight: 700, background: '#f5f5f5', fontFamily: "'Arial',sans-serif", fontSize: 10, textTransform: 'uppercase', width: '20%' }}>Total Points</td>
                            <td style={{ ...S.tdCenter, fontWeight: 700, width: '10%' }}>{totalPoints.toFixed(2)}</td>
                            <td style={{ ...S.td, fontWeight: 700, background: '#f5f5f5', fontFamily: "'Arial',sans-serif", fontSize: 10, textTransform: 'uppercase', width: '20%' }}>Total Coeff.</td>
                            <td style={{ ...S.tdCenter, fontWeight: 700, width: '15%' }}>{totalCoef}</td>
                        </tr>
                        <tr>
                            <td style={{ ...S.td, fontWeight: 700, background: '#f5f5f5', fontFamily: "'Arial',sans-serif", fontSize: 10, textTransform: 'uppercase' }}>Rang</td>
                            <td style={{ ...S.tdCenter, fontWeight: 700 }}>{classStats.rank} / {classStats.effectif}</td>
                            <td style={{ ...S.td, fontWeight: 700, background: '#f5f5f5', fontFamily: "'Arial',sans-serif", fontSize: 10, textTransform: 'uppercase' }}>Mention</td>
                            <td style={{ ...S.tdCenter, fontWeight: 700 }}>{mention}</td>
                            <td style={{ ...S.td, fontWeight: 700, background: '#f5f5f5', fontFamily: "'Arial',sans-serif", fontSize: 10, textTransform: 'uppercase' }}>Décision</td>
                            <td style={{ ...S.td, fontWeight: 700, fontSize: 11, fontStyle: 'italic' }}>{decision}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* ── DISCIPLINE ──────────────────────────────────────────────────── */}
            <div style={{ ...S.section, marginTop: 14 }}>
                <div style={S.sectionHead}>Assiduité & Discipline</div>
                <table style={{ ...S.table, border: '1px solid #000' }}>
                    <tbody>
                        <tr>
                            <td style={{ ...S.td, fontWeight: 700, background: '#f5f5f5', fontFamily: "'Arial',sans-serif", fontSize: 10, textTransform: 'uppercase', width: '33%' }}>Absences Justifiées</td>
                            <td style={{ ...S.tdCenter, width: '17%' }}>{discipline.absJust} heure(s)</td>
                            <td style={{ ...S.td, fontWeight: 700, background: '#f5f5f5', fontFamily: "'Arial',sans-serif", fontSize: 10, textTransform: 'uppercase', width: '33%' }}>Absences Non Justifiées</td>
                            <td style={{ ...S.tdCenter, width: '17%' }}>{discipline.absNonJust} heure(s)</td>
                        </tr>
                        <tr>
                            <td style={{ ...S.td, fontWeight: 700, background: '#f5f5f5', fontFamily: "'Arial',sans-serif", fontSize: 10, textTransform: 'uppercase' }}>Comportement</td>
                            <td colSpan={3} style={S.td}>{discipline.comportement}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* ── OBSERVATIONS ────────────────────────────────────────────────── */}
            <div style={{ ...S.section, marginTop: 14 }}>
                <div style={S.sectionHead}>Observations</div>
                <table style={{ ...S.table, border: '1px solid #000' }}>
                    <tbody>
                        <tr>
                            <td style={{ ...S.td, fontWeight: 700, background: '#f5f5f5', fontSize: 10, textTransform: 'uppercase', fontFamily: "'Arial',sans-serif", width: '20%' }}>Prof. Principal</td>
                            <td style={{ ...S.td, fontStyle: 'italic', minHeight: 40, height: 40 }}>
                                {/* observation champ libre */}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* ── SIGNATURES ──────────────────────────────────────────────────── */}
            <div style={{ ...S.section, marginTop: 20, marginBottom: 28 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 0, border: '1px solid #000' }}>
                    {['Professeur Principal', 'Censeur', 'Directeur'].map((title, i) => (
                        <div key={i} style={{
                            padding: '14px 16px',
                            borderRight: i < 2 ? '1px solid #000' : 'none',
                            textAlign: 'center',
                            minHeight: 100,
                            display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                        }}>
                            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, fontFamily: "'Arial',sans-serif" }}>
                                {title}
                            </div>
                            <div style={{ fontSize: 10, color: '#999', marginTop: 10 }}>Cachet et signature</div>
                            <div style={{ borderTop: '1px solid #999', marginTop: 30, paddingTop: 6, fontSize: 9, color: '#aaa' }}>
                                Date : _____ / _____ / _______
                            </div>
                        </div>
                    ))}
                </div>
                <div style={{ marginTop: 12, textAlign: 'center' }}>
                    <div style={{ display: 'inline-block', border: '1px solid #000', padding: '8px 24px', fontSize: 10, fontFamily: "'Arial',sans-serif" }}>
                        Signature du Parent / Tuteur : _______________________________
                    </div>
                </div>
            </div>

            {/* ── PIED DE PAGE ────────────────────────────────────────────────── */}
            <div style={{ borderTop: '2px solid #000', padding: '8px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 9, color: '#666', fontFamily: "'Arial',sans-serif" }}>
                <span>{schoolInfo.name} — {schoolInfo.address}</span>
                <span>Document officiel — Toute falsification est passible de poursuites</span>
                <span>Trimestre {selectedTrimester} · {currentYear}</span>
            </div>
        </div>
    );
}