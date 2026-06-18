import React from 'react';
import { motion } from 'framer-motion';

const AnimatedHeroText = ({ text = "10x Faster", className = "" }) => {
    // Split text into characters
    const letters = Array.from(text);

    const container = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1, delayChildren: 0.2 },
        },
    };

    const child = {
        visible: {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            transition: {
                type: "spring",
                damping: 20,
                stiffness: 100,
            },
        },
        hidden: {
            opacity: 0,
            y: 40,
            filter: "blur(10px)",
        },
    };

    return (
        <span className={`inline-flex relative font-bold ${className}`}>
            {/* Text Outline / Placeholder for layout stability (optional) */}
            <span className="invisible">{text}</span>

            {/* Main Staggered Entrance Text */}
            <motion.span
                className="absolute inset-0 inline-flex justify-center"
                variants={container}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
            >
                {letters.map((letter, index) => (
                    <motion.span
                        key={index}
                        variants={child}
                        className="inline-block bg-clip-text text-transparent bg-gradient-to-r from-[#34A853] via-[#43A047] to-[#1B5E20] bg-[length:200%_auto]"
                        style={{
                            whiteSpace: 'pre',
                            backgroundSize: '200% auto',
                        }}
                        animate={{
                            backgroundPosition: ["0% center", "200% center"],
                        }}
                        transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: "linear",
                            delay: 1.5 + (index * 0.1) // Start loop after entrance
                        }}
                    >
                        {letter}
                    </motion.span>
                ))}
            </motion.span>
        </span>
    );
};

export default AnimatedHeroText;
