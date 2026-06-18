import React from 'react';

const AnimatedBackground = () => {
    return (
        <div className="absolute inset-0 -z-10 overflow-hidden">
            {/* Gradient Orbs */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-400/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-green-600/10 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
            <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-green-500/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />

            {/* Mesh Grid Overlay */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `
                        linear-gradient(to right, #16A34A 1px, transparent 1px),
                        linear-gradient(to bottom, #16A34A 1px, transparent 1px)
                    `,
                    backgroundSize: '60px 60px'
                }}
            />

            {/* Radial Gradient Overlay - Removed to show body background */}
            {/* <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/50 to-white" /> */}
        </div>
    );
};

export default AnimatedBackground;
