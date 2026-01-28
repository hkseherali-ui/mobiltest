
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
  onLogout: () => void;
  showBack?: boolean;
  onBack?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, title, onLogout, showBack, onBack }) => {
  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-gray-50 shadow-xl border-x border-gray-100">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-indigo-600 text-white px-4 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          {showBack && (
            <button onClick={onBack} className="p-1 active:bg-indigo-700 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h1 className="text-lg font-bold truncate">{title}</h1>
        </div>
        <button 
          onClick={onLogout}
          className="p-2 bg-indigo-500 rounded-lg active:scale-95 transition-transform"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 pb-24 overflow-y-auto hide-scrollbar">
        {children}
      </main>

      {/* Persistent Bottom Nav (Simplified for Phase 1) */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-200 py-2 px-4 flex justify-around items-center shadow-lg-up">
        <div className="text-xs text-gray-400 italic">Phase 1: Kullanıcı Yönetimi</div>
      </nav>
    </div>
  );
};

export default Layout;
