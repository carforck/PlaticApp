"use client";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"]; // semana inicia lunes

export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Calendario mensual reutilizable. `renderDay` decide qué se ve en cada día. */
export function MonthCalendar({
  month,
  onMonthChange,
  renderDay,
}: {
  month: Date; // primer día del mes mostrado
  onMonthChange: (d: Date) => void;
  renderDay: (date: Date) => React.ReactNode;
}) {
  const year = month.getFullYear();
  const m = month.getMonth();
  const first = new Date(year, m, 1);
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7; // lunes = 0
  const todayKey = dayKey(new Date());

  const cells: (Date | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, m, d));
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="glass rounded-[var(--radius-card)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => onMonthChange(new Date(year, m - 1, 1))} className="grid h-8 w-8 place-items-center rounded-[8px] hover:bg-black/5" aria-label="Mes anterior">‹</button>
        <span className="text-[15px] font-semibold">{MONTHS[m]} {year}</span>
        <button onClick={() => onMonthChange(new Date(year, m + 1, 1))} className="grid h-8 w-8 place-items-center rounded-[8px] hover:bg-black/5" aria-label="Mes siguiente">›</button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-[var(--color-ink-soft)]">
        {WEEKDAYS.map((w, i) => (
          <div key={i}>{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => (
          <div
            key={i}
            className={`min-h-[58px] rounded-[10px] p-1.5 text-[11px] ${
              date ? "bg-black/[0.03]" : ""
            } ${date && dayKey(date) === todayKey ? "ring-1 ring-[var(--color-accent)]" : ""}`}
          >
            {date && (
              <>
                <div className="mb-0.5 text-right text-[11px] text-[var(--color-ink-soft)]">{date.getDate()}</div>
                {renderDay(date)}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
