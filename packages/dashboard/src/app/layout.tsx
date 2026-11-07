import type { Metadata } from "next";
import "./globals.css";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

export const metadata: Metadata = {
  title: "GuardPay — Autonomous AI Agent Telemetry & PayPal Gateway",
  description: "Policy-Bound Autonomous AI Agent Wallets with PayPal Developer Platform & AG Grid",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0a0e17] text-slate-100 antialiased selection:bg-paypal-light selection:text-white">
        {children}
      </body>
    </html>
  );
}
