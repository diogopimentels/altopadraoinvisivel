"use client";

import { useState } from "react";
import Link from "next/link";
import { CaretDown, WhatsappLogo, EnvelopeSimple } from "@phosphor-icons/react";

interface ContactExpandableButtonProps {
  label: string;
}

export function ContactExpandableButton({ label }: ContactExpandableButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2 w-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full p-4 border border-[var(--color-bio-border)] rounded-sm bg-transparent hover:bg-[var(--color-bio-surface)] transition-colors duration-300 group"
      >
        <span className="text-lg tracking-wide text-[var(--color-bio-text)] group-hover:text-[var(--color-bio-accent)] transition-colors duration-300">
          {label}
        </span>
        <CaretDown
          size={20}
          weight="bold"
          className="text-[var(--color-bio-muted)] transition-transform duration-300"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {isOpen && (
        <div className="flex flex-col gap-2 pl-4 pr-4 py-2 w-full animate-in slide-in-from-top-2 fade-in duration-300">
          <Link
            href="https://wa.me/5511999999999" // TODO: Coloque o número correto
            target="_blank"
            className="flex items-center gap-3 w-full p-3 border border-[var(--color-bio-border)] border-opacity-50 rounded-sm bg-[var(--color-bio-surface)] hover:border-[var(--color-bio-accent)] transition-colors duration-300 group"
          >
            <WhatsappLogo size={24} weight="fill" className="text-[var(--color-bio-muted)] group-hover:text-[var(--color-bio-accent)] transition-colors" />
            <span className="text-base text-[var(--color-bio-text)] group-hover:text-[var(--color-bio-accent)] transition-colors">
              WhatsApp
            </span>
          </Link>
          <Link
            href="mailto:contato@altopadraoinvisivel.com.br" // TODO: Coloque o email correto
            className="flex items-center gap-3 w-full p-3 border border-[var(--color-bio-border)] border-opacity-50 rounded-sm bg-[var(--color-bio-surface)] hover:border-[var(--color-bio-accent)] transition-colors duration-300 group"
          >
            <EnvelopeSimple size={24} weight="fill" className="text-[var(--color-bio-muted)] group-hover:text-[var(--color-bio-accent)] transition-colors" />
            <span className="text-base text-[var(--color-bio-text)] group-hover:text-[var(--color-bio-accent)] transition-colors">
              E-mail
            </span>
          </Link>
        </div>
      )}
    </div>
  );
}
