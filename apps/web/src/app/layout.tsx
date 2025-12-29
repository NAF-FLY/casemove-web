import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Casemove Web",
  description: "Casemove Web UI",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
