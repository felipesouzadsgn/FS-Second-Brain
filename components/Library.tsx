import React from 'react';
import { BookOpen, Star, MoreVertical, Sparkles } from 'lucide-react';
import { Book } from '../types';

const books: Book[] = [
  { id: '1', title: 'Building a Second Brain', author: 'Tiago Forte', progress: 85, status: 'reading' },
  { id: '2', title: 'Atomic Habits', author: 'James Clear', progress: 100, status: 'finished' },
  { id: '3', title: 'Deep Work', author: 'Cal Newport', progress: 45, status: 'reading' },
  { id: '4', title: 'The Psychology of Money', author: 'Morgan Housel', progress: 0, status: 'wishlist' },
];

const Library: React.FC = () => {
  return (
    <div className="h-full p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-y-auto">
        
        {/* Bookshelf */}
        <div className="space-y-6">
            <header className="mb-6">
                <h2 className="text-2xl font-light text-nexus-text">Library</h2>
                <p className="text-sm text-nexus-muted">Active Reading & References</p>
            </header>

            <div className="space-y-4">
                {books.map(book => (
                    <div key={book.id} className="bg-nexus-surface border border-nexus-border p-4 rounded-lg flex gap-4 group hover:border-nexus-muted transition-all">
                        <div className="w-16 h-24 bg-nexus-bg border border-nexus-border flex items-center justify-center text-nexus-muted shrink-0">
                            <BookOpen size={20} />
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                            <div>
                                <h3 className="text-nexus-text font-medium leading-tight">{book.title}</h3>
                                <p className="text-sm text-nexus-muted mt-1">{book.author}</p>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-nexus-muted">
                                    <span>{book.status === 'reading' ? 'Reading' : book.status}</span>
                                    <span>{book.progress}%</span>
                                </div>
                                <div className="h-1 w-full bg-nexus-bg rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-nexus-text rounded-full" 
                                        style={{ width: `${book.progress}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Smart Notes / Editor */}
        <div className="flex flex-col h-full bg-nexus-surface border border-nexus-border rounded-lg overflow-hidden">
            <div className="p-4 border-b border-nexus-border flex justify-between items-center bg-nexus-bg/50">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-nexus-muted px-2 py-1 border border-nexus-border rounded">SMART NOTE</span>
                    <span className="text-sm text-nexus-text">Summary: Deep Work</span>
                </div>
                <div className="flex gap-2 text-nexus-muted">
                    <Star size={16} className="hover:text-yellow-500 cursor-pointer" />
                    <MoreVertical size={16} className="cursor-pointer" />
                </div>
            </div>
            
            <div className="flex-1 p-6 font-mono text-sm leading-relaxed text-nexus-text/80 bg-[#151515] overflow-y-auto focus-within:text-nexus-text transition-colors">
                <p className="mb-4 text-nexus-muted select-none"># Key Concepts</p>
                <p className="mb-4">
                    Deep Work is the ability to focus without distraction on a cognitively demanding task. It's a skill that allows you to quickly master complicated information and produce better results in less time.
                </p>
                <p className="mb-4">
                    <span className="text-blue-400">[[Shallow Work]]</span>: Non-cognitively demanding, logistical-style tasks, often performed while distracted. These efforts tend not to create much new value in the world and are easy to replicate.
                </p>
                <p className="mb-4 text-nexus-muted select-none"># Actionable Items</p>
                <ul className="list-disc pl-4 space-y-2">
                    <li>Schedule deep work blocks (90 mins)</li>
                    <li>Quit social media (or minimize)</li>
                    <li>Drain the shallows (batch emails)</li>
                </ul>
                
                <div className="mt-8 p-4 border border-dashed border-nexus-border rounded opacity-50 hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center gap-2 text-nexus-muted">
                    {/* Fixed: Sparkles was missing from import */}
                    <Sparkles size={14} />
                    <span>Generate AI Summary</span>
                </div>
            </div>
        </div>
    </div>
  );
};

export default Library;