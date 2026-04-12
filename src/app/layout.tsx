import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HalalScreen — Finance islamique · Critères AAOIFI",
  description: "Vérifiez la conformité halal de vos actions selon les critères AAOIFI.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
