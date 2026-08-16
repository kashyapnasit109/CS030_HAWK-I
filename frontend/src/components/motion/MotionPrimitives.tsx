import type { HTMLMotionProps } from "motion/react";
import { motion, useReducedMotion } from "motion/react";
import { staggerContainer, revealItem } from "../../lib/motion";

type MotionSectionProps = HTMLMotionProps<"div"> & {
  /** When set, children (MotionItem) reveal in sequence with this delay (s) between each. */
  stagger?: number;
  /** Delay (s) before the first child reveals. */
  delay?: number;
};

/**
 * Page/section wrapper. Without `stagger` it fades the whole block up as one unit.
 * With `stagger` it orchestrates MotionItem children in sequence.
 * Honors prefers-reduced-motion by skipping the entrance animation.
 */
export function MotionSection({ children, stagger, delay = 0, ...rest }: MotionSectionProps) {
  const reduce = useReducedMotion();
  const variants = stagger !== undefined ? staggerContainer(stagger, delay) : revealItem;
  return (
    <motion.div
      variants={reduce ? undefined : variants}
      initial={reduce ? undefined : "initial"}
      animate={reduce ? undefined : "animate"}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** A single staggered child — must sit inside a MotionSection with a `stagger` prop. */
export function MotionItem({ children, ...rest }: HTMLMotionProps<"div">) {
  const reduce = useReducedMotion();
  return (
    <motion.div variants={reduce ? undefined : revealItem} {...rest}>
      {children}
    </motion.div>
  );
}

/** Glass card with a subtle hover lift. Owns its own transform — pair with a card that has NO CSS hover-transform. */
export function MotionCard({ children, ...rest }: HTMLMotionProps<"div">) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      whileHover={reduce ? undefined : { y: -3 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
