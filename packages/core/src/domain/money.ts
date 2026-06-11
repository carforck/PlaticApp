/**
 * Money — value object inmutable.
 * Guarda el monto en la unidad MENOR (centavos) para evitar errores de
 * punto flotante. Para COP la unidad menor son pesos enteros (sin decimales),
 * pero mantenemos `minorUnits` por si se agregan monedas con decimales.
 */
export class Money {
  private constructor(
    public readonly minorUnits: number,
    public readonly currency: string,
  ) {}

  static of(amount: number, currency: string): Money {
    if (!Number.isFinite(amount)) throw new Error("Monto inválido");
    return new Money(Math.round(amount), currency.toUpperCase());
  }

  /** Crea desde una cantidad "humana" (ej. 50000 pesos -> 50000 minorUnits en COP). */
  static fromMajor(amount: number, currency: string, decimals = 0): Money {
    return Money.of(amount * 10 ** decimals, currency);
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.minorUnits + other.minorUnits, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.minorUnits - other.minorUnits, this.currency);
  }

  negate(): Money {
    return new Money(-this.minorUnits, this.currency);
  }

  get isZero(): boolean {
    return this.minorUnits === 0;
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(`Monedas distintas: ${this.currency} vs ${other.currency}`);
    }
  }
}
