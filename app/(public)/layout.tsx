import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { PricingProvider } from "@/components/shared/PricingProvider";
import { Tracker } from "@/components/shared/Tracker";
import { getPricing, getPublicRating } from "@/lib/pricing-config";

// Static pages regenerate at most once a minute, so a price change in Settings reaches the site quickly.
export const revalidate = 60;

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [pricing, rating] = await Promise.all([getPricing(), getPublicRating()]);
  return (
    <PricingProvider value={{ pricing, rating }}>
      <Tracker />
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </PricingProvider>
  );
}
