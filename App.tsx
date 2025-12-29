import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ActionCenter from './components/ActionCenter';
import HealthHub from './components/HealthHub';
import FinanceTracker from './components/FinanceTracker';
import Library from './components/Library';
import SpiritMind from './components/SpiritMind';
import TopBar from './components/TopBar';
import QuickCapture from './components/QuickCapture';
import Projects from './components/Projects';
import DesignCanvas from './components/DesignCanvas';
import { View, Note, Project, NoteFolder } from './types';

// Initial Mock Folders
const initialFolders: NoteFolder[] = [
    { id: 'f1', name: 'System' },
    { id: 'f2', name: 'Development' },
    { id: 'f3', name: 'Philosophy' }
];

// Initial Mock Data Moved to App Level
const initialNotes: Note[] = [
  { 
    id: '1', 
    title: 'Nexus OS Architecture', 
    content: '# Architecture\n\nThe system is built on [[React]] using a minimalist design system.\n\nCore modules:\n- [[Dashboard]]\n- [[Action Center]]\n- [[Health Hub]]', 
    tags: ['dev', 'system'], 
    folderId: 'f1',
    linkedProjectIds: ['1'],
    updatedAt: new Date().toISOString() 
  },
  { 
    id: '2', 
    title: 'React', 
    content: '# React Library\n\nA JavaScript library for building user interfaces. Used in [[Nexus OS Architecture]].\n\nKey concepts:\n- Components\n- Hooks\n- Virtual DOM', 
    tags: ['dev', 'library'], 
    folderId: 'f2',
    updatedAt: new Date(Date.now() - 86400000).toISOString() 
  },
  { 
    id: '3', 
    title: 'Dashboard', 
    content: 'The central hub of the second brain. Visualizes connections using [[D3.js]]. Part of [[Nexus OS Architecture]].', 
    tags: ['ui', 'component'], 
    folderId: 'f1',
    linkedProjectIds: ['1'],
    updatedAt: new Date(Date.now() - 172800000).toISOString() 
  },
  { 
    id: '4', 
    title: 'D3.js', 
    content: 'Data-Driven Documents. Powerful library for visualizations. Used for the Graph View in the [[Dashboard]].', 
    tags: ['dev', 'library', 'viz'], 
    folderId: 'f2',
    updatedAt: new Date(Date.now() - 200000000).toISOString() 
  },
  { 
    id: '5', 
    title: 'Action Center', 
    content: 'Kanban style task management. Links to [[Projects]].', 
    tags: ['ui', 'productivity'], 
    folderId: 'f1',
    updatedAt: new Date().toISOString() 
  },
  { 
    id: '6', 
    title: 'Health Hub', 
    content: 'Tracks workouts and meditation. Influenced by [[Biohacking]].', 
    tags: ['health', 'ui'], 
    folderId: 'f1',
    updatedAt: new Date().toISOString() 
  },
  { 
    id: '7', 
    title: 'Biohacking', 
    content: 'Optimizing human performance. See [[Health Hub]].', 
    tags: ['health', 'philosophy'], 
    folderId: 'f3',
    updatedAt: new Date().toISOString() 
  },
];

const initialProjects: Project[] = [
  {
    id: '1',
    title: 'Nexus OS Development',
    description: 'Building the ultimate second brain application with React and AI integration.',
    category: 'dev',
    status: 'active',
    progress: 45,
    dueDate: '2023-12-15',
    tags: ['React', 'productivity', 'AI'],
    resources: [
        { id: 'r1', title: 'Architecture Diagram', type: 'file' },
        { id: 'r2', title: 'Design System', type: 'note' },
        { id: 'r3', title: 'Gemini API Docs', type: 'link', url: 'https://ai.google.dev' }
    ]
  },
  {
    id: '2',
    title: 'Minimalist Apartment Redesign',
    description: 'Interior design planning for the new studio. Focus on lighting and ergonomics.',
    category: 'life',
    status: 'active',
    progress: 20,
    dueDate: '2023-11-30',
    tags: ['lifestyle', 'interior'],
    resources: [
        { id: 'r1', title: 'Pinterest Moodboard', type: 'link' },
        { id: 'r2', title: 'Budget Sheet', type: 'file' }
    ]
  },
  {
    id: '3',
    title: 'YouTube Content Strategy',
    description: 'Scripting and planning Q4 video essays on digital minimalism.',
    category: 'content',
    status: 'on-hold',
    progress: 10,
    dueDate: '2024-01-10',
    tags: ['writing', 'video'],
    resources: []
  },
  {
    id: '4',
    title: 'Portfolio Refresh',
    description: 'Updating case studies and visual identity for 2024.',
    category: 'design',
    status: 'active',
    progress: 75,
    dueDate: '2023-10-31',
    tags: ['design', 'career'],
    resources: [
        { id: 'r1', title: 'Case Study Drafts', type: 'note' }
    ]
  },
  {
    id: '5',
    title: 'Japan Trip Planning',
    description: 'Itinerary, bookings, and cultural research for spring travel.',
    category: 'life',
    status: 'completed',
    progress: 100,
    dueDate: '2023-09-15',
    tags: ['travel', 'life'],
    resources: [
        { id: 'r1', title: 'Flight Tickets', type: 'file' },
        { id: 'r2', title: 'Itinerary V1', type: 'note' }
    ]
  }
];

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isZenMode, setIsZenMode] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);

  // Lifted State
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [folders, setFolders] = useState<NoteFolder[]>(initialFolders);
  const [projects, setProjects] = useState<Project[]>(initialProjects);

  // Auto-enable Zen Mode when Focus Mode is activated
  useEffect(() => {
    if (isFocusMode) {
        setIsZenMode(true);
    }
  }, [isFocusMode]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle Quick Capture: Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsQuickCaptureOpen(prev => !prev);
      }
      
      // Toggle Zen Mode: Cmd/Ctrl + \
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
          e.preventDefault();
          setIsZenMode(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': 
        return <Dashboard 
                  notes={notes} 
                  setNotes={setNotes} 
                  folders={folders}
                  setFolders={setFolders}
                  projects={projects} 
                  setProjects={setProjects} 
               />;
      case 'design': 
        return <DesignCanvas notes={notes} projects={projects} />;
      case 'action': return <ActionCenter />;
      case 'health': return <HealthHub />;
      case 'finance': return <FinanceTracker />;
      case 'library': return <Library />;
      case 'spirit': return <SpiritMind />;
      case 'projects': 
        return <Projects 
                  projects={projects} 
                  setProjects={setProjects}
                  notes={notes}
                  setNotes={setNotes}
               />;
      default: return <Dashboard notes={notes} setNotes={setNotes} folders={folders} setFolders={setFolders} projects={projects} setProjects={setProjects} />;
    }
  };

  return (
    <div className={`flex h-screen w-full bg-nexus-bg text-nexus-text font-sans selection:bg-nexus-text selection:text-nexus-bg overflow-hidden ${isFocusMode ? 'grayscale-[0.5]' : ''}`}>
      
      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        isZenMode={isZenMode}
      />

      <main className="flex-1 flex flex-col h-full relative transition-all duration-300">
        <TopBar 
            currentView={currentView}
            toggleZen={() => setIsZenMode(!isZenMode)}
            isZenMode={isZenMode}
            isFocusMode={isFocusMode}
            toggleFocus={() => setIsFocusMode(!isFocusMode)}
        />
        
        <div className="flex-1 overflow-hidden relative">
            {/* Focus Mode Overlay Effect */}
            {isFocusMode && (
                <div className="absolute inset-0 border-4 border-red-500/10 pointer-events-none z-50 animate-pulse"></div>
            )}
            {renderView()}
        </div>
      </main>

      <QuickCapture 
        isOpen={isQuickCaptureOpen} 
        onClose={() => setIsQuickCaptureOpen(false)} 
      />
    </div>
  );
}

export default App;