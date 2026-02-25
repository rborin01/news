
import React from 'react';
import { Menu } from 'lucide-react';
import { AIConfig } from '../types';

interface HeaderProps {
  toggleMobileMenu: () => void;
  aiConfig: AIConfig;
  setAiConfig: (c: AIConfig) => void;
}

export const Header: React.FC<HeaderProps> = ({ 
    toggleMobileMenu
}) => {
  return (
    <>
        {/* Mobile Header */}
        <header className="md:hidden bg-white p-4 border-b border-slate-200 flex justify-between items-center z-20 sticky top-0 shadow-sm">
            <div className="flex items-center gap-2">
                <span className="font-black text-lg text-slate-800">TRUE PRESS</span>
            </div>
            <button onClick={toggleMobileMenu}>
                <Menu />
            </button>
        </header>

        {/* Desktop Header is now integrated into Dashboard Sidebar, this component only reserves space if needed or handles mobile */}
        {/* We keep it minimal or invisible on desktop since functionality moved */}
        <div className="hidden md:block h-2 bg-transparent"></div> 
    </>
  );
};
