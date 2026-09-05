/**
 * El concepte del producte, dibuixat: dos comptes personals que comparteixen
 * una zona central. No és decoració — és l'explicació de com funciona l'app.
 */
export function Venn({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 340 220"
      className={className}
      role="img"
      aria-label="Dos cercles que se solapen: el teu, el compartit i el seu"
    >
      <defs>
        <clipPath id="venn-left">
          <circle cx="130" cy="110" r="82" />
        </clipPath>
      </defs>

      {/* zona compartida, subtilment omplerta */}
      <g clipPath="url(#venn-left)">
        <circle cx="210" cy="110" r="82" fill="currentColor" opacity="0.14" />
      </g>

      <circle
        cx="130"
        cy="110"
        r="82"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeDasharray="760"
        style={{ animation: "draw-in 1100ms ease-out both" }}
      />
      <circle
        cx="210"
        cy="110"
        r="82"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeDasharray="760"
        style={{ animation: "draw-in 1100ms ease-out 180ms both" }}
      />

      <g
        fill="currentColor"
        fontSize="12"
        textAnchor="middle"
        style={{ animation: "fade-up 500ms ease-out 900ms both" }}
      >
        <text x="88" y="114">El teu</text>
        <text x="170" y="114" opacity="0.75">Compartit</text>
        <text x="252" y="114">El seu</text>
      </g>
    </svg>
  );
}
