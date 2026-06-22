import { StoreHeader } from "@/components/loja/StoreHeader";
import { CartDrawer } from "@/components/loja/CartDrawer";

export default function LojaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen font-inter flex flex-col bg-[#FDFDFD] text-[var(--color-loja-text)] selection:bg-[var(--color-loja-cta)] selection:text-white">
      {/* Efeito de background minimalista claro com luzes de baixa opacidade */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] max-w-[500px] max-h-[500px] bg-gray-300 opacity-[0.25] blur-[100px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[80vw] h-[80vw] max-w-[600px] max-h-[600px] bg-[#EAEAEA] opacity-[0.4] blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 w-full flex flex-col flex-1">
        <StoreHeader />
        <main className="w-full max-w-md mx-auto px-4 py-6 flex-1">
          {children}
        </main>
      </div>
      <CartDrawer />
    </div>
  );
}
