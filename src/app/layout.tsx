import type { Metadata } from "next";
import "./globals.css";
import { Shell } from "@/components/shell";
import { Toaster } from "@/components/toaster";

export const metadata: Metadata = {
  title: "Aerchain QuoteLens",
  description: "RSG Herbal House on Aerchain QuoteLens: draft requests, read any supplier reply, compare and decide.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Shell>{children}</Shell>
        <Toaster />
      </body>
    </html>
  );
}
