import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MessageCircle, Brain, TrendingUp } from 'lucide-react';

const AIInterviewSimulation = () => {
    const [cycle, setCycle] = useState(0);
    const [stage, setStage] = useState('idle');
    const [messages, setMessages] = useState([]);
    const [sentiment, setSentiment] = useState(0);
    const isMounted = useRef(true);

    const fullConversation = [
        { id: 1, type: 'ai', text: 'How do you optimize React performance?', sentiment: 0 },
        { id: 2, type: 'candidate', text: 'I use useMemo and useCallback to prevent unnecessary re-renders.', sentiment: 92 },
        { id: 3, type: 'ai', text: 'Explain the difference between SQL and NoSQL.', sentiment: 0 },
        { id: 4, type: 'candidate', text: 'SQL is relational and structured, whereas NoSQL is non-relational and flexible.', sentiment: 88 }
    ];

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    useEffect(() => {
        isMounted.current = true;

        const runAnimation = async () => {
            if (!isMounted.current) return;

            // 1. Reset everything cleanly
            setMessages([]);
            setStage('listening');
            setSentiment(0);

            // Wait for clear
            await delay(1000);

            // 2. Run the fixed conversation
            for (const msg of fullConversation) {
                if (!isMounted.current) return;

                setStage(msg.type === 'ai' ? 'speaking' : 'listening');
                await delay(msg.type === 'ai' ? 1000 : 1200);

                if (!isMounted.current) return;

                // Add message with unique timestamp key to force fresh render
                setMessages(prev => [...prev, { ...msg, keyId: Date.now() }]);

                if (msg.sentiment > 0) {
                    const start = sentiment;
                    const end = msg.sentiment;
                    const steps = 10;
                    const stepSize = (end - start) / steps;

                    for (let i = 1; i <= steps; i++) {
                        if (!isMounted.current) return;
                        setSentiment(Math.round(start + (stepSize * i)));
                        await delay(20);
                    }
                }
                await delay(1200);
            }

            if (!isMounted.current) return;
            setStage('complete');

            // 3. Pause before restart
            await delay(3000);

            if (isMounted.current) {
                setCycle(c => c + 1); // Trigger re-run via dependency
            }
        };

        runAnimation();

        return () => {
            isMounted.current = false;
        };
    }, [cycle]);

    return (
        <div className="relative w-full max-w-4xl mx-auto py-12">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-12"
            >
                <div className="inline-flex items-center gap-2 mb-4">
                    <Brain className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-bold text-green-700">AI Voice Interview</span>
                </div>
                <h3 className="text-3xl font-semibold text-black mb-2">Human-Like Technical Interviews</h3>
                <p className="text-black font-medium">Our AI conducts natural conversations and analyzes responses in real-time</p>
            </motion.div>

            {/* Demo Container */}
            <div className="relative bg-transparent backdrop-blur-sm rounded-none border border-green-200/30 p-8 shadow-2xl shadow-green-500/10 min-h-[550px] flex flex-col">
                {/* Voice Waveform */}
                <div className="flex justify-center mb-8">
                    <div className="relative">
                        {/* Microphone Icon */}
                        <motion.div
                            animate={{
                                scale: stage === 'listening' ? [1, 1.1, 1] : 1,
                            }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            className="w-20 h-20 bg-gradient-to-br from-green-600 to-green-700 rounded-none flex items-center justify-center shadow-lg"
                        >
                            <Mic className="w-10 h-10 text-white" />
                        </motion.div>

                        {/* Pulse Rings */}
                        {stage === 'listening' && (
                            <>
                                {[0, 0.4].map((delayVal, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ scale: 1, opacity: 0.5 }}
                                        animate={{ scale: 2.2, opacity: 0 }}
                                        transition={{
                                            repeat: Infinity,
                                            duration: 1.5,
                                            delay: delayVal,
                                            ease: 'easeOut'
                                        }}
                                        className="absolute inset-0 rounded-none border-4 border-green-500"
                                    />
                                ))}
                            </>
                        )}
                    </div>
                </div>

                {/* Conversation Messages */}
                <div className="flex-1 space-y-4 mb-6">
                    <AnimatePresence mode="popLayout">
                        {messages.map((msg) => (
                            <motion.div
                                key={msg.keyId} // Key uses robust timestamp to force re-mount
                                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ type: 'spring', stiffness: 250, damping: 25 }}
                                className={`flex ${msg.type === 'ai' ? 'justify-start' : 'justify-end'}`}
                            >
                                <div className={`max-w-[80%] ${msg.type === 'ai' ? 'order-1' : 'order-2'}`}>
                                    <div className={`rounded-none px-6 py-3 border ${msg.type === 'ai'
                                        ? 'bg-primary text-white border-green-700'
                                        : 'bg-green-50 text-black border-green-100'
                                        }`}>
                                        <div className="flex items-start gap-3">
                                            {msg.type === 'ai' && (
                                                <Brain className="w-4 h-4 mt-1 flex-shrink-0" />
                                            )}
                                            <p className="text-sm leading-relaxed font-normal">{msg.text}</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Sentiment Analysis Panel */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: sentiment > 0 ? 1 : 0, y: sentiment > 0 ? 0 : 20 }}
                    className="mt-auto bg-green-50 rounded-none p-6 border border-green-200"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-green-700" />
                            <span className="font-normal text-black tracking-wide uppercase text-xs">Real-Time Analysis</span>
                        </div>
                        <span className={`text-2xl font-normal ${sentiment >= 90 ? 'text-green-700' : 'text-green-600'}`}>
                            {sentiment}%
                        </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative h-2 bg-white/50 border border-green-100 rounded-none overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${sentiment}%` }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                            className="absolute inset-y-0 left-0 rounded-none bg-primary"
                        />
                    </div>

                    {/* Analysis Tags */}
                    <div className="flex flex-wrap gap-2 mt-4">
                        {sentiment > 0 && (
                            <>
                                <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="px-3 py-1 bg-white border border-green-100 rounded-none text-[10px] font-normal text-green-800 shadow-sm"
                                >
                                    ✓ Technical Knowledge
                                </motion.span>
                                <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.1 }}
                                    className="px-3 py-1 bg-white border border-green-100 rounded-none text-[10px] font-normal text-green-800 shadow-sm"
                                >
                                    ✓ Communication Skills
                                </motion.span>
                            </>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default AIInterviewSimulation;
