"use client";

/**
 * Nawaetu - Islamic Habit Tracker
 * Copyright (C) 2026 Hadian Rahmat
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { useEffect, useState } from "react";
import { usePrayerTimesContext } from "@/context/PrayerTimesContext";
import RamadhanCountdown from "@/components/RamadhanCountdown";
import IntentionJournalWidget from "@/components/intentions/IntentionJournalWidget";
import DeferredBelowFold from "@/components/home/DeferredBelowFold";
import HomeHeader from "@/components/HomeHeader";
import TakbiranZenMode from "@/components/ramadhan/TakbiranZenMode";

export default function HomeClient() {
    const { data } = usePrayerTimesContext();

    // Move dynamic time calculation to internal state to avoid hydration mismatch.
    // Server renders a stable default, and client updates after mount.
    const [initialDaysLeft, setInitialDaysLeft] = useState(0);
    const [isRamadhanSeason, setIsRamadhanSeason] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [showTakbiran, setShowTakbiran] = useState(false);

    useEffect(() => {
        setMounted(true);
        const RAMADHAN_START_MS = new Date("2026-02-18T00:00:00+07:00").getTime();
        const RAMADHAN_END_MS = new Date("2026-03-20T23:59:59+07:00").getTime();
        const now = Date.now();

        const isSeason = now >= RAMADHAN_START_MS && now <= RAMADHAN_END_MS;
        setIsRamadhanSeason(isSeason);

        if (!isSeason) {
            const days = Math.max(0, Math.floor((RAMADHAN_START_MS - now) / 86400000));
            setInitialDaysLeft(days);
        }
    }, []);

    // Use the server-computed flag as the ground truth if available, otherwise wait for mount.
    // Once the API loads, refine with the hijri month for accuracy.
    const hijriMonth = data?.hijriMonth || "";
    // If not mounted yet, default to NOT Ramadhan to match server static HTML
    const isRamadhan = mounted && (isRamadhanSeason || (data
        ? (hijriMonth.includes("Ramadan") || hijriMonth.includes("Ramadhan"))
        : false));

    return (
        <div className="flex min-h-screen flex-col items-center bg-[rgb(var(--color-background))] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(var(--color-primary),0.15),rgba(255,255,255,0))] px-4 py-4 font-sans sm:px-6">

            <main className="flex w-full max-w-md flex-col items-center gap-3 pb-nav">

                {/* 1. Header & Greeting */}
                <HomeHeader />


                {/* 2. Ramadhan Countdown - Hidden during Ramadhan season */}
                {!isRamadhan && (
                    <section className="w-full">
                        <RamadhanCountdown initialDays={initialDaysLeft} />
                    </section>
                )}

                {/* 3. Takbiran Trigger (Shown at end of Ramadhan/Eid) */}
                <section className="w-full mb-2">
                    <button 
                        onClick={() => setShowTakbiran(true)}
                        className="w-full relative overflow-hidden group rounded-2xl border border-[rgb(var(--color-primary))]/30 bg-black/40 backdrop-blur-sm shadow-[0_0_20px_rgba(var(--color-primary),0.15)] flex items-center justify-between p-4 transition-transform active:scale-95"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-[rgb(var(--color-primary-dark))]/50 to-black/80 -z-10" />
                        <div className="flex flex-col items-start gap-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[rgb(var(--color-primary-light))]">Menyambut Syawal</span>
                            <span className="text-xl font-bold text-white font-serif">Malam Takbiran</span>
                        </div>
                        <span className="text-3xl filter drop-shadow opacity-90 group-hover:scale-110 transition-transform">✨</span>
                    </button>
                    {showTakbiran && <TakbiranZenMode onClose={() => setShowTakbiran(false)} />}
                </section>

                {/* 4. Nawaetu Journal - The core uniqueness */}
                <section className="w-full animate-in slide-in-from-bottom-3 fade-in duration-700">
                    <IntentionJournalWidget />
                </section>

                <DeferredBelowFold />

            </main>

        </div>
    );
}
