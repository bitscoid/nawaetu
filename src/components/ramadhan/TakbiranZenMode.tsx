"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Volume2, VolumeX, X } from "lucide-react";
import { cn } from "@/lib/utils";

const playTick = (ctx: AudioContext) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 800;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
};

export default function TakbiranZenMode({ onClose }: { onClose: () => void }) {
    const [count, setCount] = useState(0);
    const [feedbackMode, setFeedbackMode] = useState<'sound' | 'none'>('sound');
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
    const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

    const initAudio = () => {
        if (!audioContext && typeof window !== "undefined") {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
                const ctx = new AudioCtx();
                setAudioContext(ctx);
                return ctx;
            }
        }
        return audioContext;
    };

    const handleIncrement = (e: React.MouseEvent | React.TouchEvent) => {
        const id = Date.now();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        
        setRipples(prev => [...prev.slice(-5), { id, x: clientX, y: clientY }]);
        setTimeout(() => {
            setRipples(prev => prev.filter(r => r.id !== id));
        }, 600);

        let ctx = audioContext;
        if (!ctx) ctx = initAudio();
        if (ctx && ctx.state === 'suspended') ctx.resume();

        if (feedbackMode === 'sound' && ctx) playTick(ctx);
        setCount(prev => prev + 1);
    };

    const toggleFeedback = () => {
        setFeedbackMode(prev => prev === 'sound' ? 'none' : 'sound');
    };

    const FeedbackIcon = feedbackMode === 'sound' ? Volume2 : VolumeX;

    const zenModeUI = (
        <div className="fixed inset-0 z-[9999] bg-black text-white flex flex-col items-center justify-center overflow-hidden">
            {/* Full screen tap area */}
            <div className="absolute inset-0 cursor-pointer active:bg-white/5 transition-colors" onClick={(e) => handleIncrement(e)} />

            {/* Ripples */}
            {ripples.map(ripple => (
                <div
                    key={ripple.id}
                    className="absolute rounded-full bg-[rgb(var(--color-primary)/0.2)] pointer-events-none animate-ripple"
                    style={{
                        left: ripple.x,
                        top: ripple.y,
                        width: '20px',
                        height: '20px',
                        transform: 'translate(-50%, -50%)',
                    }}
                />
            ))}

            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-8 right-6 z-[110] p-4 rounded-full opacity-20 hover:opacity-100 hover:bg-white/10 active:scale-95 transition-all text-white/50 hover:text-white"
            >
                <X className="w-8 h-8" />
            </button>

            {/* Counter Content */}
            <div className="relative z-10 flex flex-col items-center pointer-events-none mt-[-10vh]">
                <div className="px-4 pb-4 bg-transparent animate-in slide-in-from-top-4 duration-1000">
                    <h2 className="text-4xl xs:text-6xl md:text-8xl font-bold font-serif leading-none tracking-tight text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.4)] text-center mb-4 transition-all duration-300">
                        ٱللَّٰهُ أَكْبَرُ
                    </h2>
                    <p className="font-extrabold text-xs xs:text-base md:text-xl tracking-tight uppercase text-[rgb(var(--color-primary-light))] text-center">
                        Allahu Akbar
                    </p>
                </div>

                <span className="text-[120px] leading-none xs:text-[140px] md:text-[180px] font-mono font-bold tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] mt-4">
                    {count}
                </span>

                <div className="mt-16 text-xs md:text-sm animate-pulse font-medium text-[rgb(var(--color-primary-light))]/60 tracking-widest uppercase">
                    Ketuk untuk Bertakbir
                </div>
            </div>

            {/* Feedback Toggle */}
            <button
                onClick={(e) => { e.stopPropagation(); toggleFeedback(); }}
                className="absolute bottom-8 right-6 z-[110] p-4 rounded-full opacity-30 hover:opacity-100 hover:bg-white/10 active:scale-95 transition-all text-white/50 hover:text-white flex flex-col items-center gap-1.5"
            >
                <FeedbackIcon className="w-5 h-5" />
                <span className="text-[8px] font-medium uppercase tracking-tighter opacity-70">
                    {feedbackMode === 'sound' ? 'Aktif' : 'Bisu'}
                </span>
            </button>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(zenModeUI, document.body) : null;
}
