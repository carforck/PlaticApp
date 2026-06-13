"use client";

/**
 * Campo de monto que muestra separadores de miles mientras escribes (ej. 1.500.000),
 * para confirmar la cantidad antes de guardar. Guarda el valor como string de dígitos.
 */
export function MoneyInput({
  value,
  onChange,
  className = "",
  placeholder,
  autoFocus,
  required,
}: {
  value: string;
  onChange: (digits: string) => void;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
  required?: boolean;
}) {
  const digits = (value ?? "").replace(/\D/g, "");
  const display = digits ? Number(digits).toLocaleString("es-CO") : "";
  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      autoFocus={autoFocus}
      required={required}
      value={display}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
      placeholder={placeholder}
      className={className}
    />
  );
}
