"use client";
import { Modal } from "@/components/ui/Modal";
import { T, BS } from "@/components/ui/tokens";

const SECTIONS = [
  {
    title: "Pas de conseil financier",
    icon: "⚖️",
    color: T.amber,
    bg: T.amberBg,
    body: "PUR est un outil d'information et d'analyse. Les scores, ratios et toute autre donnée présentée ne constituent en aucun cas des conseils en investissement, des recommandations d'achat ou de vente, ni des conseils fiscaux ou juridiques. Toute décision d'investissement vous appartient entièrement et relève de votre seule responsabilité.",
  },
  {
    title: "Données indicatives",
    icon: "📊",
    color: T.forest,
    bg: T.greenBg,
    body: "Les données financières (prix, ratios, scores) sont issues de sources tierces et peuvent comporter des délais, des erreurs ou des omissions. PUR ne garantit pas l'exactitude, l'exhaustivité ni la mise à jour en temps réel de ces informations. Ne prenez pas de décision uniquement sur la base des données affichées.",
  },
  {
    title: "Limites de la conformité islamique",
    icon: "🕌",
    color: T.emerald,
    bg: T.greenBg,
    body: "Les scores de conformité sont calculés selon les standards AAOIFI à titre indicatif. Ils ne constituent pas une fatwa ni un avis religieux contraignant. Les opinions des savants peuvent diverger. Consultez un érudit qualifié ou un conseiller en finance islamique pour votre situation personnelle.",
  },
  {
    title: "Calcul Zakat",
    icon: "🧮",
    color: T.amber,
    bg: T.amberBg,
    body: "Le calcul de la Zakat proposé par PUR est une estimation simplifiée basée sur la valeur du portefeuille. Il ne tient pas compte de tous les facteurs personnels (dettes, or, liquidités hors-portefeuille, nisab précis). Consultez un spécialiste pour un calcul exact.",
  },
  {
    title: "Limitation de responsabilité",
    icon: "🛡️",
    color: T.red,
    bg: "#FCEBEB",
    body: "PUR et ses opérateurs ne sauraient être tenus responsables de toute perte financière directe ou indirecte résultant de l'utilisation de l'application. L'investissement en bourse comporte des risques de perte en capital. Les performances passées ne préjugent pas des performances futures.",
  },
];

export function LegalModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal onClose={onClose}>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: T.text, marginBottom: 4 }}>Mentions légales</h2>
      <p style={{ fontSize: 12, color: T.textMuted, marginBottom: 20 }}>Dernière mise à jour : avril 2026</p>
      {SECTIONS.map((s, i) => (
        <div key={i} style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{s.icon}</div>
            <p style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.title}</p>
          </div>
          <p style={{ fontSize: 12, color: T.textSub, lineHeight: 1.75, paddingLeft: 36 }}>{s.body}</p>
        </div>
      ))}
      <div style={{ height: 1, background: T.border, margin: "16px 0" }} />
      <p style={{ fontSize: 11, color: T.textMuted, lineHeight: 1.7, marginBottom: 20 }}>
        En utilisant PUR, vous acceptez ces conditions. Pour toute question : <strong style={{ color: T.text }}>support@pur.app</strong>
      </p>
      <button style={BS.btnPrimary} onClick={onClose}>Fermer</button>
    </Modal>
  );
}
