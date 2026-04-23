"use client";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

// ── Design tokens (mirrored from LandingPage) ─────────────────────────
const C = {
  forest: "#1A3A2A", forestDark: "#112618", forestMid: "#243F2F",
  emerald: "#208640", leaf: "#4A8C35",
  gold: "#C9A84C",
  text: "#0E1A12", textSub: "#48534C", textMuted: "#8A9490",
  greenBg: "#EAF3DE",
};

// ── App Store SVG ─────────────────────────────────────────────────────
function AppleIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 20.5v-17c0-.83.94-1.3 1.6-.8l14 8.5c.6.36.6 1.24 0 1.6l-14 8.5c-.66.5-1.6.03-1.6-.8z" />
    </svg>
  );
}

// ── Animated rolling word ─────────────────────────────────────────────
interface AnimatedHeroProps {
  onAppStore?: () => void;
  onPlayStore?: () => void;
  onScrollToDemo?: () => void;
}

export function AnimatedHero({ onAppStore, onPlayStore, onScrollToDemo }: AnimatedHeroProps) {
  const [titleNumber, setTitleNumber] = useState(0);
  const [hoveredBtn, setHoveredBtn] = useState<"apple" | "android" | "demo" | null>(null);

  const titles = useMemo(
    () => ["conforme", "certifié", "éthique", "transparent", "serein"],
    []
  );

  useEffect(() => {
    const id = setTimeout(() => {
      setTitleNumber(n => (n === titles.length - 1 ? 0 : n + 1));
    }, 2200);
    return () => clearTimeout(id);
  }, [titleNumber, titles]);

  return (
    <div style={{
      width: "100%",
      background: "transparent",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Decorative orbs — subtle atop the shader */}
      <div style={{ position: "absolute", top: -100, right: -100, width: 480, height: 480, borderRadius: "50%", background: "rgba(74,140,53,.12)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -60, left: -60, width: 300, height: 300, borderRadius: "50%", background: "rgba(201,168,76,.07)", pointerEvents: "none" }} />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 64px" }}>
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", gap: 0,
          padding: "108px 0 96px",
          position: "relative",
        }}>

          {/* Top pill */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{ marginBottom: 28 }}
          >
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 99, padding: "6px 16px",
              fontSize: 13, fontWeight: 700, color: "#A8D5A2",
              letterSpacing: ".03em",
            }}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#6BCB77" strokeWidth={2.5} strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
              Essai gratuit 14 jours · Sans carte bancaire
            </span>
          </motion.div>

          {/* Headline with rolling word */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut", delay: 0.08 }}
            style={{ textAlign: "center", marginBottom: 24 }}
          >
            <h1 style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: "clamp(42px, 6vw, 76px)",
              fontWeight: 400,
              color: "#FFFFFF",
              lineHeight: 1.06,
              letterSpacing: "-.025em",
              maxWidth: 820,
              margin: "0 auto",
            }}>
              Votre investissement<br />
              {/* Rolling word container */}
              <span style={{
                display: "inline-flex",
                position: "relative",
                width: "100%",
                justifyContent: "center",
                overflow: "hidden",
                height: "clamp(52px, 7vw, 96px)",
                verticalAlign: "bottom",
              }}>
                &nbsp;
                {titles.map((title, index) => (
                  <motion.span
                    key={index}
                    style={{
                      position: "absolute",
                      fontStyle: "italic",
                      color: "#7BE8A2",
                    }}
                    initial={{ opacity: 0, y: "100%" }}
                    transition={{ type: "spring", stiffness: 60, damping: 18 }}
                    animate={
                      titleNumber === index
                        ? { y: "0%", opacity: 1 }
                        : { y: titleNumber > index ? "-100%" : "100%", opacity: 0 }
                    }
                  >
                    {title}
                  </motion.span>
                ))}
              </span>
            </h1>
          </motion.div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut", delay: 0.18 }}
            style={{
              fontSize: "clamp(16px, 2vw, 19px)",
              color: "rgba(255,255,255,0.92)",
              lineHeight: 1.65,
              maxWidth: 560,
              textAlign: "center",
              marginBottom: 44,
            }}
          >
            Screenez vos actions et ETF selon les critères AAOIFI.<br />Score de conformité, calcul de purification et alertes directement depuis votre téléphone.
          </motion.p>

          {/* CTAs — App Store + Play Store */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.26 }}
            style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center", marginBottom: 40 }}
          >
            {/* App Store */}
            <button
              onClick={onAppStore}
              onMouseEnter={() => setHoveredBtn("apple")}
              onMouseLeave={() => setHoveredBtn(null)}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                background: hoveredBtn === "apple" ? "#1a1a1a" : "#111111",
                border: "1.5px solid rgba(255,255,255,0.18)",
                borderRadius: 16, padding: "13px 22px",
                cursor: "pointer", color: "#fff",
                transition: "all 180ms ease",
                transform: hoveredBtn === "apple" ? "translateY(-2px)" : "none",
                boxShadow: hoveredBtn === "apple" ? "0 8px 28px rgba(0,0,0,0.4)" : "0 2px 10px rgba(0,0,0,0.3)",
              }}
            >
              <AppleIcon />
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", lineHeight: 1.2 }}>Télécharger sur</div>
                <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>App Store</div>
              </div>
            </button>

            {/* Google Play */}
            <button
              onClick={onPlayStore}
              onMouseEnter={() => setHoveredBtn("android")}
              onMouseLeave={() => setHoveredBtn(null)}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                background: hoveredBtn === "android" ? "#1a1a1a" : "#111111",
                border: "1.5px solid rgba(255,255,255,0.18)",
                borderRadius: 16, padding: "13px 22px",
                cursor: "pointer", color: "#fff",
                transition: "all 180ms ease",
                transform: hoveredBtn === "android" ? "translateY(-2px)" : "none",
                boxShadow: hoveredBtn === "android" ? "0 8px 28px rgba(0,0,0,0.4)" : "0 2px 10px rgba(0,0,0,0.3)",
              }}
            >
              <PlayIcon />
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", lineHeight: 1.2 }}>Disponible sur</div>
                <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>Google Play</div>
              </div>
            </button>

            {/* Web app link */}
            <button
              onClick={onScrollToDemo}
              onMouseEnter={() => setHoveredBtn("demo")}
              onMouseLeave={() => setHoveredBtn(null)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                background: hoveredBtn === "demo" ? "rgba(255,255,255,0.13)" : "rgba(255,255,255,0.07)",
                border: "1.5px solid rgba(255,255,255,0.18)",
                borderRadius: 16, padding: "13px 22px",
                cursor: "pointer", color: "#fff", fontWeight: 600, fontSize: 15,
                transition: "all 180ms ease",
                transform: hoveredBtn === "demo" ? "translateY(-2px)" : "none",
              }}
            >
              Voir la démo
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><line x1={5} y1={12} x2={19} y2={12} /><polyline points="12 5 19 12 12 19" /></svg>
            </button>
          </motion.div>

          {/* Social proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.38 }}
            style={{ display: "flex", alignItems: "center", gap: 16 }}
          >
            <div style={{ display: "flex" }}>
              {["#4A8840", "#5A9850", "#3C7035", "#6AAA60"].map((bg, i) => (
                <div key={i} style={{
                  width: 30, height: 30, borderRadius: 99,
                  background: bg, border: "2px solid rgba(255,255,255,0.13)",
                  marginLeft: i ? -8 : 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 800, color: "#fff",
                }}>{["Y", "A", "O", "S"][i]}</div>
              ))}
            </div>
            <div>
              <div style={{ display: "flex", gap: 2 }}>
                {Array(5).fill(0).map((_, i) => (
                  <svg key={i} width={13} height={13} viewBox="0 0 24 24" fill={C.gold} stroke={C.gold} strokeWidth={1}>
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                ))}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>
                4,9/5 · 2 400+ actions analysées
              </div>
            </div>
          </motion.div>

        </div>
      </div>

      {/* Bottom fade to match next section */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, background: "linear-gradient(to bottom, transparent, rgba(17,38,24,0.6))", pointerEvents: "none" }} />
    </div>
  );
}
