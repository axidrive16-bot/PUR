"use client";
import React, { useRef } from "react";
import { useScroll, useTransform, motion, MotionValue } from "framer-motion";

export const ContainerScroll = ({
  titleComponent,
  children,
}: {
  titleComponent: React.ReactNode;
  children: React.ReactNode;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const scaleDimensions = () => (isMobile ? [0.7, 0.9] : [1.05, 1]);
  const rotate    = useTransform(scrollYProgress, [0, 1], [18, 0]);
  const scale     = useTransform(scrollYProgress, [0, 1], scaleDimensions());
  const translate = useTransform(scrollYProgress, [0, 1], [0, -80]);

  return (
    <div
      ref={containerRef}
      style={{
        height: isMobile ? "60rem" : "76rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? "8px" : "80px 80px 0",
        position: "relative",
      }}
    >
      <div style={{ paddingTop: isMobile ? 40 : 120, paddingBottom: isMobile ? 40 : 120, width: "100%", position: "relative", perspective: "1000px" }}>
        <HeroHeader translate={translate} titleComponent={titleComponent} />
        <HeroCard rotate={rotate} translate={translate} scale={scale}>{children}</HeroCard>
      </div>
    </div>
  );
};

export const HeroHeader = ({ translate, titleComponent }: { translate: MotionValue<number>; titleComponent: React.ReactNode }) => (
  <motion.div style={{ translateY: translate, maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
    {titleComponent}
  </motion.div>
);

export const HeroCard = ({
  rotate, scale, children,
}: {
  rotate: MotionValue<number>;
  scale: MotionValue<number>;
  translate: MotionValue<number>;
  children: React.ReactNode;
}) => (
  <motion.div
    style={{
      rotateX: rotate,
      scale,
      boxShadow: "0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a",
      maxWidth: 1100,
      margin: "-48px auto 0",
      height: "clamp(400px, 55vw, 640px)",
      width: "100%",
      border: "3px solid rgba(255,255,255,0.12)",
      padding: 6,
      background: "#0F1E14",
      borderRadius: 28,
    }}
  >
    <div style={{ height: "100%", width: "100%", overflow: "hidden", borderRadius: 22, background: "#F8F6F1" }}>
      {children}
    </div>
  </motion.div>
);
