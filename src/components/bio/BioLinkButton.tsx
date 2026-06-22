import Link from "next/link";

interface BioLinkButtonProps {
  href: string;
  label: string;
  icon?: React.ReactNode;
}

export function BioLinkButton({ href, label, icon }: BioLinkButtonProps) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between w-full p-4 border border-[var(--color-bio-border)] rounded-sm bg-transparent hover:bg-[var(--color-bio-surface)] transition-colors duration-300 group"
    >
      <span className="text-lg tracking-wide text-[var(--color-bio-text)] group-hover:text-[var(--color-bio-accent)] transition-colors duration-300">
        {label}
      </span>
      {icon && <span className="text-[var(--color-bio-muted)]">{icon}</span>}
    </Link>
  );
}
