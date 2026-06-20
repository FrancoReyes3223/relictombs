import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

/*
  ──────────────────────────────────────────────────────────────
  ARCHIVO TurtleMe — hub de descargas (v2, estructura jerárquica)
  ──────────────────────────────────────────────────────────────
  Modelo de datos pensado para escalar:

    Colección  (Soul Forged, TBATE, Artes…)
      └─ Grupo  (Volumen 1, Volumen 2, Pack invierno…)
           └─ Archivo  (EPUB, PDF, ZIP… con su driveId)

  Agregar un volumen  = sumás un objeto a "grupos".
  Agregar un archivo  = sumás un objeto a "items" de ese grupo.
  El buscador atraviesa TODO el archivo (sin acentos).

  El driveId sale de:  drive.google.com/file/d/ESTO_ES_EL_ID/view
  ──────────────────────────────────────────────────────────────
*/

/*
  ─────────────────────────────────────────────────────────────
  CONTENIDO POR IDIOMA
  Cada clave es un idioma ("es" | "en").
  Agregar archivos: sumá un objeto a "items" del grupo correcto.
  El driveId sale de: drive.google.com/file/d/ESTO_ES_EL_ID/view
  ─────────────────────────────────────────────────────────────
*/
const ARCHIVO = {
  es: [
    {
      id: "soulforged", label: "Soul Forged", color: "var(--soul)",
      grupos: [
        { id: "sf-v1", label: "Volumen 1", items: [
          { titulo: "Soul Forged — Vol. 1", sub: "Caps. 1–20 · Traducción ES", formato: "EPUB", peso: "2.4 MB", driveId: "PEGA_ID_1" },
          { titulo: "Soul Forged — Vol. 1", sub: "Caps. 1–20 · Traducción ES", formato: "PDF",  peso: "5.1 MB", driveId: "PEGA_ID_2" },
        ]},
        { id: "sf-v2", label: "Volumen 2", items: [
          { titulo: "Soul Forged — Vol. 2", sub: "Caps. 21–40 · Traducción ES", formato: "EPUB", peso: "2.7 MB", driveId: "PEGA_ID_3" },
          { titulo: "Soul Forged — Vol. 2", sub: "Caps. 21–40 · Traducción ES", formato: "PDF",  peso: "5.6 MB", driveId: "PEGA_ID_4" },
        ]},
      ],
    },
    {
      id: "tbate", label: "TBATE", color: "var(--arcane)",
      grupos: [
        { id: "tb-v1", label: "Web Serial · Vol. 1", items: [
          { titulo: "TBATE — Vol. 1", sub: "Capítulos gratuitos del autor", formato: "PDF", peso: "8.3 MB", driveId: "PEGA_ID_5" },
        ]},
        { id: "tb-v2", label: "Web Serial · Vol. 2", items: [
          { titulo: "TBATE — Vol. 2", sub: "Capítulos gratuitos del autor", formato: "PDF", peso: "9.0 MB", driveId: "PEGA_ID_6" },
        ]},
      ],
    },
    {
      id: "artes", label: "Artes", color: "var(--ember)",
      grupos: [
        { id: "ar-fan", label: "Fan art", items: [
          { titulo: "Pack de artes — Vol. 1", sub: "Fan art · con crédito a artistas", formato: "ZIP", peso: "44 MB", driveId: "PEGA_ID_7" },
        ]},
      ],
    },
    {
      id: "extras", label: "Extras", color: "var(--muted)",
      grupos: [
        { id: "ex-ref", label: "Referencia", items: [
          { titulo: "Glosario Soul Forged", sub: "Términos del universo · ES", formato: "PDF", peso: "640 KB", driveId: "PEGA_ID_8" },
          { titulo: "Línea de tiempo TBATE", sub: "Cronología de eventos", formato: "PNG", peso: "3.2 MB", driveId: "PEGA_ID_9" },
        ]},
      ],
    },
  ],
  en: [
    {
      id: "soulforged", label: "Soul Forged", color: "var(--soul)",
      grupos: [
        { id: "sf-v1", label: "Volume 1", items: [
          { titulo: "Soul Forged — Vol. 1", sub: "Chs. 1–20 · Original EN", formato: "EPUB", peso: "2.4 MB", driveId: "PEGA_ID_EN_1" },
          { titulo: "Soul Forged — Vol. 1", sub: "Chs. 1–20 · Original EN", formato: "PDF",  peso: "5.1 MB", driveId: "PEGA_ID_EN_2" },
        ]},
      ],
    },
    {
      id: "tbate", label: "TBATE", color: "var(--arcane)",
      grupos: [
        { id: "tb-v1", label: "Web Serial · Vol. 1", items: [
          { titulo: "TBATE — Vol. 1", sub: "Free chapters by the author", formato: "PDF", peso: "8.3 MB", driveId: "PEGA_ID_EN_3" },
        ]},
        { id: "tb-v2", label: "Web Serial · Vol. 2", items: [
          { titulo: "TBATE — Vol. 2", sub: "Free chapters by the author", formato: "PDF", peso: "9.0 MB", driveId: "PEGA_ID_EN_4" },
        ]},
      ],
    },
    {
      id: "art", label: "Art", color: "var(--ember)",
      grupos: [
        { id: "ar-fan", label: "Fan art", items: [
          { titulo: "Art Pack — Vol. 1", sub: "Fan art · artist credits included", formato: "ZIP", peso: "44 MB", driveId: "PEGA_ID_EN_5" },
        ]},
      ],
    },
    {
      id: "extras", label: "Extras", color: "var(--muted)",
      grupos: [
        { id: "ex-ref", label: "Reference", items: [
          { titulo: "Soul Forged Glossary", sub: "Universe terms · EN", formato: "PDF", peso: "640 KB", driveId: "PEGA_ID_EN_6" },
          { titulo: "TBATE Timeline", sub: "Chronology of events", formato: "PNG", peso: "3.2 MB", driveId: "PEGA_ID_EN_7" },
        ]},
      ],
    },
  ],
};

const urlDescarga = (id) => `https://drive.google.com/uc?export=download&id=${id}`;
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const contarColeccion = (c) => c.grupos.reduce((n, g) => n + g.items.length, 0);

function Overlays() {
  return (
    <svg
      style={{ position:'fixed', inset:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:0 }}
      viewBox="0 0 1000 1000"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <filter id="wisp" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <radialGradient id="soul-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="1"   />
          <stop offset="50%"  stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0"   />
        </radialGradient>
        <filter id="eth-glow" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="2.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Hilos de Fate — curvos y dorados */}
      <path d="M 0 180 C 250 80 750 220 1000 40"     fill="none" stroke="rgba(240,205,75,0.22)" strokeWidth="0.9" strokeLinecap="round" />
      <path d="M 0 720 C 120 480 380 200 650 0"      fill="none" stroke="rgba(240,205,75,0.18)" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M 350 1000 C 450 800 700 550 1000 280" fill="none" stroke="rgba(240,205,75,0.20)" strokeWidth="0.9" strokeLinecap="round" />
      <path d="M 100 450 C 350 300 550 700 900 850"   fill="none" stroke="rgba(240,205,75,0.14)" strokeWidth="0.7" strokeLinecap="round" />
      <path d="M 550 0 C 700 200 750 450 1000 600"    fill="none" stroke="rgba(240,205,75,0.15)" strokeWidth="0.7" strokeLinecap="round" />
      <path d="M 0 350 C 70 300 160 240 250 200"      fill="none" stroke="rgba(240,205,75,0.26)" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M 750 800 C 840 760 930 720 1000 680"  fill="none" stroke="rgba(240,205,75,0.24)" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M 400 520 C 500 460 600 420 720 370"   fill="none" stroke="rgba(240,205,75,0.16)" strokeWidth="0.6" strokeLinecap="round" />

      {/* Volutas de alma — Soul Forged, esferas blancas con atenuación */}
      <circle cx="300" cy="250" r="22" fill="url(#soul-grad)" opacity="0.70" className="soul-orb" style={{animationDelay:'0s'}}    filter="url(#wisp)" />
      <circle cx="680" cy="550" r="19" fill="url(#soul-grad)" opacity="0.65" className="soul-orb" style={{animationDelay:'1.4s'}}  filter="url(#wisp)" />
      <circle cx="150" cy="700" r="17" fill="url(#soul-grad)" opacity="0.60" className="soul-orb" style={{animationDelay:'2.6s'}}  filter="url(#wisp)" />
      <circle cx="850" cy="200" r="18" fill="url(#soul-grad)" opacity="0.65" className="soul-orb" style={{animationDelay:'0.7s'}}  filter="url(#wisp)" />
      <circle cx="500" cy="820" r="20" fill="url(#soul-grad)" opacity="0.60" className="soul-orb" style={{animationDelay:'3.3s'}}  filter="url(#wisp)" />

      {/* Partículas de ether — puro (púrpura) e impuro (rojizo) */}
      <g filter="url(#eth-glow)">
        <circle cx="120" cy="80"  r="2.0" fill="rgba(180,130,255,0.95)" className="eth-p" style={{animationDelay:'0s'}}   />
        <circle cx="380" cy="155" r="1.6" fill="rgba(200,160,255,0.85)" className="eth-p" style={{animationDelay:'1.2s'}} />
        <circle cx="720" cy="65"  r="2.2" fill="rgba(160,100,240,0.90)" className="eth-p" style={{animationDelay:'2.5s'}} />
        <circle cx="920" cy="310" r="1.7" fill="rgba(200,160,255,0.80)" className="eth-p" style={{animationDelay:'0.8s'}} />
        <circle cx="60"  cy="460" r="2.0" fill="rgba(160,100,240,0.85)" className="eth-p" style={{animationDelay:'3.1s'}} />
        <circle cx="840" cy="510" r="2.2" fill="rgba(180,130,255,0.90)" className="eth-p" style={{animationDelay:'0.4s'}} />
        <circle cx="650" cy="710" r="1.8" fill="rgba(160,100,240,0.85)" className="eth-p" style={{animationDelay:'1.5s'}} />
        <circle cx="30"  cy="810" r="1.7" fill="rgba(200,160,255,0.80)" className="eth-p" style={{animationDelay:'3.8s'}} />
        <circle cx="960" cy="730" r="2.0" fill="rgba(160,100,240,0.88)" className="eth-p" style={{animationDelay:'0.6s'}} />
        <circle cx="770" cy="925" r="2.1" fill="rgba(180,130,255,0.85)" className="eth-p" style={{animationDelay:'1.0s'}} />
        <circle cx="300" cy="955" r="1.8" fill="rgba(200,160,255,0.80)" className="eth-p" style={{animationDelay:'3.5s'}} />
        {/* Ether impuro — rojizo */}
        <circle cx="200" cy="610" r="1.8" fill="rgba(220,80,110,0.80)"  className="eth-p" style={{animationDelay:'2.2s'}} />
        <circle cx="550" cy="205" r="1.6" fill="rgba(210,70,100,0.75)"  className="eth-p" style={{animationDelay:'4.2s'}} />
        <circle cx="480" cy="385" r="1.5" fill="rgba(220,80,110,0.70)"  className="eth-p" style={{animationDelay:'1.8s'}} />
        <circle cx="400" cy="885" r="1.6" fill="rgba(210,70,100,0.75)"  className="eth-p" style={{animationDelay:'2.8s'}} />
      </g>
    </svg>
  );
}

function ManaCore({ color }) {
  const gid = `g-${Math.abs(color.split("").reduce((a, ch) => a + ch.charCodeAt(0), 0))}`;
  return (
    <svg className="core" viewBox="0 0 80 80" aria-hidden="true">
      <defs>
        <radialGradient id={gid} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.9" />
          <stop offset="55%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle className="core-ring" cx="40" cy="40" r="26" fill="none" stroke={color} strokeWidth="1" strokeOpacity="0.5" strokeDasharray="4 7" />
      <circle cx="40" cy="40" r="34" fill={`url(#${gid})`} />
      <circle className="core-dot" cx="40" cy="40" r="6" fill={color} />
    </svg>
  );
}

function Tarjeta({ item, color }) {
  const { t } = useTranslation();
  const placeholder = item.driveId.startsWith("PEGA_ID");
  return (
    <article className="card" style={{ "--accent": color }}>
      <div className="card-cover">
        <ManaCore color={color} />
        <span className="badge">{item.formato}</span>
      </div>
      <div className="card-body">
        <h4 className="card-title">{item.titulo}</h4>
        <p className="card-sub">{item.sub}</p>
        <div className="card-meta">
          <span className="mono">{item.formato}</span><span className="dot" /><span className="mono">{item.peso}</span>
        </div>
        <a className={`dl ${placeholder ? "dl-off" : ""}`}
           href={placeholder ? undefined : urlDescarga(item.driveId)}
           onClick={placeholder ? (e) => e.preventDefault() : undefined}
           aria-disabled={placeholder}>
          {placeholder ? t("missing_id") : t("download")}{!placeholder && <span className="dl-arrow">↓</span>}
        </a>
      </div>
    </article>
  );
}

function Grupo({ grupo, color }) {
  const [abierto, setAbierto] = useState(true);
  return (
    <section className="grupo">
      <button className="grupo-head" onClick={() => setAbierto((v) => !v)} aria-expanded={abierto}>
        <span className={`chev ${abierto ? "chev-on" : ""}`}>▸</span>
        <h3 className="grupo-title">{grupo.label}</h3>
        <span className="grupo-count mono">{grupo.items.length}</span>
      </button>
      {abierto && (
        <div className="grid">
          {grupo.items.map((item, i) => <Tarjeta key={i} item={item} color={color} />)}
        </div>
      )}
    </section>
  );
}

const DISCORD_URL = "https://discord.gg/PLACEHOLDER";

export default function ArchivoTurtleMe() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const lang = location.pathname.startsWith("/en") ? "en" : "es";
  const archivo = ARCHIVO[lang];

  useEffect(() => { i18n.changeLanguage(lang); }, [lang]);

  const changeLang = (l) => navigate(l === "en" ? "/en/" : "/");

  const [activa, setActiva] = useState("todos");
  const [q, setQ] = useState("");

  useEffect(() => {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap";
    document.head.appendChild(l);
    return () => { document.head.removeChild(l); };
  }, []);

  const buscando = q.trim().length > 0;

  // Resultados de búsqueda: aplanado con su color de colección
  const resultados = useMemo(() => {
    if (!buscando) return [];
    const nq = norm(q);
    const out = [];
    for (const col of archivo)
      for (const g of col.grupos)
        for (const it of g.items)
          if (norm(it.titulo + " " + it.sub + " " + col.label + " " + g.label).includes(nq))
            out.push({ item: it, color: col.color });
    return out;
  }, [q, buscando, archivo]);

  const coleccionesVisibles = activa === "todos" ? archivo : archivo.filter((c) => c.id === activa);

  return (
    <div className="archivo">
      <Overlays />
      <style>{CSS}</style>

      <header className="hero">
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-ring" aria-hidden="true" />
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 className="hero-title">{t("title")}</h1>
        <p className="hero-sub">
          {t("hero_sub_1")} <em>The Beginning After the End</em> {t("hero_sub_2")} <em>Soul Forged</em>.
        </p>
        <div className="hero-actions">
          <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="discord-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057c2.054 1.508 4.044 2.423 6.001 2.961a.077.077 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.201 13.201 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028c1.961-.537 3.951-1.452 6.007-2.961a.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z"/>
            </svg>
            {t("discord")}
          </a>
          <div className="lang-switch">
            <button className={lang === "es" ? "lang-on" : ""} onClick={() => changeLang("es")}>ES</button>
            <span className="lang-div" />
            <button className={lang === "en" ? "lang-on" : ""} onClick={() => changeLang("en")}>EN</button>
          </div>
        </div>
      </header>

      <div className="search-wrap">
        <span className="search-ico" aria-hidden="true">⌕</span>
        <input className="search" type="text" value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("search_placeholder")} aria-label={t("search_placeholder")} />
        {buscando && <button className="search-clear" onClick={() => setQ("")} aria-label="Limpiar">✕</button>}
      </div>

      <div className="app">
        <aside className="rail" aria-label="Colecciones">
          <button className={`rail-item ${activa === "todos" && !buscando ? "rail-on" : ""}`}
            style={{ "--accent": "var(--text)" }}
            onClick={() => { setActiva("todos"); setQ(""); }}>
            <span>{t("nav_all")}</span>
            <span className="rail-count mono">{archivo.reduce((n, c) => n + contarColeccion(c), 0)}</span>
          </button>
          {archivo.map((c) => (
            <button key={c.id}
              className={`rail-item ${activa === c.id && !buscando ? "rail-on" : ""}`}
              style={{ "--accent": c.color }}
              onClick={() => { setActiva(c.id); setQ(""); }}>
              <span className="rail-dotc" style={{ background: c.color }} />
              <span>{c.label}</span>
              <span className="rail-count mono">{contarColeccion(c)}</span>
            </button>
          ))}
        </aside>

        <main className="content">
          {buscando ? (
            <section>
              <p className="result-line">
                <span className="mono">{resultados.length}</span> {resultados.length !== 1 ? t("result_plural") : t("result_singular")} {t("result_for")} &ldquo;{q}&rdquo;
              </p>
              {resultados.length ? (
                <div className="grid">
                  {resultados.map((r, i) => <Tarjeta key={i} item={r.item} color={r.color} />)}
                </div>
              ) : (
                <div className="empty">
                  {t("empty")}
                </div>
              )}
            </section>
          ) : (
            coleccionesVisibles.map((col) => (
              <section key={col.id} className="coleccion">
                <div className="col-head">
                  <span className="col-dot" style={{ background: col.color }} />
                  <h2 className="col-title">{col.label}</h2>
                  <span className="col-count mono">{contarColeccion(col)} {t("files")}</span>
                </div>
                {col.grupos.map((g) => <Grupo key={g.id} grupo={g} color={col.color} />)}
              </section>
            ))
          )}
        </main>
      </div>

      <footer className="pie">
        <span>{t("footer")}</span>
      </footer>
    </div>
  );
}

const CSS = `
.archivo {
  --void: #070412; --void-2: #0C0820; --surface: #11102A; --surface-2: #17153A;
  --line: rgba(150,100,220,0.12);
  --soul: #5FE6CF; --ember: #F0C847; --arcane: #A06FEA;
  --text: #EDE8FB; --muted: #8878B0;
  --display: "Cormorant Garamond", Georgia, serif;
  --body: "Inter", system-ui, sans-serif;
  --mono: "JetBrains Mono", ui-monospace, monospace;
  font-family: var(--body); color: var(--text);
  background:
    /* Ether puro — fuentes etéricas dominantes (púrpura) */
    radial-gradient(ellipse 500px 400px at 20% 15%, rgba(120,60,220,0.18),  transparent 65%),
    radial-gradient(ellipse 420px 500px at 82% 22%, rgba(160,111,234,0.15), transparent 65%),
    radial-gradient(ellipse 360px 300px at 62% 72%, rgba(100,45,200,0.12),  transparent 70%),
    /* Ether impuro — manchas rojizas */
    radial-gradient(ellipse 280px 220px at  4% 62%, rgba(180,45,90,0.10),   transparent 65%),
    radial-gradient(ellipse 220px 260px at 92% 78%, rgba(160,35,80,0.08),   transparent 65%),
    radial-gradient(ellipse 180px 150px at 48% 40%, rgba(200,60,100,0.06),  transparent 65%),
    /* Cuadrícula de piedra (paredes del dungeon) */
    repeating-linear-gradient(  0deg, rgba(150,100,220,0.015) 0, rgba(150,100,220,0.015) 1px, transparent 1px, transparent 120px),
    repeating-linear-gradient( 90deg, rgba(150,100,220,0.015) 0, rgba(150,100,220,0.015) 1px, transparent 1px, transparent 120px),
    linear-gradient(170deg, #0C0820 0%, #070412 50%, #040210 100%);
  min-height: 100vh; padding: 0 clamp(16px,5vw,56px) 56px; overflow-x: hidden;
}

/* Hero */
.hero { position: relative; z-index: 1; text-align: center; padding: clamp(54px,9vw,96px) 0 clamp(26px,4vw,44px); }
.hero-glow { position:absolute; inset:-30% 0 auto 50%; transform:translateX(-50%);
  width:min(800px,95vw); height:440px;
  background:
    radial-gradient(ellipse at 50% 60%, rgba(160,111,234,0.24), transparent 55%),
    radial-gradient(ellipse at 36% 42%, rgba(180,45,90,0.10),   transparent 50%),
    radial-gradient(ellipse at 66% 38%, rgba(240,200,70,0.07),  transparent 45%);
  filter:blur(24px); pointer-events:none; animation:glowPulse 8s ease-in-out infinite; }
.hero-ring { position:absolute; top:clamp(30px,7vw,64px); left:50%; transform:translateX(-50%);
  width:clamp(200px,30vw,320px); aspect-ratio:1; border-radius:50%;
  border:1px solid rgba(160,111,234,0.22);
  box-shadow:inset 0 0 60px rgba(160,111,234,0.08), 0 0 40px rgba(160,111,234,0.07);
  pointer-events:none; }
.hero-ring::before { content:""; position:absolute; inset:20px; border-radius:50%;
  border:1px solid rgba(200,50,90,0.18);
  box-shadow:inset 0 0 30px rgba(200,50,90,0.05); }
.hero-ring::after { content:""; position:absolute; inset:8px; border-radius:50%;
  border:1px dashed rgba(160,111,234,0.30); animation:spin 40s linear infinite; }
.eyebrow { position:relative; font-family:var(--mono); font-size:11.5px; letter-spacing:0.22em;
  text-transform:uppercase; color:var(--arcane); margin:0 0 14px; opacity:0.85; }
.hero-title { position:relative; font-family:var(--display); font-weight:700;
  font-size:clamp(46px,9vw,96px); line-height:0.92; margin:0; letter-spacing:-0.01em;
  background:linear-gradient(180deg,#FFFFFF 0%,#E8D8FF 30%,#C8A0F0 65%,#9A60E0 100%);
  -webkit-background-clip:text; background-clip:text; color:transparent;
  text-shadow:0 0 60px rgba(160,111,234,0.28); }
.hero-sub { position:relative; max-width:520px; margin:18px auto 0; color:var(--muted); font-size:clamp(14px,2.2vw,17px); line-height:1.6; }
.hero-sub em { color:var(--text); font-style:italic; font-family:var(--display); font-size:1.12em; }

/* Hero actions: Discord + lang switcher */
.hero-actions { position:relative; display:flex; align-items:center; justify-content:center; gap:14px; margin-top:26px; flex-wrap:wrap; }
.discord-btn { display:inline-flex; align-items:center; gap:8px; padding:10px 20px;
  border-radius:10px; font-family:var(--body); font-size:14px; font-weight:600;
  color:#fff; background:#5865F2; text-decoration:none;
  transition:filter .2s, transform .15s; border:1px solid rgba(255,255,255,0.12); }
.discord-btn:hover { filter:brightness(1.15); transform:translateY(-2px); }
.discord-btn:active { transform:scale(.97); }
.lang-switch { display:flex; align-items:center; gap:0; background:var(--surface);
  border:1px solid var(--line); border-radius:8px; overflow:hidden; }
.lang-switch button { background:none; border:none; cursor:pointer; padding:7px 13px;
  font-family:var(--mono); font-size:12px; font-weight:500; color:var(--muted);
  transition:color .15s, background .15s; }
.lang-switch button:hover { color:var(--text); }
.lang-switch .lang-on { color:var(--arcane); background:color-mix(in srgb, var(--arcane) 12%, transparent); }
.lang-div { width:1px; height:16px; background:var(--line); }

/* Buscador */
.search-wrap { position:relative; z-index:1; max-width:560px; margin:0 auto 36px; }
.search-ico { position:absolute; left:16px; top:50%; transform:translateY(-50%); color:var(--muted); font-size:18px; }
.search { width:100%; box-sizing:border-box; padding:13px 42px 13px 44px;
  background:var(--surface); border:1px solid var(--line); border-radius:12px;
  color:var(--text); font-family:var(--body); font-size:15px; outline:none; transition:border-color .2s; }
.search::placeholder { color:var(--muted); }
.search:focus { border-color:color-mix(in srgb, var(--arcane) 55%, transparent);
  box-shadow:0 0 0 3px rgba(160,111,234,0.12); }
.search-clear { position:absolute; right:12px; top:50%; transform:translateY(-50%);
  background:none; border:none; color:var(--muted); cursor:pointer; font-size:14px; padding:4px; }
.search-clear:hover { color:var(--text); }

/* App: sidebar + contenido */
.app { display:grid; grid-template-columns:230px 1fr; gap:28px; max-width:1200px; margin:0 auto; align-items:start; position:relative; z-index:1; }
.rail { position:sticky; top:20px; display:flex; flex-direction:column; gap:4px; }
.rail-item { display:flex; align-items:center; gap:10px; width:100%; text-align:left;
  padding:10px 12px; border-radius:10px; border:1px solid transparent; background:none;
  color:var(--muted); font-family:var(--body); font-size:14px; font-weight:500; cursor:pointer; transition:all .18s; }
.rail-item:hover { background:var(--surface); color:var(--text); }
.rail-on { background:var(--surface); color:var(--text);
  border-color:color-mix(in srgb, var(--accent) 40%, transparent);
  box-shadow:inset 2px 0 0 var(--accent); }
.rail-dotc { width:8px; height:8px; border-radius:50%; flex:none; }
.rail-count { margin-left:auto; font-size:11.5px; opacity:.7; }

/* Colección */
.coleccion { margin-bottom:44px; }
.col-head { display:flex; align-items:center; gap:12px; margin:0 0 18px; padding-bottom:12px; border-bottom:1px solid var(--line); }
.col-dot { width:10px; height:10px; border-radius:50%; flex:none; box-shadow:0 0 12px currentColor; }
.col-title { font-family:var(--display); font-weight:700; font-size:30px; margin:0; }
.col-count { margin-left:auto; color:var(--muted); font-size:12px; }

/* Grupo */
.grupo { margin-bottom:22px; }
.grupo-head { display:flex; align-items:center; gap:10px; width:100%; background:none; border:none; cursor:pointer; padding:6px 0; margin-bottom:10px; color:var(--text); }
.chev { color:var(--muted); font-size:12px; transition:transform .2s; }
.chev-on { transform:rotate(90deg); }
.grupo-title { font-family:var(--body); font-weight:600; font-size:15px; letter-spacing:.01em; margin:0; }
.grupo-count { color:var(--muted); font-size:11.5px; border:1px solid var(--line); border-radius:6px; padding:1px 7px; }

/* Grilla + tarjetas */
.grid { display:grid; gap:18px; grid-template-columns:repeat(auto-fill, minmax(230px,1fr)); }
.card { background:linear-gradient(160deg,var(--surface) 0%,var(--void-2) 100%);
  border:1px solid var(--line); border-radius:16px; overflow:hidden;
  transition:transform .25s, border-color .25s, box-shadow .25s; }
.card:hover { transform:translateY(-4px);
  border-color:color-mix(in srgb,var(--accent) 55%,transparent);
  box-shadow:0 18px 40px rgba(0,0,0,.5), 0 0 32px color-mix(in srgb,var(--accent) 18%,transparent); }
.card-cover { position:relative; height:130px; display:grid; place-items:center;
  background:
    radial-gradient(110px 110px at 50% 45%, color-mix(in srgb,var(--accent) 20%,transparent), transparent 70%),
    repeating-linear-gradient( 45deg, rgba(255,255,255,.010) 0 10px, transparent 10px 20px),
    repeating-linear-gradient(-45deg, rgba(255,255,255,.008) 0 10px, transparent 10px 20px);
  border-bottom:1px solid var(--line); }
.core { width:88px; height:88px; }
.core-ring { animation:spin 24s linear infinite; transform-origin:40px 40px; }
.core-dot { animation:pulse 3.2s ease-in-out infinite; transform-origin:40px 40px; }
.badge { position:absolute; top:11px; right:11px; font-family:var(--mono); font-size:10px; letter-spacing:.08em;
  color:var(--accent); border:1px solid color-mix(in srgb,var(--accent) 40%,transparent);
  border-radius:6px; padding:3px 7px; background:rgba(7,4,18,.75); }
.card-body { padding:16px 16px 18px; }
.card-title { font-family:var(--display); font-weight:600; font-size:20px; margin:0 0 4px; line-height:1.15; }
.card-sub { color:var(--muted); font-size:12.5px; margin:0 0 13px; line-height:1.4; }
.card-meta { display:flex; align-items:center; gap:10px; margin-bottom:15px; color:var(--muted); }
.mono { font-family:var(--mono); }
.card-meta .mono { font-size:12px; }
.dot { width:3px; height:3px; border-radius:50%; background:var(--muted); opacity:.6; }
.dl { display:flex; align-items:center; justify-content:center; gap:8px; width:100%; padding:10px;
  border-radius:10px; cursor:pointer; font-family:var(--body); font-size:13.5px; font-weight:600;
  text-decoration:none; color:var(--void); background:var(--accent); transition:filter .2s, transform .1s; }
.dl:hover { filter:brightness(1.1); }
.dl:active { transform:scale(.98); }
.dl-arrow { font-weight:700; }
.dl-off { background:transparent; color:var(--muted); border:1px dashed var(--line); cursor:not-allowed; }

/* Búsqueda / vacíos */
.result-line { color:var(--muted); font-size:14px; margin:0 0 20px; }
.result-line .mono { color:var(--text); }
.empty { color:var(--muted); font-size:15px; padding:40px; text-align:center;
  border:1px dashed var(--line); border-radius:14px; }

.pie { max-width:1200px; margin:40px auto 0; padding-top:20px; border-top:1px solid var(--line);
  color:var(--muted); font-size:13px; text-align:center; position:relative; z-index:1; }

@keyframes spin { to { transform:rotate(360deg); } }
@keyframes pulse { 0%,100% { transform:scale(1); opacity:1; } 50% { transform:scale(1.5); opacity:.55; } }
@keyframes glowPulse { 0%,100% { opacity:1; } 50% { opacity:0.55; } }
@keyframes ethPulse  { 0%,100% { opacity:1; transform:scale(1); }    50% { opacity:0.12; transform:scale(0.35); } }
@keyframes soulPulse { 0%,100% { opacity:1; transform:scale(1); }    50% { opacity:0.50; transform:scale(0.82); } }
.eth-p    { animation:ethPulse  4s   ease-in-out infinite; transform-box:fill-box; transform-origin:center; }
.soul-orb { animation:soulPulse 3.5s ease-in-out infinite; transform-box:fill-box; transform-origin:center; }
@media (prefers-reduced-motion: reduce) { .core-ring,.core-dot,.hero-ring::after,.hero-glow,.eth-p { animation:none; } }

@media (max-width: 760px) {
  .app { grid-template-columns:1fr; gap:18px; }
  .rail { position:static; flex-direction:row; overflow-x:auto; gap:8px; padding-bottom:6px; }
  .rail-item { flex:none; white-space:nowrap; }
  .rail-count { margin-left:6px; }
}
`;
