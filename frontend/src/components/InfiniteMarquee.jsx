import React from 'react';
import { Shield, Zap, Users, Award, Lock, TrendingUp, CheckCircle, Globe } from 'lucide-react';

const InfiniteMarquee = () => {
    const features = [
        { icon: Shield, text: 'Enterprise-Ready' },
        { icon: Lock, text: 'Secure by Design' },
        { icon: Award, text: 'Bias-Aware AI' },
        { icon: Zap, text: 'Lightning Fast' },
        { icon: Users, text: 'Scalable Architecture' },
        { icon: TrendingUp, text: '95% Accuracy' },
        { icon: CheckCircle, text: 'SOC 2 Compliant' },
        { icon: Globe, text: 'Global Coverage' },
    ];

    // Duplicate for seamless loop
    const duplicatedFeatures = [...features, ...features];

    return (
        <div className="relative w-full overflow-hidden bg-white py-12 border-y border-gray-100 shadow-sm">
            <div className="max-w-7xl mx-auto px-6 mb-8 text-center">
                <p className="text-sm font-semibold text-[#5d8c2c] uppercase tracking-[0.2em]">Trusted Partners & Quality Standards</p>
            </div>

            {/* Gradient Overlays for fade effect */}
            <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

            {/* Scrolling Container */}
            <div className="flex animate-marquee hover:pause-marquee">
                {duplicatedFeatures.map((feature, index) => (
                    <div
                        key={index}
                        className="flex items-center gap-4 px-10 whitespace-nowrap"
                    >
                        <div className="w-12 h-12 rounded-none bg-white border border-gray-200 shadow-sm flex items-center justify-center text-[#5d8c2c] group-hover:scale-110 transition-transform">
                            <feature.icon className="w-6 h-6" />
                        </div>
                        <span className="text-lg font-semibold text-black tracking-tight">
                            {feature.text}
                        </span>
                        <div className="w-2 h-2 rounded-none bg-[#5d8c2c]/30 ml-6" />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default InfiniteMarquee;
