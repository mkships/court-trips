import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin | Court Trips", robots: { index: false, follow: false } };

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-mist">{children}</div>;
}
