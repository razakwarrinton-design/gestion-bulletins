import { useState } from 'react';
import { BarChart3, ChevronDown } from 'lucide-react';
import { NAV_SECTIONS } from '../config/navigation';

const STORAGE_KEY = 'edupulse.navSections';
// Au-delà de ce nombre d'entrées visibles (l'administrateur en a une vingtaine), les rubriques secondaires démarrent repliées
const COLLAPSE_ABOVE = 12;
const ALWAYS_OPEN = ['principal', 'notes'];

const readChoices = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
};

const Sidebar = ({ visibleNavItems, currentView, mobileMenuOpen, setMobileMenuOpen, onNavigate, currentUser }) => {
    // Rubriques ouvertes ou repliées : le choix de l'utilisateur est mémorisé ; la rubrique de l'écran affiché reste toujours ouverte
    const [choices, setChoices] = useState(readChoices);
    const isOpen = (section, items) => {
        if (items.some(i => i.view === currentView)) return true;
        if (section.key in choices) return choices[section.key];
        return ALWAYS_OPEN.includes(section.key) || visibleNavItems.length <= COLLAPSE_ABOVE;
    };
    const toggle = (section, items) => {
        const next = { ...choices, [section.key]: !isOpen(section, items) };
        setChoices(next);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* stockage indisponible */ }
    };

    return (
    <>
        <aside
            className={`w-[210px] flex-shrink-0 flex flex-col h-full z-50 transition-transform duration-300
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        fixed md:relative`}
            style={{ background: '#0D1B2A' }}
        >
            {/* Brand */}
            <div className="px-4 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <BarChart3 className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <div className="text-white font-bold text-sm leading-tight">EduPulse</div>
                        <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Gestion scolaire</div>
                    </div>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto px-2 py-2">
                {NAV_SECTIONS.map(section => {
                    const sectionItems = visibleNavItems.filter(i => i.section === section.key);
                    if (sectionItems.length === 0) return null;
                    const open = isOpen(section, sectionItems);
                    return (
                        <div key={section.key}>
                            <button
                                type="button"
                                onClick={() => toggle(section, sectionItems)}
                                aria-expanded={open}
                                aria-controls={`nav-${section.key}`}
                                className="w-full flex items-center justify-between text-[10px] font-bold uppercase tracking-widest px-2 py-2 mt-2 hover:text-white"
                                style={{ color: 'rgba(255,255,255,0.5)' }}>
                                {section.label}
                                <ChevronDown className="w-3 h-3 transition-transform" style={{ transform: open ? 'none' : 'rotate(-90deg)' }} aria-hidden="true" />
                            </button>
                            <div id={`nav-${section.key}`} hidden={!open}>
                            {sectionItems.map(({ view, label, Icon }) => (
                                <button
                                    key={view}
                                    onClick={() => onNavigate(view)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium mb-0.5 transition-all duration-150 text-left
                  ${currentView === view
                                            ? 'bg-blue-600 text-white'
                                            : 'hover:text-white'}`}
                                    style={{
                                        color: currentView === view ? 'white' : 'rgba(255,255,255,0.55)',
                                        background: currentView === view ? undefined : 'transparent',
                                    }}
                                    onMouseEnter={e => { if (currentView !== view) e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
                                    onMouseLeave={e => { if (currentView !== view) e.currentTarget.style.background = 'transparent'; }}
                                >
                                    <Icon className="w-[15px] h-[15px] flex-shrink-0" />
                                    <span className="flex-1 truncate">{label}</span>
                                </button>
                            ))}
                            </div>
                        </div>
                    );
                })}
            </nav>

            {/* User footer */}
            <div className="px-2 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                {currentUser && (
                    <div className="flex items-center gap-2 px-2 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-white text-[11px]">
                            {currentUser.firstName?.[0]}{currentUser.lastName?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-white text-[12px] font-medium truncate">
                                {currentUser.firstName} {currentUser.lastName}
                            </div>
                            <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                                {currentUser.role === 'admin' ? 'Administrateur' :
                                    currentUser.role === 'professeur' ? 'Professeur' :
                                        currentUser.role === 'parent' ? 'Parent' : 'Secrétaire'}
                            </div>
                        </div>
                    </div>
                )}
                <div className="px-2 pt-2 text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    <a href="#/confidentialite" className="hover:underline">Confidentialité</a>
                    {' · '}
                    <a href="#/conditions" className="hover:underline">Conditions</a>
                </div>
            </div>
        </aside>

        {/* Mobile overlay */}
        {mobileMenuOpen && (
            <div
                className="fixed inset-0 bg-black/50 z-40 md:hidden"
                onClick={() => setMobileMenuOpen(false)}
            />
        )}
    </>
    );
};

export default Sidebar;
