import type { Variants } from "motion/react";

/**
 * Shared motion tokens for the Hawk-I UI.
 * Timing mirrors the CSS ease used across the design system so motion feels
 * consistent whether driven by Framer Motion or plain CSS transitions.
 */
export const EASE_OUT = [0.215, 0.61, 0.355, 1] as const;

/** Route-level transition — a cinematic slow fade-up. */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.4, ease: [0.7, 0, 0.84, 0] } },
};

/** Parent container that staggers its MotionItem children into view. */
export const staggerContainer = (stagger = 0.06, delay = 0): Variants => ({
  initial: {},
  animate: { transition: { staggerChildren: stagger, delayChildren: delay } },
});

/** Single item reveal — used as a child of a staggerContainer. */
export const revealItem: Variants = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};
