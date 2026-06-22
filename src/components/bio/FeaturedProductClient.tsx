"use client";


import { useState, useEffect } from "react";

export function FeaturedProductClient({ data }: { data: any }) {
  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    if (data.images && data.images.length > 1) {
      const interval = setInterval(() => {
        setCurrentImage((prev) => (prev + 1) % data.images.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [data.images]);

  return (
    <div className="w-full flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex items-center gap-2 text-[var(--color-bio-accent)] text-sm font-semibold px-1 tracking-wider uppercase">
        <span>Produto Destaque</span>
      </div>
      
      <a 
        href={data.link || `${process.env.NODE_ENV === "development" ? "http://loja.localhost:3000" : "https://loja.altopadraoinvisivel.com.br"}/produto/${data.id}`}
        className="flex flex-row items-center gap-4 w-full p-2 border border-[var(--color-bio-accent)]/30 rounded-lg bg-[var(--color-bio-surface)] hover:border-[var(--color-bio-accent)] transition-all duration-500 group"
      >
        {data.images && data.images.length > 0 && (
          <div className="w-20 h-20 shrink-0 bg-gray-900 rounded-md overflow-hidden relative">
            <img 
              src={data.images[currentImage]} 
              alt={data.name} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            {data.images.length > 1 && (
              <div className="absolute bottom-1 left-0 w-full flex justify-center gap-1 z-10">
                {data.images.map((_: any, idx: number) => (
                  <div key={idx} className={`h-1 rounded-full transition-all ${currentImage === idx ? 'bg-[var(--color-bio-accent)] w-3' : 'bg-white/50 w-1'}`} />
                ))}
              </div>
            )}
          </div>
        )}
        
        <div className="flex flex-col justify-center flex-1 pr-2">
          <h3 className="font-bold text-base leading-tight text-[var(--color-bio-text)] line-clamp-2">{data.name}</h3>
          {data.price && (
            <span className="font-medium text-sm mt-1 text-[var(--color-bio-accent)]">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.price)}
            </span>
          )}
        </div>
      </a>
    </div>
  );
}
