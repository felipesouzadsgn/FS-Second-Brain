import React, { useState, useEffect } from 'react';
import { PanelLeft, Monitor, Target, Battery, Maximize2 } from 'lucide-react';
import { View } from '../types';

interface TopBarProps {
    currentView: View;
    toggleZen: () => void;
    isZenMode: boolean;
    isFocusMode: boolean;
    toggleFocus: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ currentView, toggleZen, isZenMode, isFocusMode, toggleFocus }) => {
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        // Fixed: NodeJS namespace is not available in browser environment, using any or ReturnType<typeof setInterval>
        let interval: any;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
        }
        return () => clearInterval(interval);
    }, [isActive, timeLeft]);

    // Link Focus Mode prop to timer active state for UX consistency
    useEffect(() => {
        if (isFocusMode && !isActive) setIsActive(true);
        if (!isFocusMode && isActive) setIsActive(false);
    }, [isFocusMode]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className={`h-14 border-b flex items-center justify-between px-6 transition-all duration-300 ${isZenMode ? 'px-8 bg-nexus-bg border-transparent' : 'bg-nexus-bg border-nexus-border'}`}>
            <div className="flex items-center gap-4">
                <button 
                    onClick={toggleZen} 
                    className={`transition-colors ${isZenMode ? 'text-nexus-muted/50 hover:text-nexus-muted' : 'text-nexus-muted hover:text-nexus-text'}`}
                    title={isZenMode ? "Exit Zen Mode" : "Enter Zen Mode"}
                >
                    <PanelLeft size={20} />
                </button>
                
                {!isZenMode && (
                    <>
                        <div className="h-4 w-[1px] bg-nexus-border mx-2"></div>
                        <span className="text-sm font-medium text-nexus-muted uppercase tracking-wider">{currentView}</span>
                    </>
                )}
            </div>

            {/* Pomodoro & Focus Controls */}
            <div className={`flex items-center gap-6 transition-all duration-500 ${isFocusMode ? 'bg-red-500/10 px-4 py-1 rounded border border-red-500/30' : ''}`}>
                <div className="flex items-center gap-2 font-mono text-nexus-text">
                    <Target size={16} className={isFocusMode ? 'text-red-500 animate-pulse' : 'text-nexus-muted'} />
                    <span>{formatTime(timeLeft)}</span>
                </div>
                
                <button 
                    onClick={toggleFocus}
                    className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded transition-all ${
                        isFocusMode 
                        ? 'bg-red-500 text-white' 
                        : 'bg-nexus-surface text-nexus-muted border border-nexus-border hover:border-nexus-text hover:text-nexus-text'
                    }`}
                >
                    <Monitor size={14} />
                    <span>{isFocusMode ? 'STOP FOCUS' : 'FOCUS MODE'}</span>
                </button>
            </div>

            <div className="flex items-center gap-4 text-nexus-muted">
                {!isZenMode && (
                    <div className="flex items-center gap-1 text-xs font-mono">
                        <Battery size={16} />
                        <span>100%</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TopBar;