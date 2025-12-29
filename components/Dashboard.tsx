import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { Search, Plus, FileText, Trash2, Hash, Calendar, Network, Maximize2, X, PanelRightClose, PanelRightOpen, LayoutTemplate, Eye, Edit3, Folder, Link as LinkIcon, Check, ChevronRight, ChevronDown, FolderPlus, FolderOpen } from 'lucide-react';
import { Note, Project, NoteFolder } from '../types';

interface DashboardProps {
    notes: Note[];
    setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
    folders: NoteFolder[];
    setFolders: React.Dispatch<React.SetStateAction<NoteFolder[]>>;
    projects: Project[];
    setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
}

const Dashboard: React.FC<DashboardProps> = ({ notes, setNotes, folders, setFolders, projects, setProjects }) => {
  const [activeNoteId, setActiveNoteId] = useState<string | null>(notes.length > 0 ? notes[0].id : null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showGraph, setShowGraph] = useState(true);
  const [graphLayout, setGraphLayout] = useState<'main' | 'sidebar'>('main');
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('preview');
  const [isLinkingProject, setIsLinkingProject] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(folders.map(f => f.id)));
  
  const svgRef = useRef<SVGSVGElement>(null);

  // Derived state: Active Note
  const activeNote = useMemo(() => notes.find(n => n.id === activeNoteId), [notes, activeNoteId]);

  // Derived state: Filtered Notes (Flat list for search, or just notes for hierarchy)
  const filteredNotes = useMemo(() => {
    if (!searchQuery) return notes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    const lowerQuery = searchQuery.toLowerCase();
    return notes.filter(note => 
      note.title.toLowerCase().includes(lowerQuery) || 
      note.content.toLowerCase().includes(lowerQuery) ||
      note.tags.some(t => t.toLowerCase().includes(lowerQuery))
    ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [notes, searchQuery]);

  // Logic: Extract connections from content "[[Link]]"
  const graphData = useMemo(() => {
    const nodes = notes.map(n => ({ id: n.title, group: 1 }));
    const links: { source: string; target: string }[] = [];

    notes.forEach(sourceNote => {
      const regex = /\[\[(.*?)\]\]/g;
      let match;
      while ((match = regex.exec(sourceNote.content)) !== null) {
        const targetTitle = match[1];
        if (notes.some(n => n.title === targetTitle)) {
          links.push({ source: sourceNote.title, target: targetTitle });
        }
      }
    });

    return { nodes, links };
  }, [notes]);

  // --- Folder Management ---

  const toggleFolder = (folderId: string) => {
      const newSet = new Set(expandedFolders);
      if (newSet.has(folderId)) newSet.delete(folderId);
      else newSet.add(folderId);
      setExpandedFolders(newSet);
  };

  const handleCreateFolder = () => {
      const name = window.prompt("New Folder Name:");
      if (name) {
          const newFolder: NoteFolder = { id: Date.now().toString(), name };
          setFolders(prev => [...prev, newFolder]);
          setExpandedFolders(prev => new Set(prev).add(newFolder.id));
      }
  };

  const handleDeleteFolder = (folderId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (window.confirm("Delete this folder? Notes inside will be moved to root.")) {
          // Move notes to root
          setNotes(prev => prev.map(n => n.folderId === folderId ? { ...n, folderId: undefined } : n));
          // Remove folder
          setFolders(prev => prev.filter(f => f.id !== folderId));
      }
  };

  // --- Note Management ---

  const handleCreateNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: 'Untitled Note',
      content: '',
      tags: [],
      updatedAt: new Date().toISOString(),
      connections: [],
      linkedProjectIds: [],
      // If a folder is currently expanded or active, could default to that, but simplified to root or first folder
      folderId: folders.length > 0 ? folders[0].id : undefined 
    };
    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
    setViewMode('edit');
  };

  const handleDeleteNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotes(prev => prev.filter(n => n.id !== id));
    if (activeNoteId === id) setActiveNoteId(null);
  };

  const updateNote = (field: keyof Note, value: any) => {
    if (!activeNoteId) return;
    setNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, [field]: value, updatedAt: new Date().toISOString() } : n));
  };

  // Toggle Project Link
  const toggleProjectLink = (projectId: string) => {
      if (!activeNote) return;
      const currentLinks = activeNote.linkedProjectIds || [];
      const isLinked = currentLinks.includes(projectId);
      
      const newLinks = isLinked 
        ? currentLinks.filter(id => id !== projectId)
        : [...currentLinks, projectId];
      
      updateNote('linkedProjectIds', newLinks);
  };

  // Simple Markdown Parser (Headers, Bold, Lists, WikiLinks)
  const parseMarkdown = (text: string) => {
    if (!text) return { __html: '' };

    let html = text
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") // Sanitize
        // Headers
        .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-4 mt-2 text-white">$1</h1>')
        .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mb-3 mt-4 text-white">$1</h2>')
        .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mb-2 mt-3 text-white">$1</h3>')
        // Bold & Italic
        .replace(/\*\*(.*?)\*\*/gim, '<strong class="text-white font-semibold">$1</strong>')
        .replace(/\*(.*?)\*/gim, '<em class="text-nexus-muted">$1</em>')
        // Code
        .replace(/`(.*?)`/gim, '<code class="bg-nexus-surface border border-nexus-border px-1.5 py-0.5 rounded text-xs font-mono text-nexus-accent">$1</code>')
        // Lists
        .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc text-nexus-text/90 mb-1">$1</li>')
        // Line Breaks
        .replace(/\n/gim, '<br />');

    // WikiLinks Replacement logic: [[Note]]
    html = html.replace(/\[\[(.*?)\]\]/g, (match, title) => {
        const exists = notes.some(n => n.title.toLowerCase() === title.toLowerCase());
        const colorClass = exists ? 'text-blue-400 decoration-blue-400/30' : 'text-nexus-muted decoration-nexus-muted/30 opacity-70';
        return `<span data-wikilink="${title}" class="${colorClass} hover:text-white underline hover:decoration-white cursor-pointer transition-colors bg-nexus-surface/50 px-1 rounded mx-0.5 font-medium">${title}</span>`;
    });

    return { __html: html };
  };

  // Handle Clicking on Preview Content (WikiLinks)
  const handlePreviewClick = (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.dataset.wikilink) {
          const title = target.dataset.wikilink;
          const existingNote = notes.find(n => n.title.toLowerCase() === title.toLowerCase());
          
          if (existingNote) {
              setActiveNoteId(existingNote.id);
          } else {
              // Create auto-draft note
              const newNote: Note = {
                  id: Date.now().toString(),
                  title: title,
                  content: `# ${title}\n\nLinked from [[${activeNote?.title}]]\n\n`,
                  tags: ['auto-generated'],
                  updatedAt: new Date().toISOString(),
                  linkedProjectIds: []
              };
              setNotes(prev => [newNote, ...prev]);
              setActiveNoteId(newNote.id);
              setViewMode('edit');
          }
      }
  };

  // D3 Graph Effect
  useEffect(() => {
    if (!svgRef.current || !showGraph) return;

    // Clear previous
    d3.select(svgRef.current).selectAll("*").remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // 1. Calculate Node Degrees (Connections count) for scaling
    const nodeDegree: Record<string, number> = {};
    graphData.nodes.forEach(n => { nodeDegree[n.id] = 0; });
    graphData.links.forEach(l => {
        nodeDegree[l.source] += 1;
        nodeDegree[l.target] += 1;
    });

    // Scale radius based on connections
    const radiusScale = d3.scaleLinear()
        .domain([0, d3.max(Object.values(nodeDegree)) || 1])
        .range([graphLayout === 'main' ? 8 : 5, graphLayout === 'main' ? 25 : 15]);

    // 2. Setup Simulation
    const simulation = d3.forceSimulation(graphData.nodes as any)
      .force("link", d3.forceLink(graphData.links).id((d: any) => d.id).distance(graphLayout === 'main' ? 180 : 120))
      .force("charge", d3.forceManyBody().strength(graphLayout === 'main' ? -500 : -300)) // Repel force
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius((d: any) => radiusScale(nodeDegree[d.id]) + 10)); // Prevent overlap

    const svg = d3.select(svgRef.current);

    // Zoom setup
    const zoomGroup = svg.append("g");
    const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => zoomGroup.attr("transform", event.transform));
    svg.call(zoom as any);

    // 3. Draw Elements
    
    // Links
    const link = zoomGroup.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(graphData.links)
      .join("line")
      .attr("stroke", "#404040") // Darker grey for subtlety
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 1.5);

    // Nodes
    const node = zoomGroup.append("g")
      .attr("class", "nodes")
      .selectAll("circle")
      .data(graphData.nodes)
      .join("circle")
      .attr("r", (d: any) => radiusScale(nodeDegree[d.id]))
      .attr("fill", (d: any) => d.id === activeNote?.title ? "#ffffff" : "#2e2e2e") // Active is white, others dark grey
      .attr("stroke", (d: any) => d.id === activeNote?.title ? "#ffffff" : "#808080")
      .attr("stroke-width", (d: any) => d.id === activeNote?.title ? 3 : 1.5)
      .style("cursor", "pointer")
      .call(drag(simulation) as any);

    // Labels
    const text = zoomGroup.append("g")
        .attr("class", "labels")
        .selectAll("text")
        .data(graphData.nodes)
        .join("text")
        .text((d: any) => d.id)
        .attr("font-size", (d: any) => d.id === activeNote?.title ? (graphLayout === 'main' ? "14px" : "12px") : (graphLayout === 'main' ? "12px" : "10px"))
        .attr("font-weight", (d: any) => d.id === activeNote?.title ? "600" : "400")
        .attr("dx", (d: any) => radiusScale(nodeDegree[d.id]) + 6)
        .attr("dy", 4)
        .attr("fill", (d: any) => d.id === activeNote?.title ? "#ffffff" : "#808080")
        .attr("font-family", "Inter, sans-serif")
        .style("pointer-events", "none") // Let clicks pass through text to nodes
        .style("opacity", (d: any) => d.id === activeNote?.title || nodeDegree[d.id] > 2 ? 1 : 0.7); // Fade less important labels

    // 4. Interaction Logic
    
    // Build an adjacency list
    const linkedByIndex: Record<string, boolean> = {};
    graphData.links.forEach((d: any) => {
        linkedByIndex[`${d.source.id},${d.target.id}`] = true;
        linkedByIndex[`${d.target.id},${d.source.id}`] = true;
    });

    function isConnected(a: any, b: any) {
        return linkedByIndex[`${a.id},${b.id}`] || a.id === b.id;
    }

    // Hover Effects
    node.on("mouseover", function (event, d: any) {
        node.style("opacity", 0.1);
        text.style("opacity", 0.1);
        link.style("stroke-opacity", 0.05);

        const neighbors = node.filter((o: any) => isConnected(d, o));
        neighbors.style("opacity", 1).attr("fill", "#e5e5e5");
        
        d3.select(this).style("opacity", 1).attr("fill", "#ffffff").attr("r", radiusScale(nodeDegree[d.id]) * 1.2);

        text.filter((o: any) => isConnected(d, o))
            .style("opacity", 1)
            .attr("font-weight", "600")
            .attr("fill", "#ffffff");

        link.filter((o: any) => o.source.id === d.id || o.target.id === d.id)
            .style("stroke-opacity", 1)
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 2);
    })
    .on("mouseout", function () {
        node.style("opacity", 1)
            .attr("fill", (n: any) => n.id === activeNote?.title ? "#ffffff" : "#2e2e2e")
            .attr("r", (n: any) => radiusScale(nodeDegree[n.id]));
            
        text.style("opacity", (n: any) => n.id === activeNote?.title || nodeDegree[n.id] > 2 ? 1 : 0.7)
            .attr("font-weight", (n: any) => n.id === activeNote?.title ? "600" : "400")
            .attr("fill", (n: any) => n.id === activeNote?.title ? "#ffffff" : "#808080");
            
        link.style("stroke-opacity", 0.6)
            .attr("stroke", "#404040")
            .attr("stroke-width", 1.5);
    })
    .on("click", (event, d: any) => {
        const clickedNote = notes.find(n => n.title === d.id);
        if (clickedNote) {
            setActiveNoteId(clickedNote.id);
        }
    });

    // 5. Ticker
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("cx", (d: any) => d.x)
        .attr("cy", (d: any) => d.y);
        
      text
        .attr("x", (d: any) => d.x)
        .attr("y", (d: any) => d.y);
    });

    // Drag behavior
    function drag(simulation: any) {
      function dragstarted(event: any) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }
      function dragged(event: any) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
      function dragended(event: any) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }
      return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }

  }, [graphData, showGraph, activeNote, graphLayout]);

  const renderNoteItem = (note: Note) => (
      <div 
        key={note.id}
        onClick={() => setActiveNoteId(note.id)}
        className={`p-2.5 pl-8 border-l-[1px] cursor-pointer group transition-all flex justify-between items-center ${
            activeNoteId === note.id 
                ? 'bg-nexus-surface/80 border-l-white' 
                : 'hover:bg-nexus-surface/30 border-l-transparent'
        }`}
      >
        <div className="min-w-0">
             <h4 className={`text-sm font-medium truncate ${activeNoteId === note.id ? 'text-white' : 'text-nexus-text group-hover:text-white'}`}>
                {note.title || 'Untitled'}
            </h4>
            <span className="text-[10px] text-nexus-muted flex items-center gap-1 mt-0.5">
                <Calendar size={8} />
                {new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
        </div>
        
        {activeNoteId === note.id && (
            <button onClick={(e) => handleDeleteNote(note.id, e)} className="text-nexus-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 size={12} />
            </button>
        )}
    </div>
  );

  return (
    <div className="h-full flex overflow-hidden">
        
        {/* Left Sidebar: File Explorer */}
        <div className="w-64 bg-nexus-bg border-r border-nexus-border flex flex-col shrink-0">
            <div className="p-4 border-b border-nexus-border">
                <div className="relative group mb-3">
                    <Search className="absolute left-3 top-2.5 text-nexus-muted w-4 h-4 group-focus-within:text-nexus-text transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Search files..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-nexus-surface border border-nexus-border rounded-lg py-2 pl-9 pr-4 text-xs text-nexus-text focus:outline-none focus:border-nexus-muted transition-all placeholder-nexus-muted"
                    />
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={handleCreateNote}
                        className="flex-1 flex items-center justify-center gap-2 bg-nexus-surface hover:bg-nexus-border text-nexus-text py-1.5 rounded border border-nexus-border transition-colors text-xs font-medium"
                    >
                        <Plus size={14} /> Note
                    </button>
                    <button 
                        onClick={handleCreateFolder}
                        className="px-3 flex items-center justify-center bg-nexus-surface hover:bg-nexus-border text-nexus-text rounded border border-nexus-border transition-colors text-xs"
                        title="New Folder"
                    >
                        <FolderPlus size={14} />
                    </button>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pt-2">
                {/* Search Results View (Flat) */}
                {searchQuery ? (
                    <div className="px-2">
                        <p className="px-2 text-xs text-nexus-muted uppercase tracking-wider mb-2">Search Results</p>
                        {filteredNotes.length > 0 ? filteredNotes.map(n => renderNoteItem(n)) : <p className="px-4 text-xs text-nexus-muted italic">No results found.</p>}
                    </div>
                ) : (
                    /* Tree View */
                    <div className="space-y-1">
                        {/* Folders */}
                        {folders.map(folder => {
                            const isExpanded = expandedFolders.has(folder.id);
                            const folderNotes = filteredNotes.filter(n => n.folderId === folder.id);
                            
                            return (
                                <div key={folder.id}>
                                    <div 
                                        className="group flex items-center justify-between px-3 py-1.5 hover:bg-nexus-surface/50 cursor-pointer transition-colors"
                                        onClick={() => toggleFolder(folder.id)}
                                    >
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <span className="text-nexus-muted group-hover:text-nexus-text">
                                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                            </span>
                                            <div className="flex items-center gap-2 min-w-0">
                                                {isExpanded ? <FolderOpen size={14} className="text-indigo-400" /> : <Folder size={14} className="text-nexus-muted group-hover:text-indigo-300" />}
                                                <span className="text-sm text-nexus-text truncate">{folder.name}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                             <span className="text-[10px] text-nexus-muted">{folderNotes.length}</span>
                                             <button 
                                                onClick={(e) => handleDeleteFolder(folder.id, e)} 
                                                className="opacity-0 group-hover:opacity-100 p-1 text-nexus-muted hover:text-red-400 transition-opacity"
                                             >
                                                <Trash2 size={10} />
                                             </button>
                                        </div>
                                    </div>
                                    
                                    {isExpanded && (
                                        <div className="relative">
                                            <div className="absolute left-[19px] top-0 bottom-0 w-[1px] bg-nexus-border/50"></div>
                                            {folderNotes.map(note => renderNoteItem(note))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Unorganized Notes (Root) */}
                        <div className="mt-4">
                            <div className="px-3 py-1.5 flex items-center gap-2 text-nexus-muted">
                                <FileText size={14} />
                                <span className="text-xs uppercase tracking-wider font-medium">Unorganized</span>
                            </div>
                            {filteredNotes.filter(n => !n.folderId || !folders.find(f => f.id === n.folderId)).map(note => renderNoteItem(note))}
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Center: Content Area */}
        <div className="flex-1 flex bg-[#0f0f0f] relative overflow-hidden">
             
             {/* Component 1: Graph View */}
             <div className={`
                flex flex-col bg-nexus-bg transition-all duration-300 relative
                ${graphLayout === 'main' ? 'flex-1 order-1 border-r border-nexus-border' : (showGraph ? 'w-80 border-l border-nexus-border h-full shrink-0 order-2' : 'hidden')}
             `}>
                  {/* Graph Header */}
                  <div className="h-10 border-b border-nexus-border flex items-center justify-between px-3 bg-nexus-bg shrink-0">
                      <div className="flex items-center gap-2">
                        <Network size={14} className="text-nexus-muted" />
                        <span className="text-xs font-medium text-nexus-muted uppercase tracking-wider">
                          {graphLayout === 'main' ? 'Brain View' : 'Graph'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                          <button 
                            onClick={() => setGraphLayout(prev => prev === 'main' ? 'sidebar' : 'main')}
                            className="text-nexus-muted hover:text-nexus-text p-1 rounded hover:bg-nexus-surface transition-colors"
                            title={graphLayout === 'main' ? "Minimize Graph" : "Maximize Graph"}
                          >
                            {graphLayout === 'main' ? <LayoutTemplate size={14} /> : <Maximize2 size={14} />}
                          </button>
                          {graphLayout === 'sidebar' && (
                              <button onClick={() => setShowGraph(false)} className="text-nexus-muted hover:text-nexus-text p-1 rounded hover:bg-nexus-surface transition-colors">
                                <X size={14} />
                              </button>
                          )}
                      </div>
                  </div>
                  
                  {/* D3 Container */}
                  <div className="flex-1 relative overflow-hidden bg-[#0a0a0a]">
                     <svg ref={svgRef} className="w-full h-full block" />
                     
                     {/* Overlay Stats (Bottom Left) */}
                     <div className="absolute bottom-3 left-3 flex items-center gap-3">
                        <div className="text-[10px] text-nexus-muted bg-nexus-bg/80 px-2 py-1 rounded pointer-events-none border border-nexus-border/50 backdrop-blur-sm">
                            {graphData.nodes.length} Notes • {graphData.links.length} Connections
                        </div>
                     </div>
                  </div>

                  {/* Sidebar Metadata */}
                  <div className={`${graphLayout === 'main' ? 'hidden' : 'block'} flex-1 p-4 overflow-y-auto border-t border-nexus-border h-1/3`}>
                     <h5 className="text-xs font-medium text-nexus-muted uppercase tracking-wider mb-3">Links</h5>
                     <div className="space-y-2">
                        {graphData.links.filter(l => l.source === activeNote?.title || l.target === activeNote?.title).length > 0 ? (
                            graphData.links.filter(l => l.source === activeNote?.title || l.target === activeNote?.title).map((l, i) => (
                                <div key={i} className="flex items-center gap-2 p-2 bg-nexus-surface/50 rounded border border-transparent text-xs text-nexus-text truncate">
                                    <Network size={10} className="text-nexus-muted" />
                                    <span>{l.source === activeNote?.title ? `→ ${l.target}` : `← ${l.source}`}</span>
                                </div>
                            ))
                        ) : <p className="text-xs text-nexus-muted italic">No connections.</p>}
                     </div>
                  </div>
             </div>

             {/* Component 2: Editor View */}
             <div className={`
                flex flex-col h-full bg-[#0f0f0f] transition-all duration-300
                ${graphLayout === 'main' ? 'w-[500px] shrink-0 border-l border-nexus-border shadow-2xl z-10 order-2' : 'flex-1 order-1'}
                ${!activeNote ? 'hidden' : 'flex'}
             `}>
                {activeNote ? (
                    <>
                         {/* Editor Header */}
                         <div className="h-14 border-b border-nexus-border flex items-center justify-between px-6 bg-nexus-bg shrink-0">
                            <div className="flex items-center gap-4 text-xs overflow-x-auto no-scrollbar max-w-[50%]">
                                <div className="flex items-center gap-2 text-nexus-muted font-mono shrink-0">
                                    <Hash size={12} />
                                    <span>{activeNote.id}</span>
                                </div>
                                
                                {/* Folder Selector */}
                                <div className="flex items-center gap-1 shrink-0">
                                    <Folder size={12} className="text-nexus-muted" />
                                    <select 
                                        value={activeNote.folderId || ""} 
                                        onChange={(e) => updateNote('folderId', e.target.value || undefined)}
                                        className="bg-transparent text-nexus-text border-none focus:outline-none cursor-pointer hover:text-white transition-colors max-w-[100px] truncate appearance-none"
                                    >
                                        <option value="">Unorganized</option>
                                        {folders.map(f => (
                                            <option key={f.id} value={f.id}>{f.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center gap-1 text-nexus-muted shrink-0">
                                     <span className="text-nexus-border">/</span>
                                     <span className="text-nexus-text truncate max-w-[100px]">{activeNote.tags.join(', ') || 'untagged'}</span>
                                </div>
                            </div>

                            {/* Linked Projects Display in Header */}
                            {activeNote.linkedProjectIds && activeNote.linkedProjectIds.length > 0 && (
                                <div className="hidden md:flex items-center gap-2 ml-4 flex-1 overflow-hidden">
                                    {activeNote.linkedProjectIds.map(pid => {
                                        const proj = projects.find(p => p.id === pid);
                                        return proj ? (
                                            <span key={pid} className="flex items-center gap-1 text-[10px] bg-indigo-900/30 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded cursor-default whitespace-nowrap">
                                                <Folder size={10} />
                                                {proj.title}
                                            </span>
                                        ) : null;
                                    })}
                                </div>
                            )}

                            <div className="flex items-center gap-3 shrink-0 ml-auto">
                                {/* Toggle View Mode */}
                                <div className="flex items-center bg-nexus-surface rounded border border-nexus-border p-0.5">
                                    <button 
                                        onClick={() => setViewMode('edit')}
                                        className={`p-1.5 rounded transition-colors ${viewMode === 'edit' ? 'bg-nexus-border text-white' : 'text-nexus-muted hover:text-nexus-text'}`}
                                        title="Edit Mode"
                                    >
                                        <Edit3 size={14} />
                                    </button>
                                    <button 
                                        onClick={() => setViewMode('preview')}
                                        className={`p-1.5 rounded transition-colors ${viewMode === 'preview' ? 'bg-nexus-border text-white' : 'text-nexus-muted hover:text-nexus-text'}`}
                                        title="Preview Mode"
                                    >
                                        <Eye size={14} />
                                    </button>
                                </div>

                                <div className="w-[1px] h-4 bg-nexus-border"></div>

                                <button 
                                    onClick={() => {
                                        if (!showGraph) {
                                            setShowGraph(true);
                                            setGraphLayout('sidebar');
                                        } else {
                                            setGraphLayout(prev => prev === 'main' ? 'sidebar' : 'main');
                                        }
                                    }}
                                    className={`p-2 rounded hover:bg-nexus-surface text-nexus-muted hover:text-nexus-text transition-colors`}
                                    title="Toggle View Mode"
                                >
                                    {graphLayout === 'main' ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
                                </button>
                            </div>
                         </div>

                         {/* Title Input & Metadata */}
                         <div className="px-8 pt-8 pb-4 space-y-4">
                             <input 
                                type="text"
                                value={activeNote.title}
                                onChange={(e) => updateNote('title', e.target.value)}
                                placeholder="Note Title"
                                className="w-full bg-transparent text-3xl font-bold text-nexus-text focus:outline-none placeholder-nexus-border/30"
                             />
                             
                             {/* Linked Projects Selector */}
                             <div className="relative">
                                <button 
                                    onClick={() => setIsLinkingProject(!isLinkingProject)}
                                    className="flex items-center gap-2 text-xs font-medium text-nexus-muted hover:text-indigo-400 transition-colors"
                                >
                                    <LinkIcon size={12} />
                                    {activeNote.linkedProjectIds?.length ? 'Manage Project Links' : 'Link to Project'}
                                </button>

                                {isLinkingProject && (
                                    <div className="absolute top-full left-0 mt-2 w-64 bg-nexus-surface border border-nexus-border rounded-lg shadow-xl z-20 p-2 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="flex justify-between items-center mb-2 px-2 pb-2 border-b border-nexus-border/50">
                                            <span className="text-xs font-medium text-nexus-muted uppercase">Select Project</span>
                                            <button onClick={() => setIsLinkingProject(false)}><X size={12} className="text-nexus-muted hover:text-white" /></button>
                                        </div>
                                        <div className="max-h-48 overflow-y-auto space-y-1">
                                            {projects.map(p => {
                                                const isLinked = activeNote.linkedProjectIds?.includes(p.id);
                                                return (
                                                    <div 
                                                        key={p.id}
                                                        onClick={() => toggleProjectLink(p.id)}
                                                        className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer text-xs ${isLinked ? 'bg-indigo-900/20 text-indigo-300' : 'text-nexus-text hover:bg-nexus-bg'}`}
                                                    >
                                                        <span className="truncate">{p.title}</span>
                                                        {isLinked && <Check size={12} />}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                             </div>
                         </div>

                         {/* Markdown Area / Preview Area */}
                         <div className="flex-1 px-8 pb-8 overflow-y-auto custom-scrollbar relative">
                             {viewMode === 'edit' ? (
                                 <textarea 
                                    value={activeNote.content}
                                    onChange={(e) => updateNote('content', e.target.value)}
                                    placeholder="Start typing... use [[WikiLinks]] to connect ideas."
                                    className="w-full h-full bg-transparent text-nexus-text/90 resize-none focus:outline-none font-mono text-sm leading-relaxed placeholder-nexus-border/20 selection:bg-nexus-muted/30"
                                    spellCheck={false}
                                 />
                             ) : (
                                 <div 
                                    className="prose prose-invert prose-sm max-w-none text-nexus-text/80 font-mono"
                                    onClick={handlePreviewClick}
                                    dangerouslySetInnerHTML={parseMarkdown(activeNote.content)}
                                 >
                                 </div>
                             )}
                         </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-nexus-muted">
                        <FileText size={48} strokeWidth={1} className="mb-4 opacity-50" />
                        <p>Select a note or create a new one.</p>
                    </div>
                )}
             </div>
        </div>
    </div>
  );
};

export default Dashboard;