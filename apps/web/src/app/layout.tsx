import type { ReactNode } from "react";
import AuthInit from "./AuthInit";
import Providers from "./Providers";
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
