/** Fondo "liquid glass": orbes de color que flotan detrás del contenido. */
export function LiquidBackground() {
  return (
    <div className="liquid-bg" aria-hidden>
      <span className="liquid-blob" style={{ top: "-12%", left: "-8%", background: "#0a84ff", animationDelay: "0s", animationDuration: "30s" }} />
      <span className="liquid-blob" style={{ top: "-6%", right: "-10%", background: "#bf5af2", animationDelay: "-9s", animationDuration: "38s" }} />
      <span className="liquid-blob" style={{ bottom: "-15%", left: "30%", background: "#30d158", animationDelay: "-18s", animationDuration: "34s" }} />
    </div>
  );
}
