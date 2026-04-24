import React, { useEffect, useState } from 'react';
import { useTimerStore } from '@/stores/timerStore';
import { Play, Pause, RotateCcw, X, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export const FloatingTimer: React.FC = () => {
    const { seconds, isRunning, isVisible, startTimer, pauseTimer, resetTimer, toggleVisibility } = useTimerStore();
    const [position, setPosition] = useState({ x: window.innerWidth - 380, y: window.innerHeight - 130 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const getTimeParts = (totalSeconds: number) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;
        return {
            h: String(hours).padStart(2, '0'),
            m: String(minutes).padStart(2, '0'),
            s: String(secs).padStart(2, '0'),
            hasHours: hours > 0
        };
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragOffset({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        });
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                setPosition({
                    x: Math.max(0, Math.min(window.innerWidth - 300, e.clientX - dragOffset.x)),
                    y: Math.max(0, Math.min(window.innerHeight - 80, e.clientY - dragOffset.y))
                });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset]);

    if (!isVisible) return null;

    const time = getTimeParts(seconds);

    return (
        <div
            className={cn(
                "fixed z-[9999] group flex items-center gap-4",
                "bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl",
                "border border-white/40 dark:border-slate-700/50",
                "shadow-[0_20px_50px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]",
                "rounded-full pl-2 pr-4 py-2 transition-all duration-300 ease-out",
                isDragging ? "cursor-grabbing scale-105" : "cursor-default hover:shadow-[0_25px_60px_rgba(0,0,0,0.3)]"
            )}
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                userSelect: 'none'
            }}
        >
            {/* Drag Handle */}
            <div
                onMouseDown={handleMouseDown}
                className="cursor-grab active:cursor-grabbing p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
            >
                <GripVertical size={16} className="text-slate-400" />
            </div>

            {/* Time Display */}
            <div className="flex items-center gap-0.5 px-2">
                <div className="flex items-baseline">
                    <span className={cn(
                        "text-2xl font-bold font-mono tracking-tighter tabular-nums transition-colors duration-300",
                        isRunning ? "text-brand-600 dark:text-brand-400" : "text-slate-900 dark:text-white"
                    )}>
                        {time.h}:{time.m}:{time.s}
                    </span>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1.5 h-10 px-1.5 bg-slate-100/80 dark:bg-white/5 rounded-full border border-black/5 dark:border-white/5">
                {!isRunning ? (
                    <button
                        onClick={startTimer}
                        className="p-2 bg-brand-600 hover:bg-brand-500 text-white rounded-full shadow-lg shadow-brand-500/30 transition-all hover:scale-110 active:scale-95 group/play"
                        title="Start Timer"
                    >
                        <Play size={15} fill="currentColor" className="ml-0.5" />
                    </button>
                ) : (
                    <button
                        onClick={pauseTimer}
                        className="p-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white rounded-full shadow-lg shadow-slate-900/30 transition-all hover:scale-110 active:scale-95"
                        title="Pause Timer"
                    >
                        <Pause size={15} fill="currentColor" />
                    </button>
                )}
                <button
                    onClick={resetTimer}
                    className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-all active:scale-95"
                    title="Reset"
                >
                    <RotateCcw size={15} />
                </button>
                <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-1 opacity-50" />
                <button
                    onClick={() => toggleVisibility(false)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-all"
                    title="Close"
                >
                    <X size={15} />
                </button>
            </div>

            {/* Subtle running glow */}
            {isRunning && (
                <div className="absolute inset-0 rounded-full ring-2 ring-blue-500/20 animate-pulse pointer-events-none" />
            )}
        </div>
    );
};
