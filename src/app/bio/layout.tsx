export default function BioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen font-inter flex flex-col items-center justify-center bg-[#050505] text-[var(--color-bio-text)] selection:bg-[var(--color-bio-accent)] selection:text-white">
      {/* Efeito de background minimalista com luzes de baixa opacidade */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] max-w-[500px] max-h-[500px] bg-[var(--color-bio-accent)] opacity-[0.04] blur-[100px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[80vw] h-[80vw] max-w-[600px] max-h-[600px] bg-white opacity-[0.02] blur-[120px] rounded-full" />
      </div>

      <main className="relative z-10 w-full max-w-md mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
