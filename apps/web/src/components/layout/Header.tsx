'use client';

import { Activity, Globe, Wifi, WifiOff } from 'lucide-react';

interface HeaderProps {
  apiStatus: 'live' | 'demo';
}

export function Header({ apiStatus }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur supports-[backdrop-filter]:bg-slate-950/60">
      <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo / Brand */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Activity className="h-5 w-5 text-pulse-teal" />
            <span className="font-bold text-white tracking-tight">PulseMiner</span>
          </div>
          {/* Ghana flag strip */}
          <div className="hidden sm:flex items-center gap-0.5 ml-1">
            <div className="h-3.5 w-1.5 rounded-sm bg-gh-red" />
            <div className="h-3.5 w-1.5 rounded-sm bg-gh-gold" />
            <div className="h-3.5 w-1.5 rounded-sm bg-gh-green" />
          </div>
          <span className="hidden sm:block text-slate-400 text-sm font-medium">Ghana · Pilot</span>
        </div>

        {/* Centre nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm text-slate-400">
          <a href="/dashboard" className="text-white font-medium">Dashboard</a>
          <a href="/dashboard" className="hover:text-white transition-colors">Regions</a>
          <a href="/dashboard" className="hover:text-white transition-colors">Topics</a>
          <a href="/dashboard" className="hover:text-white transition-colors">Reports</a>
        </nav>

        {/* Right: status + date */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            {apiStatus === 'live' ? (
              <>
                <Wifi className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-amber-400">Demo data</span>
              </>
            )}
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
            <Globe className="h-3.5 w-3.5" />
            <span>10 Mar 2026</span>
          </div>
        </div>
      </div>
    </header>
  );
}
