import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Sparkles, TrendingUp, Award, CheckCircle } from 'lucide-react';

const ResumeScreeningDemo = () => {
    const [stage, setStage] = useState('idle');
    const [scores, setScores] = useState({});

    const resumes = [
        { id: 1, name: 'Sarah Chen', role: 'Senior Developer', score: 95, color: 'from-green-500 to-green-600' },
        { id: 2, name: 'Michael Rodriguez', role: 'Full Stack Engineer', score: 88, color: 'from-green-600 to-green-700' },
        { id: 3, name: 'Emily Watson', role: 'Frontend Developer', score: 82, color: 'from-emerald-500 to-emerald-600' },
    ];

    useEffect(() => {
        const runAnimation = async () => {
            // Reset
            setStage('idle');
            setScores({});
            setVisibleCandidates([]);

            // 1. Show candidates appearing one by one
            setStage('appearing');
            for (const resume of resumes) {
                await delay(500);
                setVisibleCandidates(prev => [...prev, resume.id]);
            }

            await delay(500);

            // 2. Scan and score each candidate sequentially
            setStage('scanning');
            for (const resume of resumes) {
                // Highlight current candidate
                setStage(`scanning-${resume.id}`);
                await delay(800);

                // Show score
                setScores(prev => ({ ...prev, [resume.id]: resume.score }));
                await delay(400);
            }

            setStage('ranked');

            // Loop animation
            await delay(4000);
            runAnimation();
        };

        runAnimation();
    }, []);

    const [visibleCandidates, setVisibleCandidates] = useState([]);
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    return (
        <div className="relative w-full max-w-4xl mx-auto py-12">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-12"
            >
                <div className="inline-flex items-center gap-2 mb-4">
                    <Sparkles className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-bold text-green-700">AI-Powered Resume Screening</span>
                </div>
                <h3 className="text-3xl font-semibold text-black mb-2">Screen 1000+ Resumes in Seconds</h3>
                <p className="text-black font-medium">Watch our AI analyze and rank candidates automatically</p>
            </motion.div>

            {/* Demo Container */}
            <div className="relative bg-transparent backdrop-blur-sm rounded-none border border-green-200/30 p-8 shadow-2xl shadow-green-500/10 overflow-hidden min-h-[500px]">

                {/* Resume Cards */}
                <div className="space-y-4">
                    <AnimatePresence>
                        {resumes.filter(r => visibleCandidates.includes(r.id)).map((resume, index) => (
                            <motion.div
                                key={resume.id}
                                initial={{ x: -50, opacity: 0 }}
                                animate={{
                                    x: 0,
                                    opacity: 1,
                                    scale: stage === `scanning-${resume.id}` ? 1.02 : 1,
                                    boxShadow: stage === `scanning-${resume.id}` ? "0 10px 25px -5px rgba(22, 163, 74, 0.1), 0 8px 10px -6px rgba(22, 163, 74, 0.1)" : ""
                                }}
                                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                className={`relative bg-white rounded-none border-2 ${stage === `scanning-${resume.id}` ? 'border-green-400 ring-2 ring-green-100' :
                                    scores[resume.id] >= 90 ? 'border-green-200 bg-green-50/30' :
                                        'border-gray-200'
                                    } p-6 transition-all duration-300 overflow-hidden text-black font-normal`}
                            >
                                {/* Scanning Light Effect */}
                                {stage === `scanning-${resume.id}` && (
                                    <motion.div
                                        initial={{ x: '-100%' }}
                                        animate={{ x: '200%' }}
                                        transition={{ duration: 1.5, ease: "linear", repeat: Infinity }}
                                        className="absolute inset-0 bg-gradient-to-r from-transparent via-green-400/10 to-transparent z-0 pointer-events-none"
                                    />
                                )}

                                <div className="relative z-10 flex items-center justify-between">
                                    {/* Left: Resume Info */}
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-none bg-gradient-to-br ${resume.color} flex items-center justify-center text-white font-normal text-lg shadow-sm border border-black/5`}>
                                            {resume.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-normal text-black text-lg">{resume.name}</h4>
                                            <p className="text-sm text-black font-normal">{resume.role}</p>
                                        </div>
                                    </div>

                                    {/* Right: Score Badge */}
                                    <AnimatePresence>
                                        {scores[resume.id] ? (
                                            <motion.div
                                                initial={{ scale: 0, rotate: -180 }}
                                                animate={{ scale: 1, rotate: 0 }}
                                                className="flex items-center gap-3"
                                            >
                                                {/* Score Circle */}
                                                <div className={`relative w-16 h-16 rounded-none border border-green-200 ${scores[resume.id] >= 90 ? 'bg-green-100' :
                                                    scores[resume.id] >= 80 ? 'bg-green-50' : 'bg-gray-50'
                                                    } flex items-center justify-center shadow-sm`}>
                                                    <span className={`text-2xl font-normal ${scores[resume.id] >= 90 ? 'text-green-600' :
                                                        scores[resume.id] >= 80 ? 'text-green-500' : 'text-gray-600'
                                                        }`}>
                                                        {scores[resume.id]}
                                                    </span>
                                                </div>

                                                {/* Top Candidate Badge */}
                                                {scores[resume.id] >= 90 && (
                                                    <motion.div
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        transition={{ delay: 0.3 }}
                                                        className="absolute -top-2 -right-2 bg-gradient-to-r from-green-600 to-green-700 text-white px-3 py-1 rounded-none text-xs font-normal shadow-lg flex items-center gap-1 border border-green-500"
                                                    >
                                                        <Award className="w-3 h-3" />
                                                        Top Match
                                                    </motion.div>
                                                )}
                                            </motion.div>
                                        ) : (
                                            stage === `scanning-${resume.id}` && (
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    className="flex items-center gap-2 text-green-600 text-sm font-normal"
                                                >
                                                    <div className="w-2 h-2 rounded-none bg-green-600 animate-pulse" />
                                                    Analyzing...
                                                </motion.div>
                                            )
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Skills Tags (appear after scoring) */}
                                <AnimatePresence>
                                    {scores[resume.id] && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            transition={{ delay: 0.2 }}
                                            className="mt-4 flex flex-wrap gap-2"
                                        >
                                            {['React', 'Node.js', 'TypeScript', 'AWS'].map((skill, i) => (
                                                <span key={i} className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-none border border-green-100 font-normal">
                                                    {skill}
                                                </span>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {visibleCandidates.length < resumes.length && (
                        <div className="h-24 flex items-center justify-center">
                            <div className="flex gap-1">
                                <span className="w-2 h-2 bg-green-200 rounded-none animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-2 h-2 bg-green-300 rounded-none animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-2 h-2 bg-green-400 rounded-none animate-bounce"></span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Status Indicator */}
                <motion.div
                    className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-2 text-sm"
                >
                    {stage.startsWith('scanning') ? (
                        <>
                            <div className="w-2 h-2 bg-green-600 rounded-none animate-pulse" />
                            <span className="text-green-600 font-normal uppercase tracking-wider">AI Agent Processing Candidates...</span>
                        </>
                    ) : stage === 'ranked' ? (
                        <>
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-green-600 font-normal uppercase tracking-wider">All Candidates Ranked!</span>
                        </>
                    ) : (
                        <span className="text-gray-400 font-normal uppercase tracking-wider">Waiting for candidates...</span>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default ResumeScreeningDemo;
