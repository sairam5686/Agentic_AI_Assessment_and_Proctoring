/**
 * NavBar.tsx — Top Navigation Bar
 *
 * Displays:
 *   - Virtusa logo & "Proctor Portal" branding (left)
 *   - Theme switcher buttons: Blue (default) / Black / White (center-right)
 *   - Proctor's display name & "Lead Proctor" role label
 *   - "End Session" logout button → calls store.logout()
 *
 * Theme switching updates the Zustand store's theme value, which Dashboard
 * applies as a CSS class on the <html> element.
 */
import { useProctorStore } from '../store/proctorStore';
import { LogOut, Sun, Moon, Palette } from 'lucide-react';

const NavBar = () => {
    const { proctorName, logout, theme, setTheme } = useProctorStore();

    return (
        <div className="bg-brand border-b border-border-subtle px-8 py-3 sticky top-0 z-50 shadow-2xl transition-colors duration-500">
            <div className="flex items-center justify-between">
                {/* Brand Logo & Name */}
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-md shadow-lg flex items-center justify-center overflow-hidden border-2 border-border-subtle">
                        <img 
                            src="https://pbs.twimg.com/profile_images/1973372506271584256/Sb4wfgD0_400x400.jpg" 
                            alt="Virtusa" 
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-sm font-black text-text-primary uppercase tracking-widest leading-none">
                            Virtusa <span className="text-text-secondary font-bold mx-1">|</span> <span className="text-text-primary">Proctor Portal</span>
                        </h1>
                    </div>
                </div>

                {/* Right Side Info & Badges */}
                <div className="flex items-center gap-6">
                    {/* Theme Switcher */}
                    <div className="flex items-center gap-2 bg-brand p-1 rounded-md border border-border-subtle shadow-sm">
                        <button 
                            onClick={() => setTheme('blue')}
                            className={`p-1.5 rounded-none transition-all ${theme === 'blue' ? 'bg-accent-main text-white shadow-lg' : 'text-text-secondary hover:text-text-primary hover:bg-accent-main/10'}`}
                            title="Blue Theme"
                        >
                            <Palette size={14} />
                        </button>
                        <button 
                            onClick={() => setTheme('black')}
                            className={`p-1.5 rounded-none transition-all ${theme === 'black' ? 'bg-status-offline text-white border border-border-subtle shadow-lg' : 'text-text-secondary hover:text-text-primary hover:bg-status-offline/10'}`}
                            title="Black Theme"
                        >
                            <Moon size={14} />
                        </button>
                        <button 
                            onClick={() => setTheme('white')}
                            className={`p-1.5 rounded-md transition-all ${theme === 'white' ? 'bg-white text-black shadow-lg border border-border-subtle' : 'text-text-secondary hover:text-text-primary hover:bg-accent-main/10'}`}
                            title="White Theme"
                        >
                            <Sun size={14} />
                        </button>
                    </div>

                    {/* Proctor Identity */}
                    <div className="flex items-center gap-4 border-l border-border-subtle pl-6">
                        <div className="text-right">
                            <p className="text-xs font-black text-text-primary tracking-tight uppercase">{proctorName}</p>
                            <p className="text-[9px] text-text-secondary font-bold uppercase tracking-widest italic">Lead Proctor</p>
                        </div>
                        <button 
                            onClick={logout}
                            className="flex items-center gap-2 bg-surface hover:bg-surface/80 text-text-primary px-3 py-1.5 rounded-md border border-border-subtle transition-all text-[10px] font-black uppercase tracking-widest active:scale-95"
                        >
                            End Session
                            <LogOut size={12} className="text-text-secondary" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NavBar;
