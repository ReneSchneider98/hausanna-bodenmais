/** Wellenförmiger Übergang oben im Footer (eigener, nachempfundener Pfad). */
export function WaveDivider() {
  return (
    <svg className="wave" viewBox="0 0 1280 140" preserveAspectRatio="none" aria-hidden="true">
      <path
        fill="var(--c-bg)"
        d="M0 0h1280v72c-140 30-300 36-460 22C620 76 460 22 300 26 170 29 80 50 0 70z"
      />
    </svg>
  );
}
