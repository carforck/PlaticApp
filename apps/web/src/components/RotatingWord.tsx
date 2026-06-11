"use client";

import { useEffect, useState } from "react";

/** Palabra que rota con un fundido, para titulares dinámicos. */
export function RotatingWord({ words, className = "" }: { words: string[]; className?: string }) {
  const [i, setI] = useState(0);
  const [show, setShow] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setShow(false);
      setTimeout(() => {
        setI((p) => (p + 1) % words.length);
        setShow(true);
      }, 250);
    }, 2200);
    return () => clearInterval(id);
  }, [words.length]);

  return (
    <span
      className={`inline-block bg-gradient-to-r from-[#0a84ff] to-[#bf5af2] bg-clip-text text-transparent transition-all duration-250 ${
        show ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
      } ${className}`}
    >
      {words[i]}
    </span>
  );
}
