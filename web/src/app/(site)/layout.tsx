import { CurrencyProvider } from "@/components/Currency";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getRates } from "@/lib/currency";

// The public site's shell: every page gets the same header and footer, and prices can be shown
// in the visitor's currency. Admin has its own (src/app/admin).
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const rates = await getRates();
  return (
    <CurrencyProvider rates={rates}>
      <div className="on-paper">
        <Header />
        {children}
        <Footer />
      </div>
    </CurrencyProvider>
  );
}
