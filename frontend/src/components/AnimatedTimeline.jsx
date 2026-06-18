import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, Sparkles, Code, Mic, CheckCircle } from 'lucide-react';

const AnimatedTimeline = () => {
    const [activeIndex, setActiveIndex] = useState(0);

    const steps = [
        { step: 1, title: "Upload JD", desc: "Drag & drop job description", icon: Upload, color: "green" },
        { step: 2, title: "AI Screen", desc: "Rank candidates instantly", icon: Sparkles, color: "green" },
        { step: 3, title: "Assess", desc: "Auto-send coding tests", icon: Code, color: "green" },
        { step: 4, title: "Interview", desc: "Voice AI conducts rounds", icon: Mic, color: "green" },
        { step: 5, title: "Hire", desc: "Data-backed decisions", icon: CheckCircle, color: "green" }
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveIndex(prev => prev + 1);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const radius = 260;
    const totalSteps = steps.length;
    const baseAngle = 360 / totalSteps;

    return (
        <div className="relative h-[640px] w-full flex items-center justify-center overflow-hidden perspective-1000">
            {/* Center Grid Decoration */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] grid-pattern-blue opacity-[0.3] -z-20" />

            <div className="relative w-full h-full flex items-center justify-center">
                {steps.map((item, index) => {
                    const currentRotation = activeIndex * -baseAngle;
                    const itemExposedAngle = (index * baseAngle) + currentRotation;
                    const radian = (itemExposedAngle * Math.PI) / 180;

                    const x = Math.sin(radian) * radius;
                    const z = Math.cos(radian) * radius;

                    const scale = (z + radius * 2.5) / (radius * 3.5);
                    const opacity = (z + radius * 1.5) / (radius * 2.5);
                    const zIndex = Math.round(z + radius);
                    const isFront = z > (radius - 50);

                    return (
                        <motion.div
                            key={index}
                            className={`absolute top-1/2 left-1/2 flex flex-col items-center justify-center text-center p-8 rounded-2xl w-72 h-92 transition-all duration-500
                                ${isFront ? 'bg-[#f4f8fb] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] border-2 border-blue-200' : 'bg-white/40'}
                            `}
                            initial={false}
                            animate={{
                                x: x - 144,
                                y: -168,
                                scale: scale,
                                opacity: Math.max(0.2, Math.min(1, opacity)),
                                zIndex: isFront ? 50 : zIndex, // FORCE FRONT CARD TO TOP
                                filter: isFront ? 'blur(0px)' : 'blur(2px)'
                            }}
                            transition={{
                                type: "spring",
                                stiffness: 40,
                                damping: 12
                            }}
                        >
                            {/* Step Badge */}
                            <div className={`absolute -top-5 px-6 py-2 rounded-lg text-xs font-bold tracking-widest uppercase shadow-md z-50 ${isFront ? `bg-primary text-white` : 'bg-gray-100 text-black'
                                }`}>
                                Step {item.step}
                            </div>

                            <div className={`w-24 h-24 rounded-2xl flex items-center justify-center mb-8 transition-all duration-300 ${isFront ? `bg-green-50/50 text-primary scale-110` : 'bg-gray-50/50 text-gray-300'
                                }`}>
                                <item.icon className="w-12 h-12" strokeWidth={1} />
                            </div>

                            <h3 className={`text-xl font-semibold mb-4 transition-colors duration-300 uppercase tracking-wide ${isFront ? 'text-black' : 'text-gray-400'
                                }`}>
                                {item.title}
                            </h3>
                            <p className={`text-sm leading-relaxed max-w-[200px] font-medium ${isFront ? 'text-black' : 'text-gray-400 opacity-40'}`}>
                                {item.desc}
                            </p>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

export default AnimatedTimeline;
