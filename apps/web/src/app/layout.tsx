import type { ReactNode } from "react";
import AuthInit from "@/core/providers/AuthInit";
import Providers from "@/core/providers/Providers";
import "./globals.css";

export const metadata = {
  title: "Casemove Web",
  description: "Casemove Web UI",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html data-theme="dark" lang="en" suppressHydrationWarning>
      <body className="font-sans">
        <Providers>
          <AuthInit />
          {children}
        </Providers>
      </body>
    </html>
  );
}
