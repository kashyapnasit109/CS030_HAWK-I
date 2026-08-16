import { motion } from "framer-motion";

export function Atmosphere() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      
      {/* Background Dot Matrix */}
      <div className="absolute inset-0 bg-dot-matrix opacity-35" />
      <div className="absolute inset-0 bg-grid-mesh opacity-25" />

      {/* Floating Ambient Aurora Orbs */}
      <motion.div
        animate={{
          x: ["-10%", "10%", "-10%"],
          y: ["-5%", "15%", "-5%"],
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -top-[15%] left-[20%] w-[650px] h-[650px] bg-gradient-to-br from-hawk-sapphire/20 via-blue-600/10 to-transparent rounded-full blur-[140px]"
      />

      <motion.div
        animate={{
          x: ["10%", "-10%", "10%"],
          y: ["10%", "-10%", "10%"],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-[40%] -right-[10%] w-[550px] h-[550px] bg-gradient-to-bl from-hawk-emerald/15 via-emerald-600/5 to-transparent rounded-full blur-[130px]"
      />

      <motion.div
        animate={{
          x: ["-5%", "5%", "-5%"],
          y: ["5%", "-5%", "5%"],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 16,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -bottom-[10%] left-[30%] w-[500px] h-[500px] bg-gradient-to-tr from-hawk-burgundy/10 via-rose-600/5 to-transparent rounded-full blur-[120px]"
      />

      {/* Mouse Spotlight Illumination */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 transition-opacity duration-300"
        style={{
          background: `radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(59, 130, 246, 0.08), transparent 80%)`,
        }}
      />

    </div>
  );
}
