import React, { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout } from 'lucide-react';

const CandidateLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // --- Strict Auth Guard ---
    useEffect(() => {
        const token = localStorage.getItem('candidateToken');
        // Only allow access to login page without token
        if (!token && location.pathname !== '/portal/login') {
            navigate('/portal/login');
        }
    }, [location, navigate]); // Check eagerly on every location change
    // -------------------------

    // Detect if current route is an assessment or start page (needs full-width/clean)
    const isAssessment = location.pathname.includes('/portal/assessment') || location.pathname.includes('/portal/start');

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
            {/* Minimal Header - Hide for assessments and start page */}
            {!isAssessment && (
                <header className="bg-white border-b border-gray-200 py-4 px-6 md:px-12 flex items-center justify-between shadow-sm z-10">
                    <div className="flex items-center gap-5">
                        <img src="/logo_main.png" alt="ThirdEye Data Logo" className="h-8 w-auto object-contain" />
                        <div className="hidden sm:block w-[1.5px] h-8 bg-gray-400" />
                        <span className="text-xl font-bold text-[#5d8c2c] tracking-tight mt-3.5">HiringAI</span>
                    </div>
                    <div className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                        Secure Assessment Environment
                    </div>
                </header>
            )}

            {/* Main Focus Area - Conditional Layout */}
            {isAssessment ? (
                // Full-width for assessments
                <main className="flex-1 flex flex-col overflow-hidden">
                    <Outlet />
                </main>
            ) : (
                // Centered layout for other pages
                <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 pb-32 relative overflow-y-auto overflow-x-hidden">
                    {/* Background Decor */}
                    <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
                        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
                        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
                    </div>

                    <div className="w-full max-w-4xl z-10">
                        <Outlet />
                    </div>
                </main>
            )}

            {/* Simple Footer - Hide for assessments */}
            {!isAssessment && (
                <footer className="py-4 text-center text-xs text-gray-400 bg-white border-t border-gray-100">
                    &copy; {new Date().getFullYear()} HiringAI. All rights reserved.
                </footer>
            )}
        </div>
    );
};

export default CandidateLayout;
