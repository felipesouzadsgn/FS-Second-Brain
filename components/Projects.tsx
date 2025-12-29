import React, { useState, useEffect } from 'react';
import { Folder, Code, Palette, PenTool, Heart, MoreVertical, Calendar, FileText, Plus, Filter, X, Trash2, Link as LinkIcon, File, StickyNote, Check, ExternalLink, ListChecks, Search, BookOpen } from 'lucide-react';
import { Project, ProjectResource, Note } from '../types';

interface ProjectsProps {
    projects: Project[];
    setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
    notes: Note[];
    setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
}

const Projects: React.FC<ProjectsProps> = ({ projects, setProjects, notes, setNotes }) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'on-hold' | 'completed'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const getIcon = (category: Project['category']) => {
    switch (category) {
      case 'dev': return <Code size={20} />;
      case 'design': return <Palette size={20} />;
      case 'content': return <PenTool size={20} />;
      case 'life': return <Heart size={20} />;
      default: return <Folder size={20} />;
    }
  };

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'active': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'on-hold': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'completed': return 'text-nexus-muted bg-nexus-surface border-nexus-border';
      default: return 'text-nexus-text';
    }
  };

  const handleSaveProject = (updatedProject: Project) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    setSelectedProject(null);
  };

  const handleDeleteProject = (projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
    setSelectedProject(null);
  };
  
  const handleCreateProject = () => {
      const newProject: Project = {
          id: Date.now().toString(),
          title: 'New Project',
          description: '',
          category: 'life',
          status: 'active',
          progress: 0,
          dueDate: new Date().toISOString().split('T')[0],
          tags: [],
          resources: []
      };
      setProjects([newProject, ...projects]);
      setSelectedProject(newProject);
  };

  const toggleNoteLink = (noteId: string, projectId: string) => {
      const note = notes.find(n => n.id === noteId);
      if (!note) return;

      const currentLinks = note.linkedProjectIds || [];
      const isLinked = currentLinks.includes(projectId);
      
      const newLinks = isLinked 
        ? currentLinks.filter(id => id !== projectId)
        : [...currentLinks, projectId];
      
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, linkedProjectIds: newLinks } : n));
  };

  const filteredProjects = projects.filter(p => {
    const matchesStatus = filter === 'all' || p.status === filter;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery.trim() || 
        p.title.toLowerCase().includes(searchLower) || 
        p.tags.some(tag => tag.toLowerCase().includes(searchLower));
    
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="h-full p-8 overflow-y-auto">
      <header className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-2xl font-light text-nexus-text">Projects & Hobbies</h2>
          <p className="text-sm text-nexus-muted">Active Workstreams & Archives</p>
        </div>
        <button 
            onClick={handleCreateProject}
            className="flex items-center space-x-2 bg-nexus-text text-nexus-bg px-4 py-2 rounded-sm text-sm font-medium hover:bg-white transition-colors"
        >
            <Plus size={16} />
            <span>New Project</span>
        </button>
      </header>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 border-b border-nexus-border pb-1 gap-4">
        <div className="flex items-center gap-1 w-full md:w-auto overflow-x-auto no-scrollbar">
            {(['active', 'on-hold', 'completed', 'all'] as const).map((f) => (
                <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-2 text-sm font-medium capitalize transition-all relative whitespace-nowrap ${
                        filter === f 
                        ? 'text-nexus-text' 
                        : 'text-nexus-muted hover:text-nexus-text'
                    }`}
                >
                    {f.replace('-', ' ')}
                    {filter === f && (
                        <span className="absolute bottom-[-5px] left-0 w-full h-[2px] bg-nexus-text"></span>
                    )}
                </button>
            ))}
        </div>

        <div className="relative w-full md:w-auto mb-2 md:mb-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-nexus-muted w-3.5 h-3.5" />
            <input 
                type="text" 
                placeholder="Search projects..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-nexus-surface/50 border border-nexus-border rounded-full py-1.5 pl-9 pr-4 text-xs text-nexus-text focus:outline-none focus:border-nexus-muted w-full md:w-64 transition-all placeholder-nexus-muted/70"
            />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map((project) => {
            const linkedNotesCount = notes.filter(n => n.linkedProjectIds?.includes(project.id)).length;
            
            return (
            <div 
                key={project.id} 
                onClick={() => setSelectedProject(project)}
                className="group bg-nexus-surface border border-nexus-border rounded-lg p-5 hover:border-nexus-muted/50 transition-all duration-300 hover:shadow-lg hover:shadow-black/20 flex flex-col cursor-pointer"
            >
                <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 rounded bg-nexus-bg border border-nexus-border flex items-center justify-center text-nexus-text group-hover:border-nexus-muted transition-colors">
                        {getIcon(project.category)}
                    </div>
                    <div className="flex gap-2">
                         <span className={`text-[10px] px-2 py-0.5 rounded border uppercase tracking-wider font-medium ${getStatusColor(project.status)}`}>
                            {project.status.replace('-', ' ')}
                        </span>
                        <button className="text-nexus-muted hover:text-nexus-text transition-colors">
                            <MoreVertical size={16} />
                        </button>
                    </div>
                </div>

                <h3 className="text-lg font-medium text-nexus-text mb-2 group-hover:text-white transition-colors">{project.title}</h3>
                <p className="text-sm text-nexus-muted line-clamp-2 mb-6 flex-1">{project.description}</p>

                {/* Progress */}
                <div className="mb-4">
                    <div className="flex justify-between text-xs text-nexus-muted mb-1.5">
                        <span>Progress</span>
                        <span>{project.progress}%</span>
                    </div>
                    <div className="h-1 w-full bg-nexus-bg rounded-full overflow-hidden border border-nexus-border/30">
                        <div 
                            className={`h-full rounded-full transition-all duration-500 ${project.status === 'completed' ? 'bg-green-500' : 'bg-nexus-text'}`}
                            style={{ width: `${project.progress}%` }}
                        ></div>
                    </div>
                </div>

                {/* Footer Metadata */}
                <div className="flex justify-between items-center pt-4 border-t border-nexus-border/50">
                    <div className="flex gap-4 text-xs text-nexus-muted">
                        <div className="flex items-center gap-1.5" title="Due Date">
                            <Calendar size={14} />
                            <span>{new Date(project.dueDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
                        </div>
                        <div className="flex items-center gap-1.5" title="Linked Resources & Notes">
                            <LinkIcon size={14} />
                            <span>{(project.resources?.length || 0) + linkedNotesCount}</span>
                        </div>
                    </div>
                    
                    {/* Tags (Show first one only to keep clean) */}
                    {project.tags.length > 0 && (
                         <span className="text-[10px] text-nexus-muted bg-nexus-bg px-2 py-1 rounded border border-nexus-border/50">
                            #{project.tags[0]}
                         </span>
                    )}
                </div>
            </div>
        )})}

        {/* New Project Placeholder Card */}
        <button 
            onClick={handleCreateProject}
            className="border border-dashed border-nexus-border rounded-lg p-5 flex flex-col items-center justify-center text-nexus-muted hover:text-nexus-text hover:border-nexus-muted hover:bg-nexus-surface/30 transition-all group min-h-[250px]"
        >
            <div className="w-12 h-12 rounded-full bg-nexus-bg border border-nexus-border flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Plus size={20} />
            </div>
            <span className="text-sm font-medium">Create New Project</span>
        </button>
      </div>

      {selectedProject && (
          <ProjectModal 
            project={selectedProject} 
            onClose={() => setSelectedProject(null)} 
            onSave={handleSaveProject}
            onDelete={handleDeleteProject}
            notes={notes}
            onToggleNoteLink={toggleNoteLink}
          />
      )}
    </div>
  );
};

interface ProjectModalProps {
    project: Project;
    onClose: () => void;
    onSave: (project: Project) => void;
    onDelete: (id: string) => void;
    notes: Note[];
    onToggleNoteLink: (noteId: string, projectId: string) => void;
}

const ProjectModal: React.FC<ProjectModalProps> = ({ project, onClose, onSave, onDelete, notes, onToggleNoteLink }) => {
    const [editedProject, setEditedProject] = useState<Project>({ ...project });
    const [newTag, setNewTag] = useState('');
    const [newResourceTitle, setNewResourceTitle] = useState('');
    const [newResourceUrl, setNewResourceUrl] = useState('');
    const [newResourceType, setNewResourceType] = useState<ProjectResource['type']>('file');
    const [isLinkingNote, setIsLinkingNote] = useState(false);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const handleChange = (field: keyof Project, value: any) => {
        setEditedProject(prev => ({ ...prev, [field]: value }));
    };

    const handleAddTag = () => {
        if (newTag.trim() && !editedProject.tags.includes(newTag.trim())) {
            setEditedProject(prev => ({ ...prev, tags: [...prev.tags, newTag.trim()] }));
            setNewTag('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        setEditedProject(prev => ({ ...prev, tags: prev.tags.filter(tag => tag !== tagToRemove) }));
    };

    const handleAddResource = () => {
        if (!newResourceTitle.trim()) return;
        const newResource: ProjectResource = {
            id: Date.now().toString(),
            title: newResourceTitle,
            type: newResourceType,
            url: newResourceUrl.trim() || undefined
        };
        setEditedProject(prev => ({ 
            ...prev, 
            resources: [...(prev.resources || []), newResource] 
        }));
        setNewResourceTitle('');
        setNewResourceUrl('');
    };

    const removeResource = (id: string) => {
        setEditedProject(prev => ({
            ...prev,
            resources: prev.resources?.filter(r => r.id !== id)
        }));
    };

    const getResourceIcon = (type: ProjectResource['type']) => {
        switch (type) {
            case 'note': return <StickyNote size={16} className="text-yellow-500" />;
            case 'file': return <File size={16} className="text-blue-400" />;
            case 'link': return <LinkIcon size={16} className="text-indigo-400" />;
            case 'checklist': return <ListChecks size={16} className="text-green-500" />;
            default: return <FileText size={16} className="text-nexus-muted" />;
        }
    };

    const linkedNotes = notes.filter(n => n.linkedProjectIds?.includes(project.id));

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-3xl bg-[#1a1a1a] border border-nexus-border rounded-lg shadow-2xl flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="flex justify-between items-start p-6 border-b border-nexus-border/50">
                    <div className="flex-1 mr-8">
                        <input
                            type="text"
                            value={editedProject.title}
                            onChange={(e) => handleChange('title', e.target.value)}
                            className="w-full bg-transparent text-2xl font-light text-nexus-text focus:outline-none placeholder-nexus-muted/50 mb-2"
                            placeholder="Project Title"
                        />
                         <div className="flex items-center gap-4">
                             <select
                                value={editedProject.category}
                                onChange={(e) => handleChange('category', e.target.value)}
                                className="bg-nexus-surface border border-nexus-border rounded px-2 py-1 text-xs text-nexus-muted focus:text-nexus-text focus:border-nexus-muted outline-none cursor-pointer uppercase tracking-wider"
                             >
                                 <option value="dev">Development</option>
                                 <option value="design">Design</option>
                                 <option value="content">Content</option>
                                 <option value="life">Life</option>
                             </select>
                             <span className="text-nexus-border">|</span>
                             <span className="text-xs text-nexus-muted font-mono">ID: {editedProject.id}</span>
                         </div>
                    </div>
                    <button onClick={onClose} className="text-nexus-muted hover:text-white transition-colors p-1 hover:bg-nexus-border/50 rounded">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-8">
                    
                    {/* Top Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                             <label className="text-xs font-medium text-nexus-muted uppercase tracking-wider block">Status</label>
                             <select 
                                value={editedProject.status}
                                onChange={(e) => handleChange('status', e.target.value)}
                                className="w-full bg-nexus-surface border border-nexus-border rounded px-3 py-2 text-sm text-nexus-text focus:border-nexus-muted outline-none"
                             >
                                <option value="active">Active</option>
                                <option value="on-hold">On Hold</option>
                                <option value="completed">Completed</option>
                             </select>
                        </div>
                        <div className="space-y-2">
                             <label className="text-xs font-medium text-nexus-muted uppercase tracking-wider block">Due Date</label>
                             <input 
                                type="date"
                                value={editedProject.dueDate}
                                onChange={(e) => handleChange('dueDate', e.target.value)}
                                className="w-full bg-nexus-surface border border-nexus-border rounded px-3 py-2 text-sm text-nexus-text focus:border-nexus-muted outline-none [&::-webkit-calendar-picker-indicator]:invert"
                             />
                        </div>
                         <div className="space-y-2">
                             <div className="flex justify-between">
                                <label className="text-xs font-medium text-nexus-muted uppercase tracking-wider block">Progress</label>
                                <span className="text-xs font-mono text-nexus-text">{editedProject.progress}%</span>
                             </div>
                             <input 
                                type="range"
                                min="0"
                                max="100"
                                value={editedProject.progress}
                                onChange={(e) => handleChange('progress', parseInt(e.target.value))}
                                className="w-full h-2 bg-nexus-surface rounded-lg appearance-none cursor-pointer accent-nexus-text"
                             />
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-nexus-muted uppercase tracking-wider flex items-center gap-2">
                            Description
                        </label>
                        <textarea
                            value={editedProject.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                            placeholder="Describe the project scope..."
                            className="w-full h-32 bg-nexus-surface/50 border border-nexus-border rounded-lg p-4 text-sm text-nexus-text focus:border-nexus-muted focus:outline-none resize-none font-sans leading-relaxed"
                        />
                    </div>

                    {/* Tags */}
                     <div className="space-y-2">
                        <label className="text-xs font-medium text-nexus-muted uppercase tracking-wider flex items-center gap-2">
                            Tags
                        </label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {editedProject.tags.map((tag, idx) => (
                                <span key={idx} className="bg-nexus-surface border border-nexus-border rounded px-2 py-1 text-xs text-nexus-text flex items-center gap-1 group">
                                    #{tag}
                                    <button onClick={() => removeTag(tag)} className="text-nexus-muted hover:text-red-400">
                                        <X size={10} />
                                    </button>
                                </span>
                            ))}
                             <input 
                                type="text"
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                                placeholder="+ Add Tag"
                                className="bg-transparent text-xs text-nexus-text placeholder-nexus-muted/50 outline-none min-w-[60px]"
                             />
                        </div>
                    </div>

                    {/* Linked Notes Section */}
                    <div className="space-y-3">
                         <div className="flex justify-between items-center border-b border-nexus-border pb-2">
                            <label className="text-xs font-medium text-nexus-muted uppercase tracking-wider flex items-center gap-2">
                                <BookOpen size={12} /> Linked Notes
                            </label>
                            <div className="relative">
                                <button 
                                    onClick={() => setIsLinkingNote(!isLinkingNote)}
                                    className="text-[10px] text-nexus-muted hover:text-nexus-text bg-nexus-surface border border-nexus-border px-2 py-1 rounded flex items-center gap-1"
                                >
                                    <Plus size={10} /> Link Note
                                </button>
                                {isLinkingNote && (
                                    <div className="absolute top-full right-0 mt-2 w-64 bg-nexus-surface border border-nexus-border rounded-lg shadow-xl z-20 p-2 animate-in fade-in zoom-in-95 duration-200">
                                         <div className="flex justify-between items-center mb-2 px-2 pb-2 border-b border-nexus-border/50">
                                            <span className="text-xs font-medium text-nexus-muted uppercase">Select Note</span>
                                            <button onClick={() => setIsLinkingNote(false)}><X size={12} className="text-nexus-muted hover:text-white" /></button>
                                        </div>
                                        <div className="max-h-48 overflow-y-auto space-y-1">
                                            {notes.map(n => {
                                                const isLinked = n.linkedProjectIds?.includes(project.id);
                                                return (
                                                    <div 
                                                        key={n.id}
                                                        onClick={() => onToggleNoteLink(n.id, project.id)}
                                                        className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer text-xs ${isLinked ? 'bg-indigo-900/20 text-indigo-300' : 'text-nexus-text hover:bg-nexus-bg'}`}
                                                    >
                                                        <span className="truncate">{n.title}</span>
                                                        {isLinked && <Check size={12} />}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                         </div>
                         <div className="space-y-2">
                            {linkedNotes.length > 0 ? (
                                linkedNotes.map(note => (
                                    <div key={note.id} className="flex items-center justify-between p-3 bg-nexus-surface/30 border border-nexus-border rounded hover:border-nexus-muted/50 transition-colors group">
                                         <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded bg-nexus-surface border border-nexus-border flex items-center justify-center shrink-0">
                                                <StickyNote size={16} className="text-yellow-500" />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-sm text-nexus-text truncate">{note.title}</span>
                                                <span className="text-[10px] text-nexus-muted">Last updated: {new Date(note.updatedAt).toLocaleDateString()}</span>
                                            </div>
                                         </div>
                                         <button 
                                            onClick={() => onToggleNoteLink(note.id, project.id)} 
                                            className="opacity-0 group-hover:opacity-100 text-nexus-muted hover:text-red-400 transition-opacity"
                                            title="Unlink Note"
                                         >
                                            <X size={14} />
                                         </button>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-nexus-muted italic py-2">No notes linked yet.</p>
                            )}
                         </div>
                    </div>

                    {/* External Resources */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-end border-b border-nexus-border pb-2">
                            <label className="text-xs font-medium text-nexus-muted uppercase tracking-wider flex items-center gap-2">
                                <FileText size={12} /> External Resources
                            </label>
                        </div>
                        
                        <div className="space-y-2">
                            {editedProject.resources?.map(resource => (
                                <div key={resource.id} className="flex items-center justify-between p-3 bg-nexus-surface/30 border border-nexus-border rounded hover:border-nexus-muted/50 transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-nexus-surface border border-nexus-border flex items-center justify-center shrink-0">
                                            {getResourceIcon(resource.type)}
                                        </div>
                                        
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-sm text-nexus-text truncate">{resource.title}</span>
                                            {resource.url && (
                                                <a href={resource.url} target="_blank" rel="noreferrer" className="text-[10px] text-nexus-muted hover:text-nexus-text flex items-center gap-1 truncate">
                                                    {resource.url} <ExternalLink size={10} />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                    <button onClick={() => removeResource(resource.id)} className="opacity-0 group-hover:opacity-100 text-nexus-muted hover:text-red-400 transition-opacity">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                            {(!editedProject.resources || editedProject.resources.length === 0) && (
                                <p className="text-xs text-nexus-muted italic py-2">No external resources.</p>
                            )}
                        </div>

                        {/* Add Resource Input */}
                        <div className="flex flex-col gap-2 mt-2 p-3 bg-nexus-surface/20 rounded border border-nexus-border/30">
                            <div className="flex gap-2">
                                <select 
                                    value={newResourceType}
                                    onChange={(e) => setNewResourceType(e.target.value as any)}
                                    className="bg-nexus-surface border border-nexus-border rounded px-2 py-1.5 text-xs text-nexus-text outline-none cursor-pointer w-24"
                                >
                                    <option value="file">File</option>
                                    <option value="link">Link</option>
                                    <option value="checklist">Checklist</option>
                                </select>
                                <input 
                                    type="text"
                                    value={newResourceTitle}
                                    onChange={(e) => setNewResourceTitle(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddResource()}
                                    placeholder="Resource title..."
                                    className="flex-1 bg-nexus-surface border border-nexus-border rounded px-3 py-1.5 text-xs text-nexus-text outline-none placeholder-nexus-muted/50"
                                />
                            </div>
                            <div className="flex gap-2">
                                 <input 
                                    type="text"
                                    value={newResourceUrl}
                                    onChange={(e) => setNewResourceUrl(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddResource()}
                                    placeholder="URL (optional)..."
                                    className="flex-1 bg-nexus-surface border border-nexus-border rounded px-3 py-1.5 text-xs text-nexus-text outline-none placeholder-nexus-muted/50"
                                />
                                <button 
                                    onClick={handleAddResource}
                                    disabled={!newResourceTitle.trim()}
                                    className="bg-nexus-text text-nexus-bg px-4 py-1.5 rounded text-xs font-medium hover:bg-white disabled:opacity-50 transition-colors"
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-nexus-border/50 flex justify-between items-center bg-[#151515] rounded-b-lg">
                    <button 
                        onClick={() => onDelete(editedProject.id)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-900/10 rounded transition-colors"
                    >
                        <Trash2 size={16} />
                        <span>Delete Project</span>
                    </button>
                    <div className="flex gap-3">
                        <button 
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-nexus-muted hover:text-nexus-text transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={() => onSave(editedProject)}
                            className="px-6 py-2 text-sm font-medium bg-white text-black rounded hover:bg-gray-200 transition-colors"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Projects;