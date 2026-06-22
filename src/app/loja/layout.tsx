import { StoreHeader } from "@/components/loja/StoreHeader";
import { CartDrawer } from "@/components/loja/CartDrawer";

export default function LojaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--color-loja-bg)] text-[var(--color-loja-text)] font-inter min-h-screen relative">
      <StoreHeader />
      <main className="w-full max-w-md mx-auto px-4 py-6">
        {children}
      </main>
      <CartDrawer />
    </div>
  );
}
