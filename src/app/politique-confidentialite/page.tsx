"use client";
import { useRouter } from "next/navigation";

const C = {
  bg: "#F8F6F1", surface: "#FFFFFF", surface2: "#F2F0EB",
  border: "rgba(0,0,0,0.07)", borderMid: "rgba(0,0,0,0.13)",
  forest: "#1A3A2A", forestDark: "#112618",
  emerald: "#208640",
  text: "#0E1A12", textSub: "#48534C", textMuted: "#8A9490",
  greenBg: "#EAF3DE",
};

const CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Cabinet Grotesk',system-ui,sans-serif;background:${C.bg};color:${C.text}}
  button{font-family:inherit;cursor:pointer}
  h1{font-family:'DM Serif Display',serif;font-size:clamp(32px,5vw,52px);font-weight:400;color:${C.text};line-height:1.15;margin-bottom:16px}
  h2{font-family:'DM Serif Display',serif;font-size:clamp(20px,2.5vw,28px);font-weight:400;color:${C.text};margin:40px 0 14px}
  h3{font-size:16px;font-weight:700;color:${C.text};margin:24px 0 8px}
  p{font-size:15px;color:${C.textSub};line-height:1.75;margin-bottom:14px}
  ul{padding-left:20px;margin-bottom:14px}
  ul li{font-size:15px;color:${C.textSub};line-height:1.75;margin-bottom:6px}
  a{color:${C.emerald};text-decoration:none}
  a:hover{text-decoration:underline}
  table{width:100%;border-collapse:collapse;margin-bottom:20px;font-size:14px}
  th{background:${C.greenBg};color:${C.forest};padding:10px 14px;text-align:left;font-weight:700;border:1px solid ${C.border}}
  td{padding:10px 14px;border:1px solid ${C.border};color:${C.textSub};vertical-align:top}
  @media(max-width:768px){.wrap{padding:0 20px!important}}
`;

export default function PolitiqueConfidentialite() {
  const router = useRouter();
  const updated = "18 avril 2026";

  return (
    <>
      <style>{CSS}</style>

      {/* Navbar */}
      <header style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(248,246,241,0.96)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderBottom: `1px solid ${C.border}` }}>
        <div className="wrap" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 64px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span onClick={() => router.push("/")} style={{ fontWeight: 900, fontSize: 20, color: C.forest, letterSpacing: "-.02em", cursor: "pointer" }}>PUR</span>
          <button onClick={() => router.push("/")} style={{ background: C.surface2, border: `1.5px solid ${C.borderMid}`, borderRadius: 12, padding: "10px 18px", fontWeight: 700, fontSize: 14, color: C.text }}>
            ← Retour
          </button>
        </div>
      </header>

      {/* Hero */}
      <div style={{ background: `linear-gradient(160deg,${C.forestDark},${C.forest})`, padding: "72px 64px 56px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(168,213,162,0.8)", marginBottom: 12 }}>Légal · RGPD</p>
          <h1 style={{ color: "#fff", marginBottom: 12 }}>Politique de confidentialité</h1>
          <p style={{ color: "rgba(255,255,255,0.55)", marginBottom: 0 }}>Dernière mise à jour : {updated}</p>
        </div>
      </div>

      {/* Content */}
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "64px 64px 96px" }}>

        <p>
          PUR (ci-après «&nbsp;nous&nbsp;», «&nbsp;notre&nbsp;», «&nbsp;la Société&nbsp;») attache une grande importance à la protection de vos données personnelles. La présente politique de confidentialité décrit les données que nous collectons, la manière dont nous les utilisons et les droits dont vous disposez conformément au Règlement Général sur la Protection des Données (RGPD — UE 2016/679).
        </p>
        <p>
          En utilisant l'application ou le site PUR, vous reconnaissez avoir lu et compris la présente politique.
        </p>

        <h2>1. Responsable du traitement</h2>
        <p>
          <strong>PUR</strong><br />
          Contact DPO : <a href="mailto:privacy@pur.app">privacy@pur.app</a><br />
          Pour toute demande relative à vos données, écrivez à cette adresse.
        </p>

        <h2>2. Données collectées</h2>

        <h3>2.1 Données que vous nous fournissez directement</h3>
        <ul>
          <li><strong>Compte :</strong> adresse e-mail, mot de passe (haché), prénom (optionnel).</li>
          <li><strong>Portefeuille :</strong> titres ajoutés, quantités, prix d'achat — stockés uniquement pour le fonctionnement du service.</li>
          <li><strong>Paiement :</strong> traitement délégué à Stripe. Nous ne conservons aucun numéro de carte. Seul le statut d'abonnement et l'identifiant Stripe nous sont transmis.</li>
          <li><strong>Messages :</strong> contenu de vos échanges avec notre support.</li>
        </ul>

        <h3>2.2 Données collectées automatiquement</h3>
        <ul>
          <li><strong>Logs techniques :</strong> adresse IP, type de navigateur/appareil, pages visitées, horodatage.</li>
          <li><strong>Cookies :</strong> cookies de session (authentification), cookies de préférences (langue, thème). Voir section 8.</li>
          <li><strong>Données d'usage :</strong> fonctionnalités utilisées, titres recherchés (sans identification nominative).</li>
        </ul>

        <h2>3. Finalités et bases légales</h2>

        <table>
          <thead>
            <tr><th>Finalité</th><th>Données concernées</th><th>Base légale</th></tr>
          </thead>
          <tbody>
            <tr><td>Création et gestion de votre compte</td><td>E-mail, mot de passe</td><td>Exécution du contrat (art. 6.1.b)</td></tr>
            <tr><td>Fourniture du service de screening AAOIFI</td><td>Titres recherchés, portefeuille</td><td>Exécution du contrat (art. 6.1.b)</td></tr>
            <tr><td>Traitement des paiements</td><td>Statut abonnement, ID Stripe</td><td>Exécution du contrat (art. 6.1.b)</td></tr>
            <tr><td>Envoi d'alertes de conformité</td><td>E-mail, portefeuille</td><td>Exécution du contrat (art. 6.1.b)</td></tr>
            <tr><td>Amélioration du service et analyses d'usage</td><td>Données d'usage anonymisées</td><td>Intérêt légitime (art. 6.1.f)</td></tr>
            <tr><td>E-mails transactionnels (confirmations, factures)</td><td>E-mail</td><td>Exécution du contrat (art. 6.1.b)</td></tr>
            <tr><td>E-mails marketing et nouveautés</td><td>E-mail</td><td>Consentement (art. 6.1.a)</td></tr>
            <tr><td>Sécurité et prévention de la fraude</td><td>IP, logs</td><td>Intérêt légitime (art. 6.1.f)</td></tr>
            <tr><td>Respect des obligations légales</td><td>Selon réquisition</td><td>Obligation légale (art. 6.1.c)</td></tr>
          </tbody>
        </table>

        <h2>4. Durée de conservation</h2>
        <ul>
          <li><strong>Données de compte actif :</strong> conservées pendant toute la durée de votre abonnement.</li>
          <li><strong>Après suppression du compte :</strong> données effacées sous 30 jours, sauf obligation légale contraire.</li>
          <li><strong>Données de paiement :</strong> conservées 10 ans (obligation comptable).</li>
          <li><strong>Logs techniques :</strong> 12 mois maximum.</li>
          <li><strong>Données d'usage anonymisées :</strong> conservation indéfinie (non réidentifiables).</li>
        </ul>

        <h2>5. Partage des données</h2>
        <p>Nous ne vendons jamais vos données. Nous pouvons les partager uniquement avec :</p>
        <ul>
          <li><strong>Stripe</strong> (traitement des paiements) — certifié PCI DSS niveau 1.</li>
          <li><strong>Fournisseurs de données financières</strong> — données de marché publiques ; aucune donnée personnelle transmise.</li>
          <li><strong>Hébergeur cloud</strong> (infrastructure serveur) — dans l'Union européenne.</li>
          <li><strong>Autorités compétentes</strong> — sur réquisition judiciaire uniquement.</li>
        </ul>

        <h2>6. Transferts hors UE</h2>
        <p>
          Lorsqu'un sous-traitant est établi hors de l'Espace Économique Européen, nous nous assurons qu'un mécanisme de transfert adéquat est en place (clauses contractuelles types de la Commission européenne, décision d'adéquation, etc.).
        </p>

        <h2>7. Vos droits RGPD</h2>
        <p>Vous disposez des droits suivants, que vous pouvez exercer en écrivant à <a href="mailto:privacy@pur.app">privacy@pur.app</a> :</p>
        <ul>
          <li><strong>Droit d'accès (art. 15) :</strong> obtenir une copie de vos données personnelles.</li>
          <li><strong>Droit de rectification (art. 16) :</strong> corriger des données inexactes.</li>
          <li><strong>Droit à l'effacement (art. 17) :</strong> demander la suppression de vos données («&nbsp;droit à l'oubli&nbsp;»).</li>
          <li><strong>Droit à la limitation (art. 18) :</strong> suspendre temporairement le traitement.</li>
          <li><strong>Droit à la portabilité (art. 20) :</strong> recevoir vos données dans un format structuré et lisible par machine.</li>
          <li><strong>Droit d'opposition (art. 21) :</strong> vous opposer au traitement fondé sur l'intérêt légitime ou à des fins marketing.</li>
          <li><strong>Retrait du consentement :</strong> à tout moment, sans effet rétroactif, pour les traitements fondés sur votre consentement.</li>
        </ul>
        <p>
          Nous répondrons dans un délai d'un mois. En cas de litige non résolu, vous pouvez déposer une plainte auprès de la <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">CNIL</a> (Commission Nationale de l'Informatique et des Libertés).
        </p>

        <h2>8. Cookies</h2>
        <table>
          <thead>
            <tr><th>Cookie</th><th>Type</th><th>Durée</th><th>Finalité</th></tr>
          </thead>
          <tbody>
            <tr><td>session_token</td><td>Strictement nécessaire</td><td>Session</td><td>Authentification sécurisée</td></tr>
            <tr><td>csrf_token</td><td>Strictement nécessaire</td><td>Session</td><td>Protection contre les attaques CSRF</td></tr>
            <tr><td>pur_prefs</td><td>Préférence</td><td>12 mois</td><td>Thème, langue, paramètres d'affichage</td></tr>
            <tr><td>_stripe_mid</td><td>Paiement (tiers)</td><td>12 mois</td><td>Détection de fraude Stripe</td></tr>
          </tbody>
        </table>
        <p>
          Nous n'utilisons pas de cookies publicitaires ou de tracking inter-sites. Vous pouvez gérer vos préférences de cookies via les paramètres de votre navigateur.
        </p>

        <h2>9. Sécurité</h2>
        <p>
          Nous mettons en œuvre des mesures techniques et organisationnelles adaptées pour protéger vos données : chiffrement HTTPS (TLS 1.3), hachage des mots de passe (bcrypt), accès restreint aux données de production, sauvegardes chiffrées.
        </p>
        <p>
          En cas de violation de données susceptible d'engendrer un risque élevé pour vos droits, vous serez notifié dans les meilleurs délais conformément à l'art. 34 du RGPD.
        </p>

        <h2>10. Mineurs</h2>
        <p>
          PUR n'est pas destiné aux personnes de moins de 16 ans. Si nous apprenons qu'un mineur nous a fourni des données sans consentement parental, nous les supprimerons dans les plus brefs délais.
        </p>

        <h2>11. Modifications</h2>
        <p>
          Nous pouvons mettre à jour cette politique. En cas de modification substantielle, vous en serez informé par e-mail ou via une notification dans l'application. La date de mise à jour est indiquée en tête de document.
        </p>

        <h2>12. Contact</h2>
        <p>
          Pour toute question relative à cette politique ou à vos données personnelles :<br />
          <strong>DPO PUR</strong> · <a href="mailto:privacy@pur.app">privacy@pur.app</a>
        </p>

        <div style={{ marginTop: 48, padding: "24px 24px", background: C.greenBg, borderRadius: 16, borderLeft: `4px solid ${C.emerald}` }}>
          <p style={{ margin: 0, fontSize: 14, color: C.forest }}>
            <strong>Notre engagement :</strong> PUR est conçu selon le principe de <em>privacy by design</em>. Nous collectons le strict minimum nécessaire au fonctionnement du service. Vos données financières (portefeuille, transactions) ne sont jamais utilisées à des fins commerciales ou publicitaires.
          </p>
        </div>

      </main>

      {/* Footer */}
      <footer style={{ background: C.forestDark, borderTop: "1px solid rgba(255,255,255,0.06)", padding: "32px 64px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <span style={{ fontWeight: 900, fontSize: 16, color: "#fff", letterSpacing: "-.02em", cursor: "pointer" }} onClick={() => router.push("/")}>PUR</span>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,.3)" }}>© {new Date().getFullYear()} PUR. Tous droits réservés.</p>
        </div>
      </footer>
    </>
  );
}
