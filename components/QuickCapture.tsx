import React, { useState, useEffect, useRef } from 'react';
import { Send, X } from 'lucide-react';

interface QuickCaptureProps {
    isOpen: boolean;
    onClose: () => void;
}

const QuickCapture: React.FC<QuickCaptureProps> = ({ isOpen, onClose }) => {
    const [text, setText] = useState('');
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-xl bg-nexus-surface border border-nexus-border rounded-lg shadow-2xl p-4 transform transition-all animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-medium text-nexus-muted uppercase tracking-wider">Quick Capture</h3>
                    <div className="flex items-center gap-2">
                         <span className="text-[10px] bg-nexus-bg border border-nexus-border px-1.5 rounded text-nexus-muted">Esc</span>
                        <button onClick={onClose} className="text-nexus-muted hover:text-white">
                            <X size={16} />
                        </button>
                    </div>
                </div>
                <textarea
                    ref={inputRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Capture an idea, task, or note..."
                    className="w-full h-32 bg-transparent text-lg text-nexus-text placeholder-nexus-border resize-none focus:outline-none font-mono"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                            // Submit logic here
                            setText('');
                            onClose();
                        }
                    }}
                />
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-nexus-border">
                    <div className="flex gap-2">
                         <span className="text-xs text-nexus-muted hover:text-nexus-text cursor-pointer transition-colors">#idea</span>
                         <span className="text-xs text-nexus-muted hover:text-nexus-text cursor-pointer transition-colors">#todo</span>
                    </div>
                    <button className="bg-white text-black px-3 py-1.5 rounded text-sm font-medium flex items-center gap-2 hover:bg-gray-200">
                        <span>Save</span>
                        <Send size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QuickCapture;