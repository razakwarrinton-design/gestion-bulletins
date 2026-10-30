import { Menu, X, LogOut } from 'lucide-react';
import SyncStatus from '../components/SyncStatus';
import LanguageToggle from '../components/LanguageToggle';
import DarkModeToggle from '../components/DarkModeToggle';
import NotificationBell from '../components/NotificationBell';

const Topbar = ({
    mobileMenuOpen, setMobileMenuOpen, visibleNavItems, currentView,
    currentYear, isDark, toggleDark, currentUser, onLogout, notifications, onNavigate,
}) => (
<header className="bg-white flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2.5 flex-shrink-0"
    style={{ borderBottom: '1px solid #EFF6FF' }}>

    {/* Mobile burger */}
    <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-blue-50 transition-colors"
    >
        {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
    </button>

    {/* Page title */}
    <div className="flex-1 min-w-0 flex items-center gap-2 md:invisible">
        {(() => {
            const item = visibleNavItems.find(i => i.view === currentView);
            if (!item) return null;
            const { Icon } = item;
            return (
                <>
                    <Icon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span className="text-[15px] font-bold text-gray-900 truncate whitespace-nowrap">{item.label}</span>
                </>
            );
        })()}
    </div>

    {/* Year badge */}
    <div className="hidden md:flex items-center text-[11px] font-semibold text-blue-600 rounded-lg px-2.5 py-1.5"
        style={{ background: '#EFF6FF', border: '1px solid #DBEAFE' }}>
        {currentYear}
    </div>

    {/* SyncStatus */}
    <SyncStatus />

    {/* Notifications (comptes qui en reçoivent, table installée) */}
    {notifications?.available && (
        <NotificationBell
            notifications={notifications}
            allowedViews={visibleNavItems.map(i => i.view)}
            onNavigate={onNavigate}
        />
    )}

    {/* Language toggle (masqué sur petit écran : la place manque et on change rarement de langue) */}
    <div className="hidden sm:block"><LanguageToggle /></div>

    {/* Dark mode */}
    <DarkModeToggle isDark={isDark} toggle={toggleDark} />

    {/* Logout */}
    {currentUser && (
        <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors"
            style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA' }}
            onMouseEnter={e => e.currentTarget.style.background = '#FECACA'}
            onMouseLeave={e => e.currentTarget.style.background = '#FEE2E2'}
        >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Déconnexion</span>
        </button>
    )}
</header>
);

export default Topbar;
