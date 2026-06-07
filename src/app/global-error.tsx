"use client";

// Vangt fouten op rootniveau (buiten de layout). Heeft geen toegang tot
// providers, dus tekst is bewust eenvoudig gehouden.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="nl">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#0a0c11",
          color: "#eceef2",
          textAlign: "center",
          padding: "1rem",
        }}
      >
        <div>
          <div style={{ fontSize: "2rem" }}>⚠️</div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, marginTop: ".5rem" }}>
            Er ging iets mis
          </h1>
          <p style={{ color: "#97a0b2", marginTop: ".25rem" }}>
            Probeer het opnieuw.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "1.25rem",
              background: "#6366f1",
              color: "#fff",
              border: 0,
              borderRadius: 12,
              padding: ".6rem 1.25rem",
              fontWeight: 600,
            }}
          >
            Opnieuw
          </button>
        </div>
      </body>
    </html>
  );
}
