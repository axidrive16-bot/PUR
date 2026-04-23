import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PUR — Conformité AAOIFI · Investissement éthique",
  description: "Vérifiez la conformité de vos actions et ETF selon les critères AAOIFI avec PUR.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
