import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
    MousePointer2, Square, Circle, Type, FileText, Folder, Link2, 
    Trash2, ZoomIn, ZoomOut, X, ChevronUp, ChevronDown, 
    Group, Ungroup, Palette, Layers, Sidebar, Monitor, AlignLeft, AlignCenter, AlignRight, AlignJustify,
    Move, Lock, Eye, EyeOff, MoreHorizontal, Layout, Copy, CheckSquare, ClipboardCopy,
    ArrowRight, ArrowDown, AlignHorizontalSpaceAround, AlignVerticalSpaceAround, Frame,
    LayoutTemplate, Box, PenTool, WrapText, Scaling, CornerUpLeft, Bold, Italic
} from 'lucide-react';
import { CanvasNode, CanvasConnection, CanvasNodeType, Note, Project } from '../types';

interface DesignCanvasProps {
    notes: Note[];
    projects: Project[];
}

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se';

const COLORS = ['#1a1a1a', '#2e2e2e', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ffffff', 'transparent'];

const GOOGLE_FONTS = [
    'Inter', 
    'Roboto', 
    'Open Sans', 
    'Montserrat', 
    'Lato', 
    'Poppins', 
    'Playfair Display', 
    'Merriweather', 
    'JetBrains Mono'
];

const FONT_WEIGHTS = [
    { label: 'Thin', value: 300 },
    { label: 'Regular', value: 400 },
    { label: 'Medium', value: 500 },
    { label: 'Semi Bold', value: 600 },
    { label: 'Bold', value: 700 },
    { label: 'Extra Bold', value: 800 },
];

const DesignCanvas: React.FC<DesignCanvasProps> = ({ notes, projects }) => {
    // --- State ---
    const [nodes, setNodes] = useState<CanvasNode[]>([]);
    const [connections, setConnections] = useState<CanvasConnection[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const [tool, setTool] = useState<CanvasNodeType | 'select' | 'connect' | 'pen'>('select');
    
    // UI State
    const [showLeftPanel, setShowLeftPanel] = useState(true);
    const [showRightPanel, setShowRightPanel] = useState(true);
    
    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; canvasX: number; canvasY: number } | null>(null);
    const [clipboard, setClipboard] = useState<CanvasNode[]>([]);

    // Viewport
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [scale, setScale] = useState(1);

    // Refs for Event Listeners
    const scaleRef = useRef(scale);
    const offsetRef = useRef(offset);
    
    // Interaction
    const [isPanning, setIsPanning] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState<ResizeHandle | null>(null);
    const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
    const [connectionStartId, setConnectionStartId] = useState<string | null>(null);
    
    // Drag Tracking
    const hasDraggedRef = useRef(false);
    const dragStartPosRef = useRef({ x: 0, y: 0 });
    const creationStartPosRef = useRef<{x: number, y: number} | null>(null);

    // Marquee Selection State
    const [selectionBox, setSelectionBox] = useState<{ startX: number, startY: number, currentX: number, currentY: number } | null>(null);

    // Pen Tool State
    const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
    
    // Modals
    const [showLinkModal, setShowLinkModal] = useState<'note' | 'project' | null>(null);

    // Helper Canvas for text measurement
    const canvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));

    const containerRef = useRef<HTMLDivElement>(null);

    // Sync Refs with State
    useEffect(() => {
        scaleRef.current = scale;
        offsetRef.current = offset;
    }, [scale, offset]);

    // Close Context Menu on click elsewhere
    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    // Handle Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (tool === 'pen' && currentPath.length > 0) {
                if (e.key === 'Enter' || e.key === 'Escape') {
                    finishPath(e.key === 'Enter'); 
                }
            }
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedIds.size > 0 && tool === 'select' && !editingNodeId) {
                    handleDelete();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [tool, currentPath, selectedIds, editingNodeId]);

    // --- Native Wheel Handler ---
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            if (editingNodeId) return; 
            e.preventDefault();

            const currentScale = scaleRef.current;
            const currentOffset = offsetRef.current;

            if (e.ctrlKey || e.metaKey) {
                const rect = container.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;

                const zoomSensitivity = 0.001;
                const delta = -e.deltaY * zoomSensitivity;
                const newScale = Math.min(Math.max(0.1, currentScale + delta), 5);

                const worldX = (mouseX - currentOffset.x) / currentScale;
                const worldY = (mouseY - currentOffset.y) / currentScale;

                const newOffsetX = mouseX - (worldX * newScale);
                const newOffsetY = mouseY - (worldY * newScale);

                setScale(newScale);
                setOffset({ x: newOffsetX, y: newOffsetY });
            } else {
                setOffset(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
            }
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => {
            container.removeEventListener('wheel', handleWheel);
        };
    }, [editingNodeId]);

    // --- Helpers ---

    const getCanvasCoordinates = (e: React.MouseEvent) => {
        if (!containerRef.current) return { x: 0, y: 0 };
        const rect = containerRef.current.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left - offset.x) / scale,
            y: (e.clientY - rect.top - offset.y) / scale
        };
    };

    const getRootParent = (node: CanvasNode, allNodes: CanvasNode[]): CanvasNode => {
        let current = node;
        while (current.parentId) {
            const parent = allNodes.find(n => n.id === current.parentId);
            if (parent) {
                current = parent;
            } else {
                break;
            }
        }
        return current;
    };

    const measureText = (text: string, style: any) => {
        const context = canvasRef.current.getContext('2d');
        if (!context) return { width: 100, height: 20 };
        context.font = `${style.fontStyle || ''} ${style.fontWeight || 400} ${style.fontSize || 16}px ${style.fontFamily || 'Inter'}`;
        
        if (!text) return { width: 20, height: style.fontSize * 1.5 };

        // Simple approximate measurement for auto width
        const metrics = context.measureText(text);
        const textWidth = metrics.width + 10; // Padding
        const textHeight = (style.fontSize || 16) * 1.5; // Line height approx

        // If fixed width (dragged box), we assume height grows, but for auto we return calculated
        return { width: textWidth, height: textHeight };
    };

    const addNode = (type: CanvasNodeType, x: number, y: number, width?: number, height?: number, textAutoResize: 'auto' | 'fixed' = 'auto', content?: string, referenceId?: string) => {
        const newNode: CanvasNode = {
            id: Date.now().toString(),
            type,
            x: x - (type === 'text' ? 0 : 75),
            y: y - (type === 'text' ? 0 : 50),
            width: width || (type === 'text' ? 20 : 150),
            height: height || (type === 'text' ? 30 : 100),
            content,
            referenceId,
            textAutoResize: type === 'text' ? textAutoResize : undefined,
            style: {
                backgroundColor: type === 'text' ? 'transparent' : '#1a1a1a',
                borderColor: type === 'text' ? 'transparent' : '#2e2e2e',
                borderWidth: type === 'text' ? 0 : 1,
                borderRadius: type === 'circle' ? 999 : 8,
                fontSize: 16,
                fontFamily: 'Inter',
                fontWeight: 400,
                fontStyle: 'normal',
                textAlign: 'left',
                textColor: '#e5e5e5'
            },
            zIndex: nodes.length + 1
        };
        setNodes(prev => [...prev, newNode]);
        setTool('select');
        setSelectedIds(new Set([newNode.id]));
        if (type === 'text') {
            setEditingNodeId(newNode.id);
        }
    };

    const isCenterOverlapping = (node: CanvasNode, container: CanvasNode) => {
        const centerX = node.x + node.width / 2;
        const centerY = node.y + node.height / 2;
        return (
            centerX >= container.x &&
            centerX <= container.x + container.width &&
            centerY >= container.y &&
            centerY <= container.y + container.height
        );
    };

    // --- Pen Tool Logic ---
    const finishPath = (closeLoop: boolean) => {
        if (currentPath.length < 2) {
            setCurrentPath([]);
            return;
        }

        const minX = Math.min(...currentPath.map(p => p.x));
        const minY = Math.min(...currentPath.map(p => p.y));
        const maxX = Math.max(...currentPath.map(p => p.x));
        const maxY = Math.max(...currentPath.map(p => p.y));
        const width = maxX - minX;
        const height = maxY - minY;

        let d = `M ${currentPath[0].x - minX} ${currentPath[0].y - minY}`;
        for (let i = 1; i < currentPath.length; i++) {
            d += ` L ${currentPath[i].x - minX} ${currentPath[i].y - minY}`;
        }
        if (closeLoop) d += ' Z';

        const pathNode: CanvasNode = {
            id: Date.now().toString(),
            type: 'path',
            x: minX,
            y: minY,
            width: Math.max(width, 2),
            height: Math.max(height, 2),
            pathData: d,
            style: {
                backgroundColor: 'transparent',
                borderColor: '#e5e5e5',
                borderWidth: 2
            },
            zIndex: nodes.length + 1
        };

        setNodes([...nodes, pathNode]);
        setCurrentPath([]);
        setSelectedIds(new Set([pathNode.id]));
        setTool('select');
    };

    // --- Auto Layout Engine (Revised) ---
    const applyAutoLayout = (parentNode: CanvasNode, currentNodes: CanvasNode[]): CanvasNode[] => {
        if (!parentNode.layoutMode || parentNode.layoutMode === 'none') return currentNodes;

        const padding = parentNode.layoutPadding || 0;
        const gap = parentNode.layoutGap || 0;
        const isHorizontal = parentNode.layoutMode === 'horizontal';
        
        const children = currentNodes.filter(n => n.parentId === parentNode.id);
        if (children.length === 0) return currentNodes;

        const sortedChildren = [...children].sort((a, b) => {
            if (isHorizontal) return a.x - b.x;
            return a.y - b.y;
        });

        const newNodes = [...currentNodes];
        
        let currentOffsetX = padding;
        let currentOffsetY = padding;
        
        let rowMaxHeight = 0; 
        let colMaxWidth = 0;  
        
        let maxContentWidth = 0;
        let maxContentHeight = 0;

        sortedChildren.forEach(child => {
            const childIndex = newNodes.findIndex(n => n.id === child.id);
            if (childIndex === -1) return;

            let x = parentNode.x + currentOffsetX;
            let y = parentNode.y + currentOffsetY;

            if (parentNode.layoutWrap && parentNode.layoutSizing === 'fixed') {
                 if (isHorizontal) {
                     if (currentOffsetX + child.width + padding > parentNode.width) {
                         // Simplified wrap logic
                         currentOffsetX = padding;
                         currentOffsetY += rowMaxHeight + gap;
                         x = parentNode.x + currentOffsetX;
                         y = parentNode.y + currentOffsetY;
                         rowMaxHeight = 0;
                     }
                 }
            }

            newNodes[childIndex] = { ...newNodes[childIndex], x, y };

            if (isHorizontal) {
                currentOffsetX += child.width + gap;
                rowMaxHeight = Math.max(rowMaxHeight, child.height);
                maxContentWidth = Math.max(maxContentWidth, currentOffsetX - gap + padding); 
                maxContentHeight = Math.max(maxContentHeight, currentOffsetY + child.height + padding);
            } else {
                currentOffsetY += child.height + gap;
                colMaxWidth = Math.max(colMaxWidth, child.width);
                maxContentHeight = Math.max(maxContentHeight, currentOffsetY - gap + padding);
                maxContentWidth = Math.max(maxContentWidth, currentOffsetX + child.width + padding);
            }
        });

        const parentIndex = newNodes.findIndex(n => n.id === parentNode.id);
        if (parentIndex !== -1) {
            if (parentNode.layoutSizing !== 'fixed') {
                newNodes[parentIndex] = { 
                    ...newNodes[parentIndex], 
                    width: Math.max(100, maxContentWidth), 
                    height: Math.max(50, maxContentHeight) 
                };
            }
        }

        return newNodes;
    };

    // --- Canvas Logic (Layering, Grouping, Styling, Alignment) ---

    const handleAlign = (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
        const selectedNodes = nodes.filter(n => selectedIds.has(n.id));
        if (selectedNodes.length === 0) return;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        if (selectedNodes.length === 1) {
             const node = selectedNodes[0];
             if (!node.parentId) return; 
             const parent = nodes.find(n => n.id === node.parentId);
             if (!parent) return;
             const pad = parent.layoutPadding || 0;
             minX = parent.x + pad;
             minY = parent.y + pad;
             maxX = parent.x + parent.width - pad;
             maxY = parent.y + parent.height - pad;
        } else {
             selectedNodes.forEach(n => {
                 minX = Math.min(minX, n.x);
                 minY = Math.min(minY, n.y);
                 maxX = Math.max(maxX, n.x + n.width);
                 maxY = Math.max(maxY, n.y + n.height);
             });
        }
        
        const selectionWidth = maxX - minX;
        const selectionHeight = maxY - minY;
        const selectionCenterX = minX + selectionWidth / 2;
        const selectionCenterY = minY + selectionHeight / 2;

        const updatedNodes = nodes.map(n => {
            if (selectedIds.has(n.id)) {
                let newX = n.x;
                let newY = n.y;

                switch (alignment) {
                    case 'left': newX = minX; break;
                    case 'center': newX = selectionCenterX - (n.width / 2); break;
                    case 'right': newX = maxX - n.width; break;
                    case 'top': newY = minY; break;
                    case 'middle': newY = selectionCenterY - (n.height / 2); break;
                    case 'bottom': newY = maxY - n.height; break;
                }
                return { ...n, x: newX, y: newY };
            }
            return n;
        });
        
        setNodes(updatedNodes);
    };

    // ... (Grouping, Layering, Deletion functions kept same, abbreviated for clarity if not changed)
    const handleBringToFront = () => {
        if (selectedIds.size === 0) return;
        const maxZ = Math.max(...nodes.map(n => n.zIndex || 0)) + 1;
        setNodes(prev => prev.map(n => selectedIds.has(n.id) ? { ...n, zIndex: maxZ } : n));
        setContextMenu(null);
    };

    const handleSendToBack = () => {
        if (selectedIds.size === 0) return;
        const minZ = Math.min(...nodes.map(n => n.zIndex || 0)) - 1;
        setNodes(prev => prev.map(n => selectedIds.has(n.id) ? { ...n, zIndex: minZ } : n));
        setContextMenu(null);
    };

    const handleCreateFrame = (x: number, y: number) => {
        addNode('frame', x, y, 400, 300);
        setContextMenu(null);
    };

    const handleCreateStack = (x: number, y: number) => {
        const stackNode: CanvasNode = {
            id: Date.now().toString(),
            type: 'group',
            x: x,
            y: y,
            width: 200,
            height: 200,
            zIndex: (Math.max(...nodes.map(node => node.zIndex || 0)) || 0) + 1,
            style: { backgroundColor: 'transparent', borderColor: '#525252', borderWidth: 1, borderRadius: 8 },
            layoutMode: 'vertical',
            layoutSizing: 'hug',
            layoutGap: 16,
            layoutPadding: 16
        };
        setNodes([...nodes, stackNode]);
        setSelectedIds(new Set([stackNode.id]));
        setContextMenu(null);
    };

    const handleWrapInStack = () => {
        if (selectedIds.size === 0) return;
        const selectedNodes = nodes.filter(n => selectedIds.has(n.id));
        const minX = Math.min(...selectedNodes.map(n => n.x));
        const minY = Math.min(...selectedNodes.map(n => n.y));
        const maxX = Math.max(...selectedNodes.map(n => n.x + n.width));
        const maxY = Math.max(...selectedNodes.map(n => n.y + n.height));
        
        const stackNode: CanvasNode = {
            id: Date.now().toString(),
            type: 'group',
            x: minX - 16,
            y: minY - 16,
            width: (maxX - minX) + 32,
            height: (maxY - minY) + 32,
            zIndex: (Math.min(...selectedNodes.map(n => n.zIndex || 0))) - 1,
            style: { backgroundColor: 'transparent', borderColor: '#525252', borderWidth: 1, borderRadius: 8 },
            layoutMode: 'vertical', 
            layoutSizing: 'hug',
            layoutGap: 16,
            layoutPadding: 16
        };

        let newNodes = [...nodes, stackNode];
        newNodes = newNodes.map(n => selectedIds.has(n.id) ? { ...n, parentId: stackNode.id } : n);
        newNodes = applyAutoLayout(stackNode, newNodes);
        setNodes(newNodes);
        setSelectedIds(new Set([stackNode.id]));
        setContextMenu(null);
    };

    const handleGroup = () => {
        if (selectedIds.size < 2) return;
        const selectedNodes = nodes.filter(n => selectedIds.has(n.id));
        const minX = Math.min(...selectedNodes.map(n => n.x));
        const minY = Math.min(...selectedNodes.map(n => n.y));
        const maxX = Math.max(...selectedNodes.map(n => n.x + n.width));
        const maxY = Math.max(...selectedNodes.map(n => n.y + n.height));
        
        const groupNode: CanvasNode = {
            id: Date.now().toString(),
            type: 'group',
            x: minX - 20,
            y: minY - 20,
            width: (maxX - minX) + 40,
            height: (maxY - minY) + 40,
            zIndex: (Math.min(...selectedNodes.map(n => n.zIndex || 0))) - 1,
            style: { backgroundColor: 'transparent', borderColor: '#525252', borderWidth: 1, borderRadius: 0 },
            layoutMode: 'none',
            layoutSizing: 'fixed',
            layoutGap: 16,
            layoutPadding: 20
        };

        let newNodes = [...nodes, groupNode];
        newNodes = newNodes.map(n => selectedIds.has(n.id) ? { ...n, parentId: groupNode.id } : n);
        setNodes(newNodes);
        setSelectedIds(new Set([groupNode.id])); 
        setContextMenu(null);
    };

    const handleUngroup = () => {
        const selectedNodes = nodes.filter(n => selectedIds.has(n.id));
        const groupsToUngroup = selectedNodes.filter(n => n.type === 'group' || n.type === 'frame');
        
        if (groupsToUngroup.length > 0) {
            const groupIds = new Set(groupsToUngroup.map(g => g.id));
            let newNodes = nodes.filter(n => !groupIds.has(n.id));
            newNodes = newNodes.map(n => n.parentId && groupIds.has(n.parentId) ? { ...n, parentId: undefined } : n);
            setNodes(newNodes);
        }
        setContextMenu(null);
    };

    const handleDelete = () => {
        if (selectedIds.size > 0) {
            const idsToDelete = new Set(selectedIds);
            nodes.forEach(n => {
                if (n.parentId && idsToDelete.has(n.parentId)) {
                    idsToDelete.add(n.id);
                }
            });
            setNodes(nodes.filter(n => !idsToDelete.has(n.id)));
            setConnections(connections.filter(c => !idsToDelete.has(c.from) && !idsToDelete.has(c.to)));
            setSelectedIds(new Set());
        }
        setContextMenu(null);
    };

    const handleDuplicate = () => {
        const selectedNodes = nodes.filter(n => selectedIds.has(n.id));
        const newNodes = selectedNodes.map(n => ({
            ...n,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            x: n.x + 20,
            y: n.y + 20,
            parentId: undefined,
            zIndex: (Math.max(...nodes.map(node => node.zIndex || 0)) || 0) + 1
        }));
        setNodes([...nodes, ...newNodes]);
        setSelectedIds(new Set(newNodes.map(n => n.id)));
        setContextMenu(null);
    };

    const handleCopy = () => {
        const selectedNodes = nodes.filter(n => selectedIds.has(n.id));
        setClipboard(selectedNodes);
        setContextMenu(null);
    };

    const updateNodeProperty = (key: keyof CanvasNode | 'style', value: any, styleKey?: keyof CanvasNode['style']) => {
        let updatedNodes = nodes.map(n => {
            if (selectedIds.has(n.id)) {
                if (key === 'style' && styleKey) {
                    return { ...n, style: { ...n.style, [styleKey]: value } };
                }
                return { ...n, [key]: value };
            }
            return n;
        });

        // Re-measure auto width text if properties change
        if ((key === 'style' && (styleKey === 'fontSize' || styleKey === 'fontWeight' || styleKey === 'fontFamily' || styleKey === 'fontStyle'))) {
             updatedNodes = updatedNodes.map(n => {
                 if (selectedIds.has(n.id) && n.type === 'text' && n.textAutoResize === 'auto') {
                     const dims = measureText(n.content || '', n.style || {});
                     return { ...n, width: dims.width, height: dims.height };
                 }
                 return n;
             });
        }

        if (key === 'layoutMode' || key === 'layoutGap' || key === 'layoutPadding' || key === 'layoutSizing' || key === 'layoutWrap') {
            selectedIds.forEach(id => {
                 const node = updatedNodes.find(n => n.id === id);
                 if (node) {
                     updatedNodes = applyAutoLayout(node, updatedNodes);
                 }
            });
        }

        setNodes(updatedNodes);
    };

    // --- Interaction Handlers ---

    const handleContextMenu = (e: React.MouseEvent, nodeId?: string) => {
        e.preventDefault();
        e.stopPropagation();

        if (nodeId) {
            if (!selectedIds.has(nodeId)) {
                setSelectedIds(new Set([nodeId]));
            }
        }

        const coords = getCanvasCoordinates(e);

        setContextMenu({ 
            x: e.clientX, 
            y: e.clientY,
            canvasX: coords.x,
            canvasY: coords.y
        });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        const coords = getCanvasCoordinates(e);

        // Click outside text area stops editing
        if (editingNodeId && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
            setEditingNodeId(null);
        }

        // Pan Logic
        if (e.button === 1 || ((e.target as HTMLElement).id === 'canvas-bg' && tool === 'select')) {
             if (tool === 'select' && e.button === 0 && !e.shiftKey) {
                setSelectionBox({ startX: coords.x, startY: coords.y, currentX: coords.x, currentY: coords.y });
                setSelectedIds(new Set()); 
                return;
             }
             setIsPanning(true);
             setLastMousePos({ x: e.clientX, y: e.clientY });
             return;
        }

        // Pen Tool
        if (tool === 'pen') {
            if (currentPath.length > 2) {
                const startPoint = currentPath[0];
                const dist = Math.sqrt(Math.pow(coords.x - startPoint.x, 2) + Math.pow(coords.y - startPoint.y, 2));
                if (dist < 10) {
                    finishPath(true);
                    return;
                }
            }
            setCurrentPath([...currentPath, { x: coords.x, y: coords.y }]);
            return;
        }

        // Creation logic for Text and Shapes
        if (tool !== 'select' && tool !== 'connect') {
            if (tool === 'text') {
                // Text Creation Start - Just mark the start point
                setSelectionBox({ startX: coords.x, startY: coords.y, currentX: coords.x, currentY: coords.y });
                creationStartPosRef.current = { x: coords.x, y: coords.y };
            } else if (tool === 'note-link') {
                setShowLinkModal('note');
                setLastMousePos(coords); 
            } else if (tool === 'project-link') {
                setShowLinkModal('project');
                setLastMousePos(coords);
            } else {
                addNode(tool, coords.x, coords.y);
            }
        }
    };

    const handleNodeMouseDown = (e: React.MouseEvent, node: CanvasNode) => {
        if (tool !== 'select' && tool !== 'connect') return;

        // If clicking inside the currently editing text area, don't trigger drag/selection logic
        if (editingNodeId === node.id) {
            e.stopPropagation();
            return;
        }

        e.stopPropagation();
        
        if (tool === 'connect') {
            if (!connectionStartId) {
                setConnectionStartId(node.id);
            } else {
                if (connectionStartId !== node.id) {
                    setConnections([...connections, { id: Date.now().toString(), from: connectionStartId, to: node.id }]);
                }
                setConnectionStartId(null);
                setTool('select');
            }
            return;
        }

        // Selection Logic
        let targetNode = node;
        if (!e.ctrlKey && !e.metaKey && !selectedIds.has(node.id)) {
            targetNode = getRootParent(node, nodes);
        }

        let newSelection = new Set(selectedIds);
        
        hasDraggedRef.current = false;
        dragStartPosRef.current = { x: e.clientX, y: e.clientY };
        
        if (e.shiftKey) {
            if (newSelection.has(targetNode.id)) newSelection.delete(targetNode.id);
            else newSelection.add(targetNode.id);
            setSelectedIds(newSelection);
        } else {
            if (!newSelection.has(targetNode.id)) {
                 newSelection = new Set([targetNode.id]);
                 setSelectedIds(newSelection);
            }
        }

        setIsDragging(true);
        setLastMousePos({ x: e.clientX, y: e.clientY });
    };

    const handleNodeClick = (e: React.MouseEvent, node: CanvasNode) => {
        e.stopPropagation();
        if (editingNodeId === node.id) return;

        let targetNode = node;
        if (!e.ctrlKey && !e.metaKey && !selectedIds.has(node.id)) {
             targetNode = getRootParent(node, nodes);
        }

        if (tool === 'select' && !e.shiftKey && !hasDraggedRef.current && selectedIds.has(targetNode.id)) {
            setSelectedIds(new Set([targetNode.id]));
        }
    };

    const handleNodeDoubleClick = (e: React.MouseEvent, node: CanvasNode) => {
        if (tool !== 'select') return;
        e.stopPropagation();
        
        // Drill down first
        setSelectedIds(new Set([node.id]));

        // If it's a text node, enter editing mode
        if (node.type === 'text') {
            setEditingNodeId(node.id);
        }
    };

    const handleResizeStart = (e: React.MouseEvent, handle: ResizeHandle) => {
        e.stopPropagation();
        setIsResizing(handle);
        setLastMousePos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging) {
             const dist = Math.hypot(e.clientX - dragStartPosRef.current.x, e.clientY - dragStartPosRef.current.y);
             if (dist > 3) hasDraggedRef.current = true;
        }

        if (isPanning) {
            const dx = e.clientX - lastMousePos.x;
            const dy = e.clientY - lastMousePos.y;
            setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
            setLastMousePos({ x: e.clientX, y: e.clientY });
            return;
        }

        if (selectionBox) {
            const coords = getCanvasCoordinates(e);
            setSelectionBox(prev => prev ? { ...prev, currentX: coords.x, currentY: coords.y } : null);
            return;
        }

        if (isResizing && selectedIds.size === 1) {
            const nodeId = Array.from(selectedIds)[0];
            const dx = (e.clientX - lastMousePos.x) / scale;
            const dy = (e.clientY - lastMousePos.y) / scale;

            let updatedNodes = nodes.map(n => {
                if (n.id !== nodeId) return n;
                
                let changes: Partial<CanvasNode> = {};
                // If resizing a text manually, switch to fixed
                if (n.type === 'text') {
                    changes.textAutoResize = 'fixed';
                }
                if (n.layoutMode && n.layoutMode !== 'none') {
                    changes.layoutSizing = 'fixed';
                }

                let { x, y, width, height } = n;
                if (isResizing.includes('e')) width += dx;
                if (isResizing.includes('w')) { x += dx; width -= dx; }
                if (isResizing.includes('s')) height += dy;
                if (isResizing.includes('n')) { y += dy; height -= dy; }
                if (width < 20) width = 20;
                if (height < 20) height = 20;
                
                return { ...n, ...changes, x, y, width, height };
            });

            const resizedNode = updatedNodes.find(n => n.id === nodeId);
            if (resizedNode && resizedNode.layoutMode && resizedNode.layoutMode !== 'none') {
                updatedNodes = applyAutoLayout(resizedNode, updatedNodes);
            }

            setNodes(updatedNodes);
            setLastMousePos({ x: e.clientX, y: e.clientY });
            return;
        }

        if (isDragging && selectedIds.size > 0 && !editingNodeId) {
            const dx = (e.clientX - lastMousePos.x) / scale;
            const dy = (e.clientY - lastMousePos.y) / scale;
            
            let updatedNodes = [...nodes];
            const movedIds = new Set<string>();

            const moveNode = (id: string, deltaX: number, deltaY: number) => {
                if (movedIds.has(id)) return;
                movedIds.add(id);

                const index = updatedNodes.findIndex(n => n.id === id);
                if (index !== -1) {
                    updatedNodes[index] = {
                        ...updatedNodes[index],
                        x: updatedNodes[index].x + deltaX,
                        y: updatedNodes[index].y + deltaY
                    };
                    const children = updatedNodes.filter(n => n.parentId === id);
                    children.forEach(c => moveNode(c.id, deltaX, deltaY));
                }
            };

            selectedIds.forEach(id => moveNode(id, dx, dy));
            setNodes(updatedNodes);
            setLastMousePos({ x: e.clientX, y: e.clientY });
        }
    };

    const handleMouseUp = () => {
        // --- MARQUEE SELECTION / CREATION COMMIT ---
        if (selectionBox) {
            if (tool === 'text' && creationStartPosRef.current) {
                // Determine if click or drag
                const dist = Math.hypot(selectionBox.currentX - creationStartPosRef.current.x, selectionBox.currentY - creationStartPosRef.current.y);
                const isDrag = dist > 5;

                if (isDrag) {
                    // Drag: Fixed width Box
                    const x = Math.min(selectionBox.startX, selectionBox.currentX);
                    const y = Math.min(selectionBox.startY, selectionBox.currentY);
                    const w = Math.abs(selectionBox.currentX - selectionBox.startX);
                    const h = Math.abs(selectionBox.currentY - selectionBox.startY);
                    addNode('text', x, y, Math.max(w, 20), Math.max(h, 30), 'fixed');
                } else {
                    // Click: Auto width
                    addNode('text', selectionBox.startX, selectionBox.startY, undefined, undefined, 'auto');
                }
                setSelectionBox(null);
                creationStartPosRef.current = null;
                return;
            }

            // Normal Selection Marquee
            const x1 = Math.min(selectionBox.startX, selectionBox.currentX);
            const x2 = Math.max(selectionBox.startX, selectionBox.currentX);
            const y1 = Math.min(selectionBox.startY, selectionBox.currentY);
            const y2 = Math.max(selectionBox.startY, selectionBox.currentY);

            const newSelection = new Set<string>();
            nodes.forEach(node => {
                const nodeCenterX = node.x + node.width / 2;
                const nodeCenterY = node.y + node.height / 2;
                if (nodeCenterX >= x1 && nodeCenterX <= x2 && nodeCenterY >= y1 && nodeCenterY <= y2) {
                    newSelection.add(node.id);
                }
            });
            setSelectedIds(newSelection);
            setSelectionBox(null);
            return;
        }

        if ((isDragging || isResizing) && selectedIds.size > 0 && hasDraggedRef.current) {
             let updatedNodes = [...nodes];
             const affectedParentIds = new Set<string>();

             if (isDragging) {
                 updatedNodes = updatedNodes.map(node => {
                    if (selectedIds.has(node.id)) {
                        const containers = updatedNodes.filter(c => 
                            (c.type === 'group' || c.type === 'frame') && 
                            !selectedIds.has(c.id) &&
                            c.id !== node.id
                        ).sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));

                        const newParent = containers.find(c => isCenterOverlapping(node, c));

                        if (newParent) {
                            if (node.parentId !== newParent.id) {
                                if (node.parentId) affectedParentIds.add(node.parentId); 
                                affectedParentIds.add(newParent.id);
                                return { ...node, parentId: newParent.id };
                            }
                            if (node.parentId === newParent.id) {
                                affectedParentIds.add(newParent.id);
                            }
                        } else {
                            if (node.parentId) {
                                affectedParentIds.add(node.parentId);
                                return { ...node, parentId: undefined };
                            }
                        }
                    }
                    return node;
                 });
             }

             if (isResizing) {
                 nodes.forEach(n => {
                    if (selectedIds.has(n.id) && n.parentId) {
                        affectedParentIds.add(n.parentId);
                    }
                 });
             }

             if (affectedParentIds.size > 0) {
                 affectedParentIds.forEach(parentId => {
                     const parent = updatedNodes.find(n => n.id === parentId);
                     if (parent && parent.layoutMode && parent.layoutMode !== 'none') {
                         updatedNodes = applyAutoLayout(parent, updatedNodes);
                     }
                 });
                 setNodes(updatedNodes);
             } else {
                 setNodes(updatedNodes);
             }
        }

        setIsPanning(false);
        setIsDragging(false);
        setIsResizing(null);
    };

    // --- Rendering ---
    const sortedNodes = useMemo(() => [...nodes].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)), [nodes]);
    const primaryNode = selectedIds.size > 0 ? nodes.find(n => n.id === Array.from(selectedIds)[0]) : null;

    const renderNode = (node: CanvasNode) => {
        const isSelected = selectedIds.has(node.id);
        const style = node.style || {};
        let content = null;
        const isEditing = editingNodeId === node.id;

        if (node.type === 'note-link') {
            const note = notes.find(n => n.id === node.referenceId);
            content = (
                <div className="w-full h-full p-4 flex flex-col overflow-hidden pointer-events-none">
                    <div className="flex items-center gap-2 mb-2 text-nexus-muted">
                        <FileText size={14} />
                        <span className="text-[10px] uppercase tracking-wider">Note</span>
                    </div>
                    <h3 className="text-sm font-medium text-nexus-text line-clamp-2">{note?.title || 'Unknown'}</h3>
                </div>
            );
        } else if (node.type === 'project-link') {
            const project = projects.find(p => p.id === node.referenceId);
            content = (
                <div className="w-full h-full p-4 flex flex-col overflow-hidden pointer-events-none">
                    <div className="flex items-center gap-2 mb-2 text-indigo-400">
                        <Folder size={14} />
                        <span className="text-[10px] uppercase tracking-wider">Project</span>
                    </div>
                    <h3 className="text-sm font-medium text-nexus-text line-clamp-2">{project?.title || 'Unknown'}</h3>
                </div>
            );
        } else if (node.type === 'text') {
             if (isEditing) {
                content = (
                    <textarea 
                       className="w-full h-full bg-transparent resize-none outline-none p-1 border border-blue-500/50 rounded overflow-hidden"
                       placeholder="Type..."
                       value={node.content}
                       autoFocus
                       onChange={(e) => { 
                           const newVal = e.target.value;
                           const changes: Partial<CanvasNode> = { content: newVal };
                           
                           // Auto-resize logic during typing
                           if (node.textAutoResize === 'auto') {
                               const dims = measureText(newVal, node.style || {});
                               changes.width = dims.width;
                               changes.height = dims.height;
                           }

                           const newNodes = nodes.map(n => n.id === node.id ? { ...n, ...changes } : n);
                           setNodes(newNodes);
                       }}
                       onMouseDown={(e) => e.stopPropagation()} 
                       style={{ 
                           color: style.textColor, 
                           fontSize: style.fontSize,
                           fontFamily: style.fontFamily,
                           fontWeight: style.fontWeight,
                           fontStyle: style.fontStyle,
                           textAlign: style.textAlign || 'left',
                       }}
                    />
                );
             } else {
                 content = (
                     <div 
                        className="w-full h-full p-1 whitespace-pre-wrap break-words pointer-events-none"
                        style={{ 
                            color: style.textColor, 
                            fontSize: style.fontSize,
                            fontFamily: style.fontFamily,
                            fontWeight: style.fontWeight,
                            fontStyle: style.fontStyle,
                            textAlign: style.textAlign || 'left'
                        }}
                     >
                        {node.content || 'Type something...'}
                     </div>
                 );
             }
        } else if (node.type === 'group' || node.type === 'frame') {
            const isStack = node.layoutMode && node.layoutMode !== 'none';
            content = (
                <div className="w-full h-full relative pointer-events-none">
                    <div className="absolute top-0 left-0 px-2 py-0.5 text-[8px] text-nexus-muted uppercase tracking-wider bg-nexus-bg/50 rounded-br border-r border-b border-nexus-border/30 backdrop-blur-sm">
                        {node.type === 'frame' ? 'Frame' : (isStack ? `Stack ${node.layoutMode === 'vertical' ? '↓' : '→'}` : 'Group')}
                    </div>
                </div>
            );
        } else if (node.type === 'path' && node.pathData) {
            content = (
                <svg width="100%" height="100%" viewBox={`0 0 ${node.width} ${node.height}`} className="overflow-visible">
                    <path 
                        d={node.pathData} 
                        fill={style.backgroundColor || 'transparent'} 
                        stroke={style.borderColor || '#e5e5e5'} 
                        strokeWidth={style.borderWidth || 2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            );
        }

        const borderRadius = style.borderRadius !== undefined ? style.borderRadius : (node.type === 'circle' ? 999 : 8);

        let borderStyle = '1px solid ' + (style.borderColor || '#2e2e2e');
        if (isSelected && !isEditing) borderStyle = '1px solid #3b82f6'; 
        if (node.type === 'text') borderStyle = 'none';

        if (node.type === 'group' || node.type === 'frame') {
            if (node.type === 'frame' && !isSelected && style.borderWidth === 0) {
                 borderStyle = 'none'; 
            } else {
                 borderStyle = isSelected ? '1px dashed #3b82f6' : '1px dashed #525252';
            }
        } else if (node.type === 'path') {
            borderStyle = isSelected ? '1px solid #3b82f6' : 'none';
        }

        return (
            <div
                key={node.id}
                onMouseDown={(e) => handleNodeMouseDown(e, node)}
                onClick={(e) => handleNodeClick(e, node)}
                onDoubleClick={(e) => handleNodeDoubleClick(e, node)}
                onContextMenu={(e) => handleContextMenu(e, node.id)}
                style={{
                    transform: `translate(${node.x}px, ${node.y}px)`,
                    width: node.width,
                    height: node.height,
                    backgroundColor: node.type === 'path' ? 'transparent' : (style.backgroundColor || (node.type === 'group' ? 'transparent' : '#1a1a1a')),
                    border: borderStyle,
                    borderRadius: borderRadius,
                    zIndex: node.zIndex || 1,
                    boxShadow: isSelected && !isEditing && node.type !== 'group' && node.type !== 'path' && node.type !== 'text' ? '0 0 0 2px #3b82f6' : 'none',
                    overflow: node.type === 'frame' ? 'hidden' : 'visible'
                }}
                className={`absolute group transition-all duration-150 ease-out ${tool === 'select' && !isEditing ? 'cursor-grab active:cursor-grabbing' : ''}`}
            >
                {content}
                {isSelected && !isEditing && selectedIds.size === 1 && (
                    <>
                        <div className={`absolute top-0 left-0 w-full h-full pointer-events-none border ${node.type === 'text' ? 'border-blue-500' : 'border-transparent'}`} />
                        {/* Only show resize handles for text if it is Fixed, or standard resizing for others */}
                        {((node.type === 'text' && node.textAutoResize === 'fixed') || node.type !== 'text') && ['nw', 'ne', 'sw', 'se'].map(h => (
                            <div
                                key={h}
                                onMouseDown={(e) => handleResizeStart(e, h as ResizeHandle)}
                                className={`absolute w-2.5 h-2.5 bg-white border border-blue-500 z-50 cursor-${h}-resize`}
                                style={{
                                    top: h.includes('n') ? -4 : 'auto',
                                    bottom: h.includes('s') ? -4 : 'auto',
                                    left: h.includes('w') ? -4 : 'auto',
                                    right: h.includes('e') ? -4 : 'auto',
                                }}
                            />
                        ))}
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="h-full w-full relative bg-[#0d0d0d] overflow-hidden select-none font-sans">
            
            {/* CANVAS AREA */}
            <div 
                ref={containerRef}
                className={`absolute inset-0 ${tool === 'pen' ? 'cursor-crosshair' : (tool === 'text' ? 'cursor-text' : 'cursor-default')}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onContextMenu={(e) => e.preventDefault()}
                id="canvas-bg"
            >
                <div 
                    className="w-full h-full origin-top-left will-change-transform"
                    style={{ 
                        transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                        backgroundImage: 'radial-gradient(#2e2e2e 1px, transparent 1px)',
                        backgroundSize: '20px 20px'
                    }}
                >
                    {currentPath.length > 0 && (
                        <svg className="absolute top-0 left-0 overflow-visible pointer-events-none z-50">
                             <polyline 
                                points={currentPath.map(p => `${p.x},${p.y}`).join(' ')} 
                                fill="none" 
                                stroke="#3b82f6" 
                                strokeWidth="2"
                                strokeDasharray="4"
                             />
                             {currentPath.map((p, i) => (
                                 <circle key={i} cx={p.x} cy={p.y} r={3} fill="#fff" stroke="#3b82f6" />
                             ))}
                        </svg>
                    )}

                    {selectionBox && (
                         <div 
                            className="absolute border border-blue-500 bg-blue-500/10 pointer-events-none z-50"
                            style={{
                                left: Math.min(selectionBox.startX, selectionBox.currentX),
                                top: Math.min(selectionBox.startY, selectionBox.currentY),
                                width: Math.abs(selectionBox.currentX - selectionBox.startX),
                                height: Math.abs(selectionBox.currentY - selectionBox.startY)
                            }}
                         />
                    )}

                    <svg className="absolute top-0 left-0 overflow-visible pointer-events-none z-0">
                        {connections.map(conn => {
                            const from = nodes.find(n => n.id === conn.from);
                            const to = nodes.find(n => n.id === conn.to);
                            if (!from || !to) return null;
                            const sx = from.x + from.width/2;
                            const sy = from.y + from.height/2;
                            const ex = to.x + to.width/2;
                            const ey = to.y + to.height/2;
                            return <line key={conn.id} x1={sx} y1={sy} x2={ex} y2={ey} stroke="#525252" strokeWidth="2" strokeDasharray="5,5" />;
                        })}
                    </svg>
                    <div className="relative z-10">{sortedNodes.map(renderNode)}</div>
                    
                    {/* Floating Text Toolbar (In World Space) */}
                    {primaryNode && primaryNode.type === 'text' && selectedIds.size === 1 && !isPanning && !isDragging && (
                        <div 
                            className="absolute z-[100] flex items-center gap-1 p-1 bg-nexus-bg border border-nexus-border rounded-lg shadow-xl animate-in fade-in zoom-in-95 duration-100 origin-bottom-center"
                            style={{ 
                                left: primaryNode.x + (primaryNode.width/2) - 100, // Centered roughly
                                top: primaryNode.y - 45,
                                transform: `scale(${1/scale})` // Counter-scale to keep UI constant size visually? Or simply rely on DOM layer above. 
                                // Actually, better to place it in the DOM above the transform layer if we want fixed size UI, 
                                // but for simplicity keeping it here so it follows the node position exactly.
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            {/* Font Weight */}
                            <button 
                                onClick={() => updateNodeProperty('style', primaryNode.style?.fontWeight === 700 ? 400 : 700, 'fontWeight')}
                                className={`p-1.5 rounded hover:bg-nexus-surface transition-colors ${primaryNode.style?.fontWeight === 700 ? 'text-white bg-nexus-surface' : 'text-nexus-muted'}`}
                            >
                                <Bold size={14} />
                            </button>
                            <button 
                                onClick={() => updateNodeProperty('style', primaryNode.style?.fontStyle === 'italic' ? 'normal' : 'italic', 'fontStyle')}
                                className={`p-1.5 rounded hover:bg-nexus-surface transition-colors ${primaryNode.style?.fontStyle === 'italic' ? 'text-white bg-nexus-surface' : 'text-nexus-muted'}`}
                            >
                                <Italic size={14} />
                            </button>
                            
                            <div className="w-[1px] h-3 bg-nexus-border mx-1"></div>

                            {/* Alignment */}
                            <button onClick={() => updateNodeProperty('style', 'left', 'textAlign')} className={`p-1.5 rounded hover:bg-nexus-surface ${primaryNode.style?.textAlign === 'left' ? 'text-white' : 'text-nexus-muted'}`}><AlignLeft size={14} /></button>
                            <button onClick={() => updateNodeProperty('style', 'center', 'textAlign')} className={`p-1.5 rounded hover:bg-nexus-surface ${primaryNode.style?.textAlign === 'center' ? 'text-white' : 'text-nexus-muted'}`}><AlignCenter size={14} /></button>
                            <button onClick={() => updateNodeProperty('style', 'right', 'textAlign')} className={`p-1.5 rounded hover:bg-nexus-surface ${primaryNode.style?.textAlign === 'right' ? 'text-white' : 'text-nexus-muted'}`}><AlignRight size={14} /></button>

                            <div className="w-[1px] h-3 bg-nexus-border mx-1"></div>

                            {/* Size stepper */}
                            <div className="flex items-center bg-nexus-surface rounded px-1">
                                <button onClick={() => updateNodeProperty('style', (primaryNode.style?.fontSize || 16) - 1, 'fontSize')} className="px-1 text-nexus-muted hover:text-white">-</button>
                                <span className="text-[10px] font-mono w-6 text-center">{primaryNode.style?.fontSize}</span>
                                <button onClick={() => updateNodeProperty('style', (primaryNode.style?.fontSize || 16) + 1, 'fontSize')} className="px-1 text-nexus-muted hover:text-white">+</button>
                            </div>

                            {/* Auto/Fixed Toggle */}
                            <button 
                                onClick={() => {
                                    const newMode = primaryNode.textAutoResize === 'auto' ? 'fixed' : 'auto';
                                    updateNodeProperty('textAutoResize', newMode);
                                    if (newMode === 'auto') {
                                        // Recalculate dimensions immediately
                                        const dims = measureText(primaryNode.content || '', primaryNode.style || {});
                                        updateNodeProperty('width', dims.width);
                                        updateNodeProperty('height', dims.height);
                                    }
                                }}
                                className="ml-1 p-1.5 rounded hover:bg-nexus-surface text-nexus-muted text-[10px] uppercase font-bold"
                                title={primaryNode.textAutoResize === 'auto' ? "Switch to Fixed Width" : "Switch to Auto Width"}
                            >
                                {primaryNode.textAutoResize === 'auto' ? 'AUTO' : 'FIXED'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* LEFT SIDEBAR: LAYERS */}
            {showLeftPanel && (
                <div className="absolute top-4 left-4 bottom-4 w-60 bg-nexus-surface/90 backdrop-blur-md border border-nexus-border rounded-lg shadow-2xl flex flex-col z-40 animate-in slide-in-from-left-4 duration-200">
                    <div className="h-10 border-b border-nexus-border flex items-center justify-between px-3">
                        <div className="flex items-center gap-2 text-xs font-medium text-nexus-muted uppercase tracking-wider">
                            <Layers size={14} /> Layers
                        </div>
                        <button onClick={() => setShowLeftPanel(false)} className="text-nexus-muted hover:text-white"><X size={14} /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
                        {[...nodes].reverse().map(node => (
                            <div 
                                key={node.id} 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const newSet = e.shiftKey ? new Set(selectedIds).add(node.id) : new Set([node.id]);
                                    setSelectedIds(newSet);
                                }}
                                onContextMenu={(e) => handleContextMenu(e, node.id)}
                                className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-pointer group ${selectedIds.has(node.id) ? 'bg-blue-900/30 text-blue-200' : 'text-nexus-text hover:bg-nexus-bg'}`}
                                style={{ marginLeft: node.parentId ? '12px' : '0' }}
                            >
                                {node.type === 'text' && <Type size={12} className="text-nexus-muted" />}
                                {node.type === 'rectangle' && <Square size={12} className="text-nexus-muted" />}
                                {node.type === 'frame' && <LayoutTemplate size={12} className="text-nexus-muted" />}
                                {node.type === 'group' && <Box size={12} className="text-nexus-muted" />}
                                {node.type === 'path' && <PenTool size={12} className="text-nexus-muted" />}
                                {node.type === 'circle' && <Circle size={12} className="text-nexus-muted" />}
                                {node.type === 'note-link' && <FileText size={12} className="text-nexus-muted" />}
                                {node.type === 'project-link' && <Folder size={12} className="text-nexus-muted" />}
                                <span className="truncate flex-1">
                                    {node.type === 'group' ? (node.layoutMode && node.layoutMode !== 'none' ? 'Stack' : 'Group') : node.type.charAt(0).toUpperCase() + node.type.slice(1)} {node.id.slice(-4)}
                                </span>
                            </div>
                        ))}
                         {nodes.length === 0 && <p className="text-[10px] text-nexus-muted italic text-center mt-4">No layers</p>}
                    </div>
                </div>
            )}

            {/* RIGHT SIDEBAR: PROPERTIES */}
            {showRightPanel && (
                <div className="absolute top-4 right-4 bottom-4 w-64 bg-nexus-surface/90 backdrop-blur-md border border-nexus-border rounded-lg shadow-2xl flex flex-col z-40 animate-in slide-in-from-right-4 duration-200">
                    <div className="h-10 border-b border-nexus-border flex items-center justify-between px-3">
                        <div className="flex items-center gap-2 text-xs font-medium text-nexus-muted uppercase tracking-wider">
                            <Monitor size={14} /> Design
                        </div>
                        <button onClick={() => setShowRightPanel(false)} className="text-nexus-muted hover:text-white"><X size={14} /></button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        {primaryNode || selectedIds.size > 0 ? (
                            <div className="space-y-6">
                                {/* Alignment */}
                                <div className="flex flex-col gap-2">
                                    <div className="flex justify-between p-1 bg-nexus-bg rounded border border-nexus-border">
                                        {/* Horizontal */}
                                        <div className="flex gap-1">
                                            <button onClick={() => handleAlign('left')} className="p-1.5 hover:bg-nexus-surface rounded text-nexus-muted hover:text-white" title="Align Left"><AlignLeft size={14}/></button>
                                            <button onClick={() => handleAlign('center')} className="p-1.5 hover:bg-nexus-surface rounded text-nexus-muted hover:text-white" title="Align Center"><AlignCenter size={14}/></button>
                                            <button onClick={() => handleAlign('right')} className="p-1.5 hover:bg-nexus-surface rounded text-nexus-muted hover:text-white" title="Align Right"><AlignRight size={14}/></button>
                                        </div>
                                        <div className="w-[1px] bg-nexus-border mx-1"></div>
                                        {/* Vertical */}
                                        <div className="flex gap-1">
                                             <button onClick={() => handleAlign('top')} className="p-1.5 hover:bg-nexus-surface rounded text-nexus-muted hover:text-white" title="Align Top"><AlignLeft size={14} className="rotate-90"/></button>
                                             <button onClick={() => handleAlign('middle')} className="p-1.5 hover:bg-nexus-surface rounded text-nexus-muted hover:text-white" title="Align Middle"><AlignCenter size={14} className="rotate-90"/></button>
                                             <button onClick={() => handleAlign('bottom')} className="p-1.5 hover:bg-nexus-surface rounded text-nexus-muted hover:text-white" title="Align Bottom"><AlignLeft size={14} className="-rotate-90"/></button>
                                        </div>
                                    </div>
                                </div>

                                {/* Transform */}
                                <div>
                                    <SectionHeader title="Transform" />
                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                        <PropInput label="X" value={Math.round(primaryNode?.x || 0)} onChange={(v) => updateNodeProperty('x', v)} />
                                        <PropInput label="Y" value={Math.round(primaryNode?.y || 0)} onChange={(v) => updateNodeProperty('y', v)} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                        <PropInput label="W" value={Math.round(primaryNode?.width || 0)} onChange={(v) => updateNodeProperty('width', v)} />
                                        <PropInput label="H" value={Math.round(primaryNode?.height || 0)} onChange={(v) => updateNodeProperty('height', v)} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                         <PropInput label="R" value={primaryNode?.style?.borderRadius ?? 0} onChange={(v) => updateNodeProperty('style', v, 'borderRadius')} />
                                         <div className="flex items-center gap-2 bg-nexus-bg border border-nexus-border rounded px-2 py-1 opacity-50 cursor-not-allowed">
                                            <span className="text-[10px] text-nexus-muted font-mono w-2">°</span>
                                            <input type="number" value={0} disabled className="bg-transparent text-xs text-nexus-text w-full outline-none font-mono text-right" />
                                         </div>
                                    </div>
                                </div>

                                {/* Typography (Conditional) */}
                                {(primaryNode?.type === 'text') && (
                                    <div>
                                        <SectionHeader title="Typography" />
                                         <div className="space-y-3">
                                            {/* Font Family */}
                                            <div className="space-y-1">
                                                <select 
                                                    value={primaryNode.style?.fontFamily || 'Inter'}
                                                    onChange={(e) => updateNodeProperty('style', e.target.value, 'fontFamily')}
                                                    className="w-full bg-nexus-surface border border-nexus-border rounded px-2 py-1.5 text-xs text-nexus-text focus:outline-none focus:border-nexus-muted cursor-pointer"
                                                >
                                                    {GOOGLE_FONTS.map(font => (
                                                        <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Weight & Size */}
                                            <div className="grid grid-cols-2 gap-2">
                                                <select 
                                                    value={primaryNode.style?.fontWeight || 400}
                                                    onChange={(e) => updateNodeProperty('style', parseInt(e.target.value), 'fontWeight')}
                                                    className="w-full bg-nexus-surface border border-nexus-border rounded px-2 py-1 text-xs text-nexus-text focus:outline-none focus:border-nexus-muted cursor-pointer"
                                                >
                                                    {FONT_WEIGHTS.map(w => (
                                                        <option key={w.value} value={w.value}>{w.label}</option>
                                                    ))}
                                                </select>
                                                <div className="flex items-center gap-2 bg-nexus-bg border border-nexus-border rounded px-2">
                                                    <span className="text-[10px] text-nexus-muted">Px</span>
                                                    <input 
                                                        type="number" 
                                                        value={primaryNode?.style?.fontSize || 14}
                                                        onChange={(e) => updateNodeProperty('style', parseInt(e.target.value), 'fontSize')}
                                                        className="bg-transparent text-xs text-nexus-text w-full outline-none font-mono text-right py-1"
                                                    />
                                                </div>
                                            </div>

                                            {/* Alignment & Style */}
                                            <div className="flex justify-between items-center bg-nexus-bg p-1 rounded border border-nexus-border">
                                                <button onClick={() => updateNodeProperty('style', 'left', 'textAlign')} className={`p-1.5 rounded ${primaryNode.style?.textAlign === 'left' ? 'bg-nexus-surface text-white' : 'text-nexus-muted hover:text-white'}`}><AlignLeft size={14} /></button>
                                                <button onClick={() => updateNodeProperty('style', 'center', 'textAlign')} className={`p-1.5 rounded ${primaryNode.style?.textAlign === 'center' ? 'bg-nexus-surface text-white' : 'text-nexus-muted hover:text-white'}`}><AlignCenter size={14} /></button>
                                                <button onClick={() => updateNodeProperty('style', 'right', 'textAlign')} className={`p-1.5 rounded ${primaryNode.style?.textAlign === 'right' ? 'bg-nexus-surface text-white' : 'text-nexus-muted hover:text-white'}`}><AlignRight size={14} /></button>
                                                <button onClick={() => updateNodeProperty('style', 'justify', 'textAlign')} className={`p-1.5 rounded ${primaryNode.style?.textAlign === 'justify' ? 'bg-nexus-surface text-white' : 'text-nexus-muted hover:text-white'}`}><AlignJustify size={14} /></button>
                                                <div className="w-[1px] h-4 bg-nexus-border mx-1"></div>
                                                <input 
                                                    type="color" 
                                                    value={primaryNode?.style?.textColor || '#e5e5e5'}
                                                    onChange={(e) => updateNodeProperty('style', e.target.value, 'textColor')}
                                                    className="w-6 h-6 bg-transparent cursor-pointer" 
                                                />
                                            </div>
                                            
                                            {/* Auto Resize Toggle in Panel */}
                                            <div className="flex items-center gap-2 mt-2">
                                                <button 
                                                    onClick={() => updateNodeProperty('textAutoResize', 'auto')}
                                                    className={`flex-1 text-xs border rounded py-1 ${primaryNode.textAutoResize === 'auto' ? 'bg-nexus-surface border-nexus-text text-white' : 'border-nexus-border text-nexus-muted'}`}
                                                >
                                                    Auto Width
                                                </button>
                                                <button 
                                                    onClick={() => updateNodeProperty('textAutoResize', 'fixed')}
                                                    className={`flex-1 text-xs border rounded py-1 ${primaryNode.textAutoResize === 'fixed' ? 'bg-nexus-surface border-nexus-text text-white' : 'border-nexus-border text-nexus-muted'}`}
                                                >
                                                    Fixed Width
                                                </button>
                                            </div>
                                         </div>
                                    </div>
                                )}

                                {/* Auto Layout / Stack */}
                                {(primaryNode?.type === 'group' || primaryNode?.type === 'frame') && (
                                    <div>
                                        <SectionHeader title="Auto Layout" />
                                        <div className="flex gap-2 mb-3 bg-nexus-bg p-1 rounded border border-nexus-border">
                                            <button 
                                                onClick={() => updateNodeProperty('layoutMode', 'none')}
                                                className={`flex-1 p-1 rounded flex justify-center transition-colors ${primaryNode.layoutMode === 'none' || !primaryNode.layoutMode ? 'bg-nexus-surface text-white border border-nexus-muted' : 'text-nexus-muted hover:text-white'}`}
                                                title="None"
                                            >
                                                <X size={14} />
                                            </button>
                                            <button 
                                                onClick={() => updateNodeProperty('layoutMode', 'vertical')}
                                                className={`flex-1 p-1 rounded flex justify-center transition-colors ${primaryNode.layoutMode === 'vertical' ? 'bg-nexus-surface text-white border border-nexus-muted' : 'text-nexus-muted hover:text-white'}`}
                                                title="Vertical"
                                            >
                                                <ArrowDown size={14} />
                                            </button>
                                            <button 
                                                onClick={() => updateNodeProperty('layoutMode', 'horizontal')}
                                                className={`flex-1 p-1 rounded flex justify-center transition-colors ${primaryNode.layoutMode === 'horizontal' ? 'bg-nexus-surface text-white border border-nexus-muted' : 'text-nexus-muted hover:text-white'}`}
                                                title="Horizontal"
                                            >
                                                <ArrowRight size={14} />
                                            </button>
                                        </div>
                                        
                                        {primaryNode.layoutMode && primaryNode.layoutMode !== 'none' && (
                                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                                {/* Hug / Fixed Switch */}
                                                <div className="bg-nexus-bg p-1 rounded border border-nexus-border flex">
                                                    <button 
                                                        onClick={() => updateNodeProperty('layoutSizing', 'hug')}
                                                        className={`flex-1 flex items-center justify-center gap-1.5 py-1 rounded text-[10px] font-medium transition-colors ${!primaryNode.layoutSizing || primaryNode.layoutSizing === 'hug' ? 'bg-nexus-surface text-white shadow-sm' : 'text-nexus-muted hover:text-white'}`}
                                                    >
                                                        <Scaling size={10} /> Hug
                                                    </button>
                                                    <button 
                                                        onClick={() => updateNodeProperty('layoutSizing', 'fixed')}
                                                        className={`flex-1 flex items-center justify-center gap-1.5 py-1 rounded text-[10px] font-medium transition-colors ${primaryNode.layoutSizing === 'fixed' ? 'bg-nexus-surface text-white shadow-sm' : 'text-nexus-muted hover:text-white'}`}
                                                    >
                                                        <Box size={10} /> Fixed
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                    <PropInput 
                                                        label="Gap" 
                                                        value={primaryNode.layoutGap || 0} 
                                                        onChange={(v) => updateNodeProperty('layoutGap', v)} 
                                                    />
                                                    <PropInput 
                                                        label="Pad" 
                                                        value={primaryNode.layoutPadding || 0} 
                                                        onChange={(v) => updateNodeProperty('layoutPadding', v)} 
                                                    />
                                                </div>

                                                {/* Wrap Option (Only available if Fixed) */}
                                                {primaryNode.layoutSizing === 'fixed' && (
                                                    <button 
                                                        onClick={() => updateNodeProperty('layoutWrap', !primaryNode.layoutWrap)}
                                                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded border text-[10px] transition-colors ${primaryNode.layoutWrap ? 'bg-indigo-900/20 border-indigo-500/50 text-indigo-300' : 'bg-nexus-bg border-nexus-border text-nexus-muted hover:text-white'}`}
                                                    >
                                                        <span className="flex items-center gap-2"><WrapText size={12} /> Wrap Content</span>
                                                        {primaryNode.layoutWrap && <CheckSquare size={12} />}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Appearance */}
                                <div className={primaryNode?.type === 'text' ? 'hidden' : 'block'}>
                                    <SectionHeader title="Appearance" />
                                    <div className="mb-3">
                                        <div className="flex justify-between items-center mb-1.5">
                                             <div className="text-[10px] text-nexus-muted">Fill</div>
                                             <div className="flex items-center gap-2">
                                                  <div className="relative w-4 h-4 rounded-full overflow-hidden border border-nexus-border shadow-sm">
                                                      <input 
                                                          type="color" 
                                                          value={primaryNode?.style?.backgroundColor !== 'transparent' ? primaryNode?.style?.backgroundColor : '#ffffff'} 
                                                          onChange={(e) => updateNodeProperty('style', e.target.value, 'backgroundColor')}
                                                          className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] cursor-pointer p-0 border-0"
                                                      />
                                                  </div>
                                                  <input 
                                                      type="text" 
                                                      value={primaryNode?.style?.backgroundColor || 'transparent'}
                                                      onChange={(e) => updateNodeProperty('style', e.target.value, 'backgroundColor')}
                                                      className="w-16 bg-nexus-bg border border-nexus-border rounded px-1 text-[10px] font-mono text-nexus-text outline-none text-center"
                                                  />
                                             </div>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {COLORS.map(c => (
                                                <button
                                                    key={c}
                                                    onClick={() => updateNodeProperty('style', c, 'backgroundColor')}
                                                    className={`w-5 h-5 rounded border hover:scale-110 transition-transform ${primaryNode?.style?.backgroundColor === c ? 'border-white ring-1 ring-white' : 'border-nexus-border/50'}`}
                                                    style={{ backgroundColor: c, backgroundImage: c === 'transparent' ? 'linear-gradient(45deg, #2e2e2e 25%, transparent 25%, transparent 75%, #2e2e2e 75%, #2e2e2e), linear-gradient(45deg, #2e2e2e 25%, transparent 25%, transparent 75%, #2e2e2e 75%, #2e2e2e)' : 'none', backgroundSize: c === 'transparent' ? '6px 6px' : 'auto' }}
                                                    title={c === 'transparent' ? 'Transparent' : c}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="mb-3">
                                        <div className="flex justify-between items-center mb-1.5">
                                             <div className="text-[10px] text-nexus-muted">Stroke</div>
                                             <div className="flex items-center gap-2">
                                                  <div className="relative w-4 h-4 rounded-full overflow-hidden border border-nexus-border shadow-sm">
                                                      <input 
                                                          type="color" 
                                                          value={primaryNode?.style?.borderColor !== 'transparent' ? primaryNode?.style?.borderColor : '#ffffff'} 
                                                          onChange={(e) => updateNodeProperty('style', e.target.value, 'borderColor')}
                                                          className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] cursor-pointer p-0 border-0"
                                                      />
                                                  </div>
                                                  <input 
                                                      type="text" 
                                                      value={primaryNode?.style?.borderColor || 'transparent'}
                                                      onChange={(e) => updateNodeProperty('style', e.target.value, 'borderColor')}
                                                      className="w-16 bg-nexus-bg border border-nexus-border rounded px-1 text-[10px] font-mono text-nexus-text outline-none text-center"
                                                  />
                                             </div>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {COLORS.map(c => (
                                                <button
                                                    key={c}
                                                    onClick={() => updateNodeProperty('style', c, 'borderColor')}
                                                    className={`w-5 h-5 rounded border hover:scale-110 transition-transform ${primaryNode?.style?.borderColor === c ? 'border-white ring-1 ring-white' : 'border-nexus-border/50'}`}
                                                    style={{ backgroundColor: c, backgroundImage: c === 'transparent' ? 'linear-gradient(45deg, #2e2e2e 25%, transparent 25%, transparent 75%, #2e2e2e 75%, #2e2e2e), linear-gradient(45deg, #2e2e2e 25%, transparent 25%, transparent 75%, #2e2e2e 75%, #2e2e2e)' : 'none', backgroundSize: c === 'transparent' ? '6px 6px' : 'auto' }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    {primaryNode?.type === 'path' && (
                                        <div className="mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-nexus-muted w-8">Width</span>
                                                <input 
                                                    type="number"
                                                    value={primaryNode.style?.borderWidth || 2}
                                                    onChange={(e) => updateNodeProperty('style', parseInt(e.target.value), 'borderWidth')}
                                                    className="bg-nexus-bg border border-nexus-border rounded px-2 py-1 text-xs w-full outline-none" 
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-nexus-muted opacity-50 space-y-2">
                                <Layout size={24} strokeWidth={1} />
                                <span className="text-xs">No selection</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* BOTTOM TOOLBAR (Lean) */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-nexus-surface/90 backdrop-blur-md border border-nexus-border rounded-full px-4 py-2 flex items-center gap-3 shadow-2xl z-50">
                <ToolButton icon={<MousePointer2 size={18} />} active={tool === 'select'} onClick={() => setTool('select')} />
                <div className="w-[1px] h-6 bg-nexus-border"></div>
                <ToolButton icon={<Square size={18} />} active={tool === 'rectangle'} onClick={() => setTool('rectangle')} />
                <ToolButton icon={<Circle size={18} />} active={tool === 'circle'} onClick={() => setTool('circle')} />
                <ToolButton icon={<PenTool size={18} />} active={tool === 'pen'} onClick={() => setTool('pen')} />
                <ToolButton icon={<Type size={18} />} active={tool === 'text'} onClick={() => setTool('text')} />
                <div className="w-[1px] h-6 bg-nexus-border"></div>
                <ToolButton icon={<FileText size={18} />} active={tool === 'note-link'} onClick={() => setTool('note-link')} />
                <ToolButton icon={<Folder size={18} />} active={tool === 'project-link'} onClick={() => setTool('project-link')} />
                <ToolButton icon={<Link2 size={18} />} active={tool === 'connect'} onClick={() => setTool('connect')} />
            </div>

            {/* TOGGLE BUTTONS (When panels hidden) */}
            {!showLeftPanel && (
                <button onClick={() => setShowLeftPanel(true)} className="absolute top-4 left-4 p-2 bg-nexus-surface border border-nexus-border rounded-lg text-nexus-muted hover:text-white z-30">
                    <Sidebar size={16} />
                </button>
            )}
            {!showRightPanel && (
                <button onClick={() => setShowRightPanel(true)} className="absolute top-4 right-4 p-2 bg-nexus-surface border border-nexus-border rounded-lg text-nexus-muted hover:text-white z-30">
                    <Sidebar size={16} className="rotate-180" />
                </button>
            )}

            {/* ZOOM Controls */}
            <div className="absolute top-4 right-16 flex bg-nexus-surface/80 border border-nexus-border rounded-lg overflow-hidden backdrop-blur-sm">
                <button onClick={() => setScale(s => Math.min(s + 0.1, 5))} className="p-1.5 hover:bg-nexus-bg text-nexus-muted hover:text-white"><ZoomIn size={14} /></button>
                <div className="w-[1px] bg-nexus-border"></div>
                <button onClick={() => setScale(s => Math.max(s - 0.1, 0.1))} className="p-1.5 hover:bg-nexus-bg text-nexus-muted hover:text-white"><ZoomOut size={14} /></button>
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <div 
                    className="fixed z-[100] bg-nexus-surface border border-nexus-border rounded-lg shadow-2xl w-48 py-1 animate-in fade-in zoom-in-95 duration-100"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                    <button onClick={() => handleCreateFrame(contextMenu.canvasX, contextMenu.canvasY)} className="w-full text-left px-3 py-2 text-xs text-nexus-text hover:bg-nexus-bg flex items-center gap-2">
                        <LayoutTemplate size={14} /> Add Frame
                    </button>
                    {selectedIds.size > 1 && (
                        <button onClick={handleWrapInStack} className="w-full text-left px-3 py-2 text-xs text-nexus-text hover:bg-nexus-bg flex items-center gap-2">
                            <Box size={14} /> Wrap in Stack
                        </button>
                    )}
                    {selectedIds.size <= 1 && (
                        <button onClick={() => handleCreateStack(contextMenu.canvasX, contextMenu.canvasY)} className="w-full text-left px-3 py-2 text-xs text-nexus-text hover:bg-nexus-bg flex items-center gap-2">
                            <Box size={14} /> Add Stack
                        </button>
                    )}
                    <div className="my-1 border-t border-nexus-border"></div>
                    <button onClick={handleDuplicate} className="w-full text-left px-3 py-2 text-xs text-nexus-text hover:bg-nexus-bg flex items-center gap-2">
                        <ClipboardCopy size={14} /> Duplicate
                    </button>
                    <button onClick={handleCopy} className="w-full text-left px-3 py-2 text-xs text-nexus-text hover:bg-nexus-bg flex items-center gap-2">
                        <Copy size={14} /> Copy
                    </button>
                    <div className="my-1 border-t border-nexus-border"></div>
                    <button onClick={handleBringToFront} className="w-full text-left px-3 py-2 text-xs text-nexus-text hover:bg-nexus-bg flex items-center gap-2">
                        <ChevronUp size={14} /> Bring to Front
                    </button>
                    <button onClick={handleSendToBack} className="w-full text-left px-3 py-2 text-xs text-nexus-text hover:bg-nexus-bg flex items-center gap-2">
                        <ChevronDown size={14} /> Send to Back
                    </button>
                    <div className="my-1 border-t border-nexus-border"></div>
                    {selectedIds.size > 1 ? (
                        <button onClick={handleGroup} className="w-full text-left px-3 py-2 text-xs text-nexus-text hover:bg-nexus-bg flex items-center gap-2">
                            <Group size={14} /> Group
                        </button>
                    ) : (
                         <button onClick={handleUngroup} disabled={!(primaryNode?.type === 'group' || primaryNode?.type === 'frame')} className="w-full text-left px-3 py-2 text-xs text-nexus-text hover:bg-nexus-bg flex items-center gap-2 disabled:opacity-50">
                            <Ungroup size={14} /> Ungroup
                        </button>
                    )}
                    <div className="my-1 border-t border-nexus-border"></div>
                    <button onClick={handleDelete} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-nexus-bg flex items-center gap-2">
                        <Trash2 size={14} /> Delete
                    </button>
                </div>
            )}

             {/* Link Modal */}
             {showLinkModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-nexus-surface border border-nexus-border rounded-lg shadow-xl w-80 max-h-[400px] flex flex-col animate-in fade-in zoom-in-95 duration-150">
                        <div className="p-3 border-b border-nexus-border flex justify-between items-center">
                            <h3 className="text-sm font-medium text-nexus-text">Select Resource</h3>
                            <button onClick={() => setShowLinkModal(null)}><X size={16} className="text-nexus-muted hover:text-white" /></button>
                        </div>
                        <div className="overflow-y-auto p-2 space-y-1">
                            {showLinkModal === 'note' ? (
                                notes.map(n => (
                                    <div key={n.id} onClick={() => { 
                                        addNode('note-link', lastMousePos.x, lastMousePos.y, undefined, n.id);
                                        setShowLinkModal(null);
                                    }} className="p-2 hover:bg-nexus-bg rounded cursor-pointer text-sm text-nexus-text truncate">
                                        {n.title}
                                    </div>
                                ))
                            ) : (
                                projects.map(p => (
                                    <div key={p.id} onClick={() => {
                                        addNode('project-link', lastMousePos.x, lastMousePos.y, undefined, p.id);
                                        setShowLinkModal(null);
                                    }} className="p-2 hover:bg-nexus-bg rounded cursor-pointer text-sm text-nexus-text truncate">
                                        {p.title}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Sub-components for cleaner code
const ToolButton: React.FC<{ icon: React.ReactNode, active: boolean, onClick: () => void }> = ({ icon, active, onClick }) => (
    <button
        onClick={onClick}
        className={`p-2.5 rounded-xl transition-all duration-200 ${
            active ? 'bg-nexus-text text-nexus-bg shadow-lg shadow-white/10' : 'text-nexus-muted hover:bg-nexus-bg hover:text-nexus-text'
        }`}
    >
        {icon}
    </button>
);

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
    <div className="text-[10px] font-bold text-nexus-muted uppercase tracking-wider mb-2 mt-4 pb-1 border-b border-nexus-border/50">
        {title}
    </div>
);

const PropInput: React.FC<{ label: string, value: number, onChange: (v: number) => void }> = ({ label, value, onChange }) => (
    <div className="flex items-center gap-2 bg-nexus-bg border border-nexus-border rounded px-2 py-1 group focus-within:border-nexus-muted transition-colors">
        <span className="text-[10px] text-nexus-muted font-mono w-2 group-hover:text-nexus-text">{label}</span>
        <input 
            type="number" 
            value={value} 
            onChange={(e) => onChange(parseInt(e.target.value))}
            className="bg-transparent text-xs text-nexus-text w-full outline-none font-mono text-right"
        />
    </div>
);

export default DesignCanvas;