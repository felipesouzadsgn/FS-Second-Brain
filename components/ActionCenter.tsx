import React, { useState, useEffect } from 'react';
import { Plus, MoreHorizontal, Calendar, Clock, X, Trash2, Flag, CheckCircle2, Check, ListTodo, AlertCircle, Zap } from 'lucide-react';
import { Task, Subtask } from '../types';

const initialTasks: Task[] = [
  { 
    id: '1', 
    title: 'Draft System Architecture', 
    status: 'done', 
    priority: 'high', 
    description: 'Define the core modules and data flow for Nexus OS.', 
    dueDate: '2023-10-25',
    storyPoints: 5,
    subtasks: [
        { id: '1-1', title: 'Define data models', completed: true },
        { id: '1-2', title: 'Component hierarchy', completed: true }
    ]
  },
  { id: '2', title: 'Implement Dark Mode', status: 'doing', priority: 'high', description: 'Ensure all components support the deep dark theme palette.', dueDate: '2023-10-26', storyPoints: 3 },
  { id: '3', title: 'Integrate Gemini API', status: 'todo', priority: 'medium', description: 'Connect to Google Gemini for smart summarization in the Library module.', dueDate: '2023-10-28', subtasks: [], storyPoints: 8 },
  { id: '4', title: 'Refactor Auth Module', status: 'backlog', priority: 'low', description: 'Clean up the authentication context and token storage.', dueDate: '2023-11-01', storyPoints: 2 },
  { id: '5', title: 'Design Marketing Assets', status: 'backlog', priority: 'low', description: 'Create social media banners and landing page mockups.', dueDate: '2023-11-05', storyPoints: 1 },
];

const ActionCenter: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [pendingDoneTaskId, setPendingDoneTaskId] = useState<string | null>(null);

  const columns: { id: Task['status']; label: string }[] = [
    { id: 'backlog', label: 'Backlog' },
    { id: 'todo', label: 'To Do' },
    { id: 'doing', label: 'In Progress' },
    { id: 'done', label: 'Done' },
  ];

  const handleSaveTask = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    setSelectedTask(null);
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setSelectedTask(null);
  };

  const handleAddNewTask = () => {
      const newTask: Task = {
          id: Date.now().toString(),
          title: 'New Task',
          status: 'backlog',
          priority: 'medium',
          description: '',
          dueDate: new Date().toISOString().split('T')[0],
          storyPoints: 1,
          subtasks: []
      };
      setTasks([...tasks, newTask]);
      setSelectedTask(newTask);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
      setDraggedTaskId(taskId);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragEnd = () => {
      setDraggedTaskId(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, status: Task['status']) => {
      e.preventDefault();
      const taskId = e.dataTransfer.getData('text/plain');
      
      if (taskId) {
          // If moving to 'done', trigger confirmation
          if (status === 'done' && tasks.find(t => t.id === taskId)?.status !== 'done') {
              setPendingDoneTaskId(taskId);
          } else {
              setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
          }
      }
      setDraggedTaskId(null);
  };

  const confirmMoveToDone = () => {
      if (pendingDoneTaskId) {
          setTasks(prev => prev.map(t => t.id === pendingDoneTaskId ? { ...t, status: 'done' } : t));
          setPendingDoneTaskId(null);
      }
  };

  const cancelMoveToDone = () => {
      setPendingDoneTaskId(null);
  };

  return (
    <div className="h-full flex flex-col p-6 space-y-6 overflow-hidden relative">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-light text-nexus-text">Action Center</h2>
          <div className="flex items-center gap-4 mt-1 text-sm text-nexus-muted">
            <span className="flex items-center gap-1"><Calendar size={14}/> Today, {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            <span className="w-1 h-1 bg-nexus-border rounded-full"></span>
            <span className="flex items-center gap-1"><Clock size={14}/> Q4 Sprint 2</span>
          </div>
        </div>
        <button 
            onClick={handleAddNewTask}
            className="flex items-center space-x-2 bg-white text-black px-4 py-2 rounded-sm text-sm font-medium hover:bg-gray-200 transition-colors"
        >
            <Plus size={16} />
            <span>New Task</span>
        </button>
      </div>

      <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
        {columns.map((col) => (
          <div key={col.id} className="min-w-[280px] w-full max-w-[350px] flex flex-col h-full">
            <div className="flex justify-between items-center mb-4 px-1">
              <h3 className="text-sm font-medium text-nexus-muted uppercase tracking-widest">{col.label}</h3>
              <span className="text-xs text-nexus-muted bg-nexus-surface px-2 py-0.5 rounded-full border border-nexus-border">
                {tasks.filter(t => t.status === col.id).length}
              </span>
            </div>
            
            <div 
                className={`flex-1 bg-nexus-surface/30 rounded-lg p-2 space-y-3 overflow-y-auto border border-nexus-border/50 transition-colors ${draggedTaskId ? 'border-dashed border-nexus-muted/40 bg-nexus-surface/50' : ''}`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
            >
              {tasks.filter(t => t.status === col.id).map(task => (
                <div 
                    key={task.id} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => setSelectedTask(task)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedTask(task);
                        }
                    }}
                    role="button"
                    tabIndex={0}
                    className={`bg-nexus-surface p-4 rounded border border-nexus-border hover:border-nexus-muted/50 transition-all cursor-grab active:cursor-grabbing group shadow-sm hover:shadow-md focus:outline-none focus:ring-1 focus:ring-nexus-muted ${draggedTaskId === task.id ? 'opacity-50 ring-1 ring-nexus-muted ring-dashed' : ''}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    {/* Priority Indicator */}
                    <div className="flex items-center gap-2" title={`Priority: ${task.priority}`}>
                         <span className={`w-2 h-2 rounded-full ring-2 ring-offset-1 ring-offset-nexus-surface ${
                          task.priority === 'high' ? 'bg-red-500 ring-red-500/20' : 
                          task.priority === 'medium' ? 'bg-yellow-500 ring-yellow-500/20' : 
                          'bg-blue-500 ring-blue-500/20'
                        }`}></span>
                        <span className="text-[10px] text-nexus-muted uppercase tracking-wide opacity-0 group-hover:opacity-100 transition-opacity">
                            {task.priority}
                        </span>
                    </div>
                    
                    <button className="text-nexus-muted opacity-0 group-hover:opacity-100 hover:text-white transition-opacity">
                        <MoreHorizontal size={14} />
                    </button>
                  </div>
                  <p className="text-sm text-nexus-text font-medium leading-snug">{task.title}</p>
                  
                  {/* Subtasks Visualization on Card */}
                  {task.subtasks && task.subtasks.length > 0 && (
                      <div className="mt-3 pl-2 border-l border-nexus-border/50 space-y-1">
                          {task.subtasks.map(st => (
                              <div key={st.id} className="flex items-center gap-2">
                                  <div className={`w-3 h-3 rounded-sm border flex items-center justify-center ${st.completed ? 'bg-nexus-muted border-nexus-muted' : 'border-nexus-muted'}`}>
                                      {st.completed && <Check size={8} className="text-nexus-bg" strokeWidth={3} />}
                                  </div>
                                  <span className={`text-xs truncate max-w-[200px] ${st.completed ? 'text-nexus-muted line-through' : 'text-nexus-text/80'}`}>{st.title}</span>
                              </div>
                          ))}
                      </div>
                  )}

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] border border-nexus-border text-nexus-muted px-1.5 py-0.5 rounded">DEV-0{task.id}</span>
                        {task.storyPoints !== undefined && (
                            <span className="text-[10px] border border-nexus-border text-nexus-muted px-1.5 py-0.5 rounded flex items-center gap-1 bg-nexus-surface/50" title="Story Points / Effort">
                                <Zap size={10} className="text-yellow-500/80" /> {task.storyPoints}
                            </span>
                        )}
                    </div>
                    {task.dueDate && (
                        <span className="text-[10px] text-nexus-muted flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric'})}
                        </span>
                    )}
                  </div>
                </div>
              ))}
              
              <button 
                onClick={handleAddNewTask}
                className="w-full py-2 flex items-center justify-center text-nexus-muted hover:text-nexus-text hover:bg-nexus-surface rounded transition-colors text-sm border border-transparent hover:border-nexus-border border-dashed"
              >
                <Plus size={14} className="mr-1"/> Add Item
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedTask && (
        <TaskModal 
            task={selectedTask} 
            onClose={() => setSelectedTask(null)} 
            onSave={handleSaveTask}
            onDelete={handleDeleteTask}
        />
      )}

      {/* Confirmation Modal for Done Column */}
      {pendingDoneTaskId && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="w-full max-w-sm bg-nexus-surface border border-nexus-border rounded-lg shadow-2xl p-6">
                  <div className="flex items-center gap-3 mb-4 text-nexus-text">
                      <AlertCircle className="text-nexus-accent" size={24} />
                      <h3 className="text-lg font-medium">Complete Task?</h3>
                  </div>
                  <p className="text-nexus-muted text-sm mb-6 leading-relaxed">
                      Are you sure you want to move this task to <span className="text-white font-medium">Done</span>? 
                      This indicates the work is fully completed.
                  </p>
                  <div className="flex gap-3 justify-end">
                      <button 
                          onClick={cancelMoveToDone}
                          className="px-4 py-2 text-sm font-medium text-nexus-muted hover:text-white transition-colors"
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={confirmMoveToDone}
                          className="px-4 py-2 text-sm font-medium bg-nexus-text text-nexus-bg rounded hover:bg-white transition-colors"
                      >
                          Confirm Completion
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

interface TaskModalProps {
    task: Task;
    onClose: () => void;
    onSave: (task: Task) => void;
    onDelete: (id: string) => void;
}

const TaskModal: React.FC<TaskModalProps> = ({ task, onClose, onSave, onDelete }) => {
    const [editedTask, setEditedTask] = useState<Task>({ ...task });
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

    // Close on escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const handleChange = (field: keyof Task, value: any) => {
        setEditedTask(prev => ({ ...prev, [field]: value }));
    };

    const handleAddSubtask = () => {
        if (!newSubtaskTitle.trim()) return;
        const newSubtask: Subtask = {
            id: Date.now().toString(),
            title: newSubtaskTitle,
            completed: false
        };
        setEditedTask(prev => ({
            ...prev,
            subtasks: [...(prev.subtasks || []), newSubtask]
        }));
        setNewSubtaskTitle('');
    };

    const handleToggleSubtask = (subtaskId: string) => {
        setEditedTask(prev => ({
            ...prev,
            subtasks: prev.subtasks?.map(st => 
                st.id === subtaskId ? { ...st, completed: !st.completed } : st
            )
        }));
    };

    const handleDeleteSubtask = (subtaskId: string) => {
        setEditedTask(prev => ({
            ...prev,
            subtasks: prev.subtasks?.filter(st => st.id !== subtaskId)
        }));
    };

    const handleSubtaskTitleChange = (subtaskId: string, newTitle: string) => {
         setEditedTask(prev => ({
            ...prev,
            subtasks: prev.subtasks?.map(st => 
                st.id === subtaskId ? { ...st, title: newTitle } : st
            )
        }));
    };

    const completedSubtasks = editedTask.subtasks?.filter(st => st.completed).length || 0;
    const totalSubtasks = editedTask.subtasks?.length || 0;
    const progress = totalSubtasks === 0 ? 0 : (completedSubtasks / totalSubtasks) * 100;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-[#1a1a1a] border border-nexus-border rounded-lg shadow-2xl flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="flex justify-between items-start p-6 border-b border-nexus-border/50">
                    <div className="flex-1 mr-4">
                        <input
                            type="text"
                            value={editedTask.title}
                            onChange={(e) => handleChange('title', e.target.value)}
                            className="w-full bg-transparent text-xl font-medium text-nexus-text focus:outline-none placeholder-nexus-muted/50"
                            placeholder="Task Title"
                        />
                        <div className="flex items-center gap-2 mt-2 text-xs text-nexus-muted font-mono">
                            <span>ID: DEV-0{editedTask.id}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-nexus-muted hover:text-white transition-colors p-1 hover:bg-nexus-border/50 rounded">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 p-6 overflow-y-auto space-y-8 custom-scrollbar">
                    
                    {/* Properties Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-nexus-muted uppercase tracking-wider flex items-center gap-2">
                                <CheckCircle2 size={12} /> Status
                            </label>
                            <select 
                                value={editedTask.status}
                                onChange={(e) => handleChange('status', e.target.value)}
                                className="w-full bg-nexus-surface border border-nexus-border rounded px-3 py-2 text-sm text-nexus-text focus:border-nexus-muted focus:outline-none appearance-none cursor-pointer hover:border-nexus-muted/50 transition-colors"
                            >
                                <option value="backlog">Backlog</option>
                                <option value="todo">To Do</option>
                                <option value="doing">In Progress</option>
                                <option value="done">Done</option>
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-nexus-muted uppercase tracking-wider flex items-center gap-2">
                                <Flag size={12} /> Priority
                            </label>
                            <select 
                                value={editedTask.priority}
                                onChange={(e) => handleChange('priority', e.target.value)}
                                className="w-full bg-nexus-surface border border-nexus-border rounded px-3 py-2 text-sm text-nexus-text focus:border-nexus-muted focus:outline-none appearance-none cursor-pointer hover:border-nexus-muted/50 transition-colors"
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-nexus-muted uppercase tracking-wider flex items-center gap-2">
                                <Calendar size={12} /> Due Date
                            </label>
                            <input 
                                type="date"
                                value={editedTask.dueDate || ''}
                                onChange={(e) => handleChange('dueDate', e.target.value)}
                                className="w-full bg-nexus-surface border border-nexus-border rounded px-3 py-2 text-sm text-nexus-text focus:border-nexus-muted focus:outline-none appearance-none cursor-pointer hover:border-nexus-muted/50 transition-colors [&::-webkit-calendar-picker-indicator]:invert"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-nexus-muted uppercase tracking-wider flex items-center gap-2">
                                <Zap size={12} /> Points
                            </label>
                            <input 
                                type="number"
                                min="0"
                                placeholder="Effort / Story Points"
                                value={editedTask.storyPoints ?? ''}
                                onChange={(e) => handleChange('storyPoints', e.target.value === '' ? undefined : parseInt(e.target.value))}
                                className="w-full bg-nexus-surface border border-nexus-border rounded px-3 py-2 text-sm text-nexus-text focus:border-nexus-muted focus:outline-none transition-colors"
                            />
                        </div>
                    </div>

                    {/* Subtasks Section */}
                    <div className="space-y-2">
                         <div className="flex justify-between items-end">
                            <label className="text-xs font-medium text-nexus-muted uppercase tracking-wider flex items-center gap-2">
                                <ListTodo size={12} /> Subtasks
                            </label>
                            {totalSubtasks > 0 && (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-nexus-muted font-mono">{Math.round(progress)}%</span>
                                    <span className="text-xs text-nexus-muted font-mono opacity-50">|</span>
                                    <span className="text-xs text-nexus-muted font-mono">{completedSubtasks}/{totalSubtasks}</span>
                                </div>
                            )}
                         </div>
                         
                         <div className="bg-nexus-surface/50 border border-nexus-border rounded-lg p-4 space-y-3">
                            {/* Progress Bar */}
                            {totalSubtasks > 0 && (
                                <div className="w-full bg-nexus-bg h-1.5 rounded-full overflow-hidden mb-4 border border-nexus-border/30">
                                    <div 
                                        className={`h-full transition-all duration-300 ease-out ${progress === 100 ? 'bg-green-500' : 'bg-nexus-text'}`}
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                            )}

                            {/* Subtask List */}
                            <div className="space-y-2">
                                {editedTask.subtasks?.map(st => (
                                    <div key={st.id} className="flex items-center gap-3 group">
                                        <button 
                                            onClick={() => handleToggleSubtask(st.id)}
                                            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${st.completed ? 'bg-nexus-text border-nexus-text' : 'border-nexus-muted hover:border-nexus-text'}`}
                                        >
                                            {st.completed && <Check size={10} className="text-nexus-bg" strokeWidth={3} />}
                                        </button>
                                        <input 
                                            value={st.title}
                                            onChange={(e) => handleSubtaskTitleChange(st.id, e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.currentTarget.blur();
                                                }
                                            }}
                                            className={`bg-transparent border border-transparent hover:border-nexus-border/50 focus:border-nexus-muted rounded px-2 py-0.5 -ml-2 text-sm focus:outline-none flex-1 transition-all ${st.completed ? 'text-nexus-muted line-through' : 'text-nexus-text'}`}
                                        />
                                        <button 
                                            onClick={() => handleDeleteSubtask(st.id)}
                                            className="opacity-0 group-hover:opacity-100 text-nexus-muted hover:text-red-400 transition-opacity p-1"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Add Subtask Input */}
                            <div className="flex items-center gap-3 pt-3 border-t border-nexus-border/30 mt-2">
                                <Plus size={16} className="text-nexus-muted" />
                                <input 
                                    value={newSubtaskTitle}
                                    onChange={e => setNewSubtaskTitle(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddSubtask()}
                                    placeholder="Add a new subtask..."
                                    className="bg-transparent border-none text-sm focus:outline-none flex-1 placeholder-nexus-muted/50 text-nexus-text"
                                />
                                <button 
                                    onClick={handleAddSubtask}
                                    disabled={!newSubtaskTitle.trim()}
                                    className={`text-xs font-medium px-3 py-1.5 rounded transition-all ${
                                        newSubtaskTitle.trim() 
                                            ? 'bg-nexus-text text-nexus-bg hover:bg-white' 
                                            : 'bg-nexus-bg text-nexus-muted border border-nexus-border opacity-50 cursor-not-allowed'
                                    }`}
                                >
                                    Add
                                </button>
                            </div>
                         </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-nexus-muted uppercase tracking-wider flex items-center gap-2">
                            Description
                        </label>
                        <textarea
                            value={editedTask.description || ''}
                            onChange={(e) => handleChange('description', e.target.value)}
                            placeholder="Add a more detailed description..."
                            className="w-full h-40 bg-nexus-surface/50 border border-nexus-border rounded-lg p-4 text-sm text-nexus-text focus:border-nexus-muted focus:outline-none resize-none placeholder-nexus-muted/30 font-sans leading-relaxed"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-nexus-border/50 flex justify-between items-center bg-[#151515] rounded-b-lg">
                    <button 
                        onClick={() => onDelete(editedTask.id)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-900/10 rounded transition-colors"
                    >
                        <Trash2 size={16} />
                        <span>Delete</span>
                    </button>
                    <div className="flex gap-3">
                        <button 
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-nexus-muted hover:text-nexus-text transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={() => onSave(editedTask)}
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

export default ActionCenter;