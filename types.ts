

export type View = 'dashboard' | 'action' | 'health' | 'finance' | 'library' | 'spirit' | 'projects' | 'design';

export interface NoteFolder {
  id: string;
  name: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  folderId?: string; // Reference to a NoteFolder
  connections?: string[];
  linkedProjectIds?: string[]; // IDs of projects this note is related to
  updatedAt: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  status: 'backlog' | 'todo' | 'doing' | 'done';
  priority: 'low' | 'medium' | 'high';
  description?: string;
  dueDate?: string;
  subtasks?: Subtask[];
  storyPoints?: number;
}

export interface Habit {
  id: string;
  name: string;
  streak: number;
  completedToday: boolean;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  type: 'income' | 'expense';
}

export interface Book {
  id: string;
  title: string;
  author: string;
  progress: number; // 0-100
  status: 'reading' | 'finished' | 'wishlist';
}

export interface ProjectResource {
  id: string;
  title: string;
  type: 'note' | 'file' | 'link' | 'checklist';
  url?: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  category: 'dev' | 'design' | 'content' | 'life';
  status: 'active' | 'on-hold' | 'completed';
  progress: number;
  dueDate: string;
  tags: string[];
  resources?: ProjectResource[];
}

// Canvas Types
export type CanvasNodeType = 'rectangle' | 'circle' | 'text' | 'note-link' | 'project-link' | 'image' | 'group' | 'frame' | 'path';

export interface CanvasNodeStyle {
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    borderRadius?: number;
    // Typography
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: number;
    fontStyle?: 'normal' | 'italic';
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    textColor?: string;
}

export interface CanvasNode {
  id: string;
  type: CanvasNodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string; // For text or image URL
  pathData?: string; // SVG Path Data for Pen Tool
  referenceId?: string; // For linked Notes or Projects
  
  // Hierarchy
  parentId?: string; // If this node is inside a group/frame
  groupId?: string; // Legacy ID (kept for compatibility, but parentId is preferred for Stacks)

  // Auto Layout Properties
  layoutMode?: 'none' | 'horizontal' | 'vertical';
  layoutSizing?: 'hug' | 'fixed'; // New: Hug contents or Fixed size
  layoutWrap?: boolean;           // New: Wrap contents to next line
  layoutGap?: number;
  layoutPadding?: number;
  layoutAlign?: 'start' | 'center' | 'end';

  // Text Specific
  textAutoResize?: 'auto' | 'fixed'; // 'auto' grows width, 'fixed' wraps text

  style?: CanvasNodeStyle;
  zIndex?: number; // Visual layering
}

export interface CanvasConnection {
  id: string;
  from: string; // Node ID
  to: string;   // Node ID
}