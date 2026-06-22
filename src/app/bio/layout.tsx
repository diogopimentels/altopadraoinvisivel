export default function BioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--color-bio-bg)] text-[var(--color-bio-text)] font-inter min-h-screen flex flex-col items-center justify-center">
      <main className="w-full max-w-md mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
