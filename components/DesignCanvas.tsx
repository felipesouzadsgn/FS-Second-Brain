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

    const measureText = (text: string, style: any, width?: number) => {
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
                current