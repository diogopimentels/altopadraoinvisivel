import Image from "next/image";
import { BioLinkButton } from "@/components/bio/BioLinkButton";
import { ContactExpandableButton } from "@/components/bio/ContactExpandableButton";
import { FeaturedProduct } from "@/components/bio/FeaturedProduct";
import { Storefront } from "@phosphor-icons/react/dist/ssr";

export default function BioPage() {
  // Configuração inteligente para o link da Loja (funciona no dev local e em produção)
  const lojaUrl =
    process.env.NODE_ENV === "development"
      ? "http://loja.localhost:3000"
      : "https://loja.altopadraoinvisivel.com.br";

  return (
    <div className="flex flex-col items-center gap-8 w-full">
      {/* Profile Header */}
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-24 h-24 rounded-full overflow-hidden bg-[var(--color-bio-surface)] border border-[var(--color-bio-border)] relative">
          <Image
            src="/foto.jpeg"
            alt="Caio"
            fill
            className="object-cover"
            priority
          />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-wide">Alto Padrão Invisível</h1>
          <p className="text-sm text-[var(--color-bio-muted)] mt-1">Elegância e Autoridade</p>
        </div>
      </div>

      <FeaturedProduct />

      {/* Links List */}
      <div className="flex flex-col gap-4 w-full">
        <BioLinkButton 
          href={lojaUrl} 
          label="Acessar Loja" 
          icon={<Storefront size={20} />} 
        />
        <ContactExpandableButton label="Contato/Parcerias" />
      </div>
    </div>
  );
}
