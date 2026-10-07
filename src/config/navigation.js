import {
    LayoutDashboard, GraduationCap, Users, BookOpen, Pencil, ClipboardList,
    FileText, Calendar, Star, TrendingUp, BarChart2, Bot, FolderUp, UsersRound,
    CreditCard, Settings, UserCheck, MessageSquare, MessageCircle,
} from 'lucide-react';

// ─── Sections de navigation ───────────────────────────────────────────────────
export const NAV_SECTIONS = [
    { key: 'principal', label: 'Principal' },
    { key: 'notes', label: 'Notes & Bulletins' },
    { key: 'avance', label: 'Avancé' },
    { key: 'gestion', label: 'Gestion' },
];

// ─── Items de navigation ──────────────────────────────────────────────────────
export const NAV_ITEMS = [
    { view: 'dashboard', label: 'Tableau de bord', Icon: LayoutDashboard, section: 'principal', roles: ['admin', 'professeur', 'secretaire'] },
    { view: 'classes', label: 'Classes', Icon: GraduationCap, section: 'principal', roles: ['admin', 'secretaire'] },
    { view: 'students', label: 'Élèves', Icon: Users, section: 'principal', roles: ['admin', 'professeur', 'secretaire'] },
    { view: 'subjects', label: 'Matières', Icon: BookOpen, section: 'principal', roles: ['admin'] },
    { view: 'grades', label: 'Saisir notes', Icon: Pencil, section: 'notes', roles: ['admin', 'professeur'] },
    { view: 'absences', label: 'Absences', Icon: ClipboardList, section: 'notes', roles: ['admin', 'professeur', 'secretaire'] },
    { view: 'bulletins', label: 'Bulletins', Icon: FileText, section: 'notes', roles: ['admin', 'professeur', 'secretaire'] },
    { view: 'academicyears', label: 'Années scolaires', Icon: Calendar, section: 'notes', roles: ['admin'] },
    { view: 'appreciations', label: 'Appréciations', Icon: Star, section: 'notes', roles: ['admin', 'professeur'] },
    { view: 'analytics', label: 'Analyse avancée', Icon: TrendingUp, section: 'avance', roles: ['admin', 'professeur'] },
    { view: 'statistics', label: 'Statistiques', Icon: BarChart2, section: 'avance', roles: ['admin', 'professeur'] },
    { view: 'ia-appreciations', label: 'IA Appréciations', Icon: Bot, section: 'avance', roles: ['admin', 'professeur'] },
    { view: 'importexport', label: 'Import/Export', Icon: FolderUp, section: 'gestion', roles: ['admin', 'secretaire'] },
    { view: 'gestion-parents', label: 'Gestion parents', Icon: UsersRound, section: 'gestion', roles: ['admin'] },
    { view: 'admin-payments', label: 'Gestion des paiements', Icon: CreditCard, section: 'gestion', roles: ['admin', 'secretaire'] },
    { view: 'settings', label: 'Paramètres', Icon: Settings, section: 'gestion', roles: ['admin'] },
    { view: 'parents', label: 'Espace Parents', Icon: UserCheck, section: 'gestion', roles: ['parent'] },
    { view: 'sms-dashboard', label: 'SMS', Icon: MessageSquare, section: 'gestion', roles: ['admin'] },
    { view: 'chat', label: 'Chat', Icon: MessageCircle, section: 'gestion', roles: ['parent', 'professeur', 'admin'] },
];
