"use client";
import { ReactNode, useRef } from "react";
import { motion, Variants, useInView } from "framer-motion";
import React from "react";

type PresetType = "fade" | "slide" | "scale" | "blur" | "blur-slide" | "zoom" | "bounce";

type AnimatedGroupProps = {
  children: ReactNode;
  style?: React.CSSProperties;
  variants?: { container?: Variants; item?: Variants };
  preset?: PresetType;
  once?: boolean;
  stagger?: number;
  delay?: number;
};

const makeContainer = (stagger = 0.1, delay = 0): Variants => ({
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: stagger, delayChildren: delay } },
});

const presets: Record<PresetType, { container: Variants; item: Variants }> = {
  fade: {
    container: makeContainer(),
    item: { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.5 } } },
  },
  slide: {
    container: makeContainer(),
    item: {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
    },
  },
  scale: {
    container: makeContainer(),
    item: {
      hidden: { opacity: 0, scale: 0.85 },
      visible: { opacity: 1, scale: 1, transition: { duration: 0.45, ease: "easeOut" } },
    },
  },
  blur: {
    container: makeContainer(),
    item: {
      hidden: { opacity: 0, filter: "blur(8px)" },
      visible: { opacity: 1, filter: "blur(0px)", transition: { duration: 0.55 } },
    },
  },
  "blur-slide": {
    container: makeContainer(0.08),
    item: {
      hidden: { opacity: 0, filter: "blur(8px)", y: 16 },
      visible: {
        opacity: 1, filter: "blur(0px)", y: 0,
        transition: { type: "spring", bounce: 0.3, duration: 1.2 },
      },
    },
  },
  zoom: {
    container: makeContainer(),
    item: {
      hidden: { opacity: 0, scale: 0.6 },
      visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 280, damping: 22 } },
    },
  },
  bounce: {
    container: makeContainer(),
    item: {
      hidden: { opacity: 0, y: -40 },
      visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 380, damping: 14 } },
    },
  },
};

export function AnimatedGroup({
  children,
  style,
  variants,
  preset = "fade",
  once = true,
  stagger,
  delay,
}: AnimatedGroupProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, amount: 0.12 });

  const base = presets[preset];
  const containerVariants: Variants = {
    ...(variants?.container ?? base.container),
    visible: {
      ...((variants?.container ?? base.container).visible as object),
      transition: {
        staggerChildren: stagger ?? 0.1,
        delayChildren: delay ?? 0,
      },
    },
  };
  const itemVariants = variants?.item ?? base.item;

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={containerVariants}
      style={style}
    >
      {React.Children.map(children, (child, i) => (
        <motion.div key={i} variants={itemVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
