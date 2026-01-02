import type { ReactNode } from "react";
import AuthInit from "./AuthInit";
import "./globals.css";

export const metadata = {
  title: "Casemove Web",
  description: "Casemove Web UI",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html data-theme="dark" lang="en" suppressHydrationWarning>
      <body>
        <AuthInit />
        {children}
      </body>
    </html>
  );
}
