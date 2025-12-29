import React, { useState } from 'react';
import { Flame, Droplets, Book, Dumbbell, Play, Pause, RotateCcw } from 'lucide-react';
import { Habit } from '../types';

const HealthHub: React.FC = () => {
  const [habits, setHabits] = useState<Habit[]>([
    { id: '1', name: 'Deep Work (4h)', streak: 12, completedToday: true },
    { id: '2', name: 'No Sugar', streak: 5, completedToday: false },
    { id: '3', name: 'Reading (30m)', streak: 24, completedToday: true },
    { id: '4', name: 'Meditation', streak: 8, completedToday: false },
  ]);

  const [meditationTime, setMeditationTime] = useState(600); // 10 mins
  const [isMeditating, setIsMeditating] = useState(false);

  const toggleHabit = (id: string) => {
    setHabits(habits.map(h => h.id === id ? { ...h, completedToday: !h.completedToday } : h));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full p-8 overflow-y-auto space-y-8">
      <header className="mb-8">
        <h2 className="text-2xl font-light text-nexus-text">Health & Performance</h2>
        <p className="text-sm text-nexus-muted">Optimal State Management</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Habit Tracker */}
        <div className="col-span-1 bg-nexus-surface border border-nexus-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-medium text-nexus-muted uppercase tracking-wider">Habit Protocol</h3>
            <Flame size={16} className="text-orange-500" />
          </div>
          <div className="space-y-4">
            {habits.map(habit => (
              <div key={habit.id} className="flex items-center justify-between group cursor-pointer" onClick={() => toggleHabit(habit.id)}>
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                    habit.completedToday 
                      ? 'bg-nexus-text border-nexus-text' 
                      : 'border-nexus-muted group-hover:border-nexus-text'
                  }`}>
                    {habit.completedToday && <span className="text-nexus-bg text-xs font-bold">✓</span>}
                  </div>
                  <span className={`${habit.completedToday ? 'text-nexus-muted line-through' : 'text-nexus-text'}`}>
                    {habit.name}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-nexus-muted">
                  <Flame size={12} className={habit.streak > 10 ? 'text-orange-500' : 'text-nexus-muted'} />
                  <span>{habit.streak}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Meditation */}
        <div className="col-span-1 bg-nexus-surface border border-nexus-border rounded-lg p-6 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-nexus-bg/50 pointer-events-none"></div>
            <h3 className="text-sm font-medium text-nexus-muted uppercase tracking-wider absolute top-6 left-6">Mindfulness</h3>
            
            <div className="text-5xl font-mono text-nexus-text font-light mb-8 mt-4 tracking-tighter">
                {formatTime(meditationTime)}
            </div>
            
            <div className="flex gap-4 z-10">
                <button 
                    onClick={() => setIsMeditating(!isMeditating)}
                    className="w-12 h-12 rounded-full border border-nexus-border hover:border-nexus-text flex items-center justify-center transition-all bg-nexus-bg hover:bg-nexus-surface"
                >
                    {isMeditating ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
                </button>
                <button 
                    onClick={() => { setIsMeditating(false); setMeditationTime(600); }}
                    className="w-12 h-12 rounded-full border border-nexus-border hover:border-nexus-text flex items-center justify-center transition-all bg-nexus-bg hover:bg-nexus-surface"
                >
                    <RotateCcw size={20} />
                </button>
            </div>
            <p className="text-xs text-nexus-muted mt-6">Ambience: Rain (Low)</p>
        </div>

        {/* Workout Log */}
        <div className="col-span-1 lg:col-span-1 bg-nexus-surface border border-nexus-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-medium text-nexus-muted uppercase tracking-wider">Recent Training</h3>
                <Dumbbell size={16} className="text-nexus-text" />
            </div>
            
            <div className="space-y-4">
                <div className="border-l-2 border-nexus-border pl-4">
                    <p className="text-sm text-nexus-text font-medium">Upper Body Hypertrophy</p>
                    <p className="text-xs text-nexus-muted mt-1">Today • 45 mins • 12,400 kg vol</p>
                    <div className="mt-2 text-xs text-nexus-muted font-mono">
                        <div className="flex justify-between"><span>Bench Press</span> <span>80kg x 8, 8, 8</span></div>
                        <div className="flex justify-between"><span>Pull Ups</span> <span>BW x 10, 9, 8</span></div>
                    </div>
                </div>
                <div className="border-l-2 border-nexus-border pl-4 opacity-50">
                    <p className="text-sm text-nexus-text font-medium">Zone 2 Cardio</p>
                    <p className="text-xs text-nexus-muted mt-1">Yesterday • 60 mins</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default HealthHub;