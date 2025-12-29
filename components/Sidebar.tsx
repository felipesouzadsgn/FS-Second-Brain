import React from 'react';
import { LayoutGrid, CheckSquare, Activity, DollarSign, BookOpen, Sparkles, FolderKanban, LogOut, PenTool } from 'lucide-react';
import { View } from '../types';

interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  isZenMode: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, isZenMode }) => {
  if (isZenMode) return null;

  const menuItems: { id: View; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Brain', icon: <LayoutGrid size={20} /> },
    { id: 'design', label: 'Design', icon: <PenTool size={20} /> },
    { id: 'projects', label: 'Projects', icon: <FolderKanban size={20} /> },
    { id: 'action', label: 'Action', icon: <CheckSquare size={20} /> },
    { id: 'library', label: 'Library', icon: <BookOpen size={20} /> },
    { id: 'finance', label: 'Finance', icon: <DollarSign size={20} /> },
    { id: 'health', label: 'Health', icon: <Activity size={20} /> },
    { id: 'spirit', label: 'Spirit', icon: <Sparkles size={20} /> },
  ];

  return (
    <aside className="w-64 h-screen border-r border-nexus-border flex flex-col justify-between p-4 bg-nexus-bg">
      <div>
        <div className="mb-8 px-4 py-2">
          <h1 className="text-lg font-semibold tracking-wider text-nexus-text font-mono">NEXUS<span className="text-nexus-muted">.OS</span></h1>
        </div>
        
        <nav className="space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-md text-sm transition-all duration-200 ${
                currentView === item.id
                  ? 'bg-nexus-surface text-nexus-text border border-nexus-border'
                  : 'text-nexus-muted hover:text-nexus-text hover:bg-nexus-surface/50'
              }`}
            >
              <span className={currentView === item.id ? 'text-white' : 'text-nexus-muted'}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="px-4 py-2 border-t border-nexus-border pt-4">
        <button className="flex items-center space-x-3 text-nexus-muted hover:text-red-400 text-sm transition-colors w-full">
          <LogOut size={18} />
          <span>Disconnect</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;