import { useState, useMemo } from "react";

// ─── Data ──────────────────────────────────────────────

const PKG_COLORS = {
  pages: "#10B981", bookings: "#F59E0B", forms: "#EC4899",
  contacts: "#6366F1", sales: "#8B5CF6", custom: "#F97316",
};

const BLOCKS = {
  hero: { pkg: "pages", label: "Hero section", icon: "✦", desc: "Title, subtitle, call to action" },
  text: { pkg: "pages", label: "Text block", icon: "¶", desc: "A paragraph of content" },
  image: { pkg: "pages", label: "Image", icon: "◻", desc: "Photo or graphic" },
  schedule: { pkg: "bookings", label: "Class schedule", icon: "📅", desc: "Sessions people can book" },
  book_cta: { pkg: "bookings", label: "Book now", icon: "→", desc: "Button linking to booking" },
  contact_form: { pkg: "forms", label: "Contact form", icon: "✉", desc: "People write to you" },
  signup: { pkg: "forms", label: "Sign-up", icon: "✋", desc: "Collect emails" },
  team: { pkg: "contacts", label: "Team", icon: "👤", desc: "Show your people" },
  pay: { pkg: "sales", label: "Pay invoice", icon: "💳", desc: "Members pay outstanding invoices" },
  my_bookings: { pkg: "bookings", label: "My bookings", icon: "📋", desc: "Upcoming & past bookings" },
  my_invoices: { pkg: "sales", label: "My invoices", icon: "🧾", desc: "Payment history" },
  manage_bookings: { pkg: "bookings", label: "Manage bookings", icon: "📊", desc: "See all bookings" },
  manage_contacts: { pkg: "contacts", label: "All contacts", icon: "👥", desc: "Everyone in your system" },
  manage_invoices: { pkg: "sales", label: "All invoices", icon: "💰", desc: "Sent & outstanding" },
};

const TEMPLATES = [
  {
    id: "yoga", emoji: "🧘", name: "Yoga studio",
    desc: "Website with scheduling, member bookings, contact collection",
    identity: { name: "Sunrise Yoga", desc: "A yoga studio", vibe: "warm" },
    pages: {
      public: ["hero", "schedule", "team", "signup"],
      admin: ["manage_bookings", "manage_contacts"],
      members: ["my_bookings"],
    },
  },
  {
    id: "club", emoji: "⚽", name: "Sports club",
    desc: "Member management, scheduling, simple invoicing",
    identity: { name: "FC Riverside", desc: "A local sports club", vibe: "bold" },
    pages: {
      public: ["hero", "schedule", "contact_form"],
      admin: ["manage_bookings", "manage_contacts", "manage_invoices"],
      members: ["my_bookings", "my_invoices"],
    },
  },
  {
    id: "charity", emoji: "💚", name: "Small charity",
    desc: "Public site, contact forms, donor tracking",
    identity: { name: "Green Roots", desc: "A local environmental charity", vibe: "earthy" },
    pages: {
      public: ["hero", "text", "contact_form", "team"],
      admin: ["manage_contacts", "manage_invoices"],
      members: [],
    },
  },
  {
    id: "blank", emoji: "✨", name: "Start blank",
    desc: "Empty canvas — build from scratch",
    identity: { name: "", desc: "", vibe: null },
    pages: { public: [], admin: [], members: [] },
  },
];

const SURFACES = [
  { id: "public", label: "Public site", emoji: "🌍" },
  { id: "admin", label: "Dashboard", emoji: "⚙️" },
  { id: "members", label: "Members", emoji: "🔒" },
];

const AUTOMATIONS = [
  { id: "a1", when: "Someone books a class", then: "Send confirmation email", pkgs: ["bookings"], on: true },
  { id: "a2", when: "New sign-up", then: "Add to contacts", pkgs: ["forms", "contacts"], on: true },
  { id: "a3", when: "Invoice overdue 7 days", then: "Send reminder", pkgs: ["sales"], on: false },
  { id: "a4", when: "Booking cancelled", then: "Notify admin", pkgs: ["bookings"], on: false },
];

// ─── Fake preview data ────────────────────────────────

const FAKE = {
  classes: [
    { name: "Morning Flow", time: "Mon 8:00", spots: "3 left", teacher: "Anna" },
    { name: "Power Yoga", time: "Tue 18:30", spots: "Full", teacher: "Marc" },
    { name: "Gentle Stretch", time: "Wed 10:00", spots: "7 left", teacher: "Anna" },
  ],
  contacts: [
    { name: "Emma De Vries", email: "emma@mail.be", tag: "Member" },
    { name: "Lucas Peeters", email: "lucas@mail.be", tag: "New" },
    { name: "Sophie Janssen", email: "sophie@mail.be", tag: "Member" },
    { name: "Thomas Maes", email: "thomas@mail.be", tag: "Lead" },
  ],
  invoices: [
    { to: "Emma De Vries", amount: "€45", status: "Paid", color: "#10B981" },
    { to: "Lucas Peeters", amount: "€45", status: "Sent", color: "#F59E0B" },
    { to: "Thomas Maes", amount: "€90", status: "Overdue", color: "#EF4444" },
  ],
  stats: { contacts: 147, bookingsThisWeek: 23, revenue: "€1,240", unpaid: 4 },
};

// ─── App ───────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState("templates"); // templates | compose | preview | automations
  const [previewSurface, setPreviewSurface] = useState("public");
  const [identity, setIdentity] = useState({ name: "", desc: "", vibe: null });
  const [pages, setPages] = useState({ public: [], admin: [], members: [] });
  const [currentSurface, setCurrentSurface] = useState("public");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [automations, setAutomations] = useState(AUTOMATIONS);
  const [customBlocks, setCustomBlocks] = useState({});
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customDesc, setCustomDesc] = useState("");

  const allBlocks = { ...BLOCKS, ...customBlocks };

  const applyTemplate = (t) => {
    setIdentity({ ...t.identity });
    const p = {};
    for (const [s, blockTypes] of Object.entries(t.pages)) {
      p[s] = blockTypes.map((type, i) => ({ id: `${s}_${i}_${Date.now()}`, type }));
    }
    setPages(p);
    setView("compose");
  };

  const addBlock = (type) => {
    setPages(p => ({ ...p, [currentSurface]: [...p[currentSurface], { id: Date.now().toString(), type }] }));
    setDrawerOpen(false);
  };
  const removeBlock = (id) => { setPages(p => ({ ...p, [currentSurface]: p[currentSurface].filter(b => b.id !== id) })); setSelectedId(null); };
  const moveBlock = (idx, dir) => { setPages(p => { const l = [...p[currentSurface]]; const [m] = l.splice(idx, 1); l.splice(idx + dir, 0, m); return { ...p, [currentSurface]: l }; }); };

  const addCustom = () => {
    if (!customName.trim() || !customDesc.trim()) return;
    const key = `custom_${Date.now()}`;
    setCustomBlocks(p => ({ ...p, [key]: { pkg: "custom", label: customName.trim(), icon: "✨", desc: customDesc.trim(), custom: true } }));
    setPages(p => ({ ...p, [currentSurface]: [...p[currentSurface], { id: Date.now().toString(), type: key }] }));
    setCustomName(""); setCustomDesc(""); setCustomOpen(false); setDrawerOpen(false);
  };

  const toggleAutomation = (id) => {
    setAutomations(a => a.map(x => x.id === id ? { ...x, on: !x.on } : x));
  };

  const pkgsUsed = useMemo(() => {
    const s = new Set();
    Object.values(pages).flat().forEach(b => { const d = allBlocks[b.type]; if (d) s.add(d.pkg); });
    return [...s];
  }, [pages, allBlocks]);

  const totalBlocks = Object.values(pages).flat().length;
  const activeSurfaces = SURFACES.filter(s => (pages[s.id] || []).length > 0 || s.id === "public");

  const S = {
    root: { fontFamily: "'Instrument Sans', sans-serif", background: "#FAFAF9", minHeight: "100vh", color: "#1C1917", maxWidth: 420, margin: "0 auto", position: "relative" },
    nav: { padding: "10px 16px", background: "white", borderBottom: "1px solid #E7E5E4", display: "flex", alignItems: "center", gap: 8, position: "sticky", top: 0, zIndex: 50 },
    logo: { width: 22, height: 22, border: "1.5px solid #E7E5E4", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Serif Display', serif", fontSize: 11, color: "#78716C" },
    tab: (active) => ({ flex: 1, padding: "7px 4px", borderRadius: 7, border: "none", cursor: "pointer", background: active ? "#F5F5F4" : "transparent", fontFamily: "'Instrument Sans', sans-serif", fontSize: 10, fontWeight: active ? 700 : 500, color: active ? "#1C1917" : "#A8A29E", transition: "all 0.15s" }),
    bottomBar: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", maxWidth: 420, width: "100%", padding: "10px 12px", paddingBottom: "max(10px, env(safe-area-inset-bottom))", background: "white", borderTop: "1px solid #E7E5E4", display: "flex", gap: 8, zIndex: 40 },
  };

  // ─── Templates ──────────────────────────────────

  if (view === "templates") return (
    <div style={S.root}>
      <div style={S.nav}>
        <div style={S.logo}>A</div>
        <span style={{ fontSize: 13, fontWeight: 700 }}>Atelier</span>
      </div>
      <div style={{ padding: "32px 20px" }}>
        <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.2, marginBottom: 4 }}>Start from a template</div>
        <div style={{ fontSize: 14, color: "#A8A29E", marginBottom: 28 }}>Pick one and make it yours. Change anything.</div>
        {TEMPLATES.map(t => (
          <button key={t.id} onClick={() => applyTemplate(t)} style={{
            display: "flex", alignItems: "center", gap: 14, width: "100%", padding: "18px 16px", marginBottom: 8,
            background: t.id === "blank" ? "#FAFAF9" : "white",
            border: t.id === "blank" ? "1.5px dashed #E7E5E4" : "1px solid #E7E5E4",
            borderRadius: 14, cursor: "pointer", textAlign: "left", fontFamily: "'Instrument Sans', sans-serif", transition: "all 0.15s",
          }}
          onMouseOver={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.04)"; }}
          onMouseOut={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
          >
            <span style={{ fontSize: 28 }}>{t.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{t.name}</div>
              <div style={{ fontSize: 12, color: "#A8A29E" }}>{t.desc}</div>
            </div>
            <span style={{ fontSize: 14, color: "#D6D3D1" }}>→</span>
          </button>
        ))}
      </div>
    </div>
  );

  // ─── Compose ──────────────────────────────────

  if (view === "compose") return (
    <div style={S.root}>
      <div style={S.nav}>
        <div style={S.logo}>A</div>
        <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{identity.name || "New app"}</span>
        <div style={{ display: "flex", gap: 2 }}>
          {["compose", "preview", "automations"].map(v => (
            <button key={v} onClick={() => setView(v)} style={S.tab(view === v)}>
              {v === "compose" ? "Build" : v === "preview" ? "Preview" : "Auto"}
            </button>
          ))}
        </div>
      </div>

      {/* Identity bar */}
      <div style={{ padding: "10px 16px", background: "white", borderBottom: "1px solid #E7E5E4" }}>
        <input value={identity.name} onChange={e => setIdentity(p => ({ ...p, name: e.target.value }))}
          placeholder="App name" style={{ width: "100%", border: "none", outline: "none", fontSize: 16, fontWeight: 700, fontFamily: "'Instrument Sans', sans-serif", background: "transparent" }} />
        <input value={identity.desc} onChange={e => setIdentity(p => ({ ...p, desc: e.target.value }))}
          placeholder="What's it for?" style={{ width: "100%", border: "none", outline: "none", fontSize: 13, color: "#78716C", fontFamily: "'Instrument Sans', sans-serif", background: "transparent", marginTop: 2 }} />
      </div>

      {/* Surface tabs */}
      <div style={{ display: "flex", gap: 2, padding: "8px 12px", background: "white", borderBottom: "1px solid #E7E5E4" }}>
        {SURFACES.map(s => {
          const count = (pages[s.id] || []).length;
          const active = currentSurface === s.id;
          return (
            <button key={s.id} onClick={() => setCurrentSurface(s.id)} style={{
              flex: 1, padding: "8px 6px", borderRadius: 8, border: "none", cursor: "pointer",
              background: active ? "#F5F5F4" : "transparent", fontFamily: "'Instrument Sans', sans-serif",
            }}>
              <div style={{ fontSize: 16 }}>{s.emoji}</div>
              <div style={{ fontSize: 10, fontWeight: active ? 700 : 500, color: active ? "#1C1917" : "#A8A29E", marginTop: 2 }}>
                {s.label}{count > 0 && ` (${count})`}
              </div>
            </button>
          );
        })}
      </div>

      {/* Blocks */}
      <div style={{ padding: "10px 12px", paddingBottom: 100 }}>
        {(pages[currentSurface] || []).length === 0 && (
          <div style={{ padding: "40px 16px", textAlign: "center", color: "#D6D3D1" }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{SURFACES.find(s => s.id === currentSurface)?.emoji}</div>
            <div style={{ fontSize: 13 }}>Tap + to add blocks</div>
          </div>
        )}
        {(pages[currentSurface] || []).map((block, idx) => {
          const def = allBlocks[block.type]; if (!def) return null;
          const c = PKG_COLORS[def.pkg] || PKG_COLORS.custom;
          const sel = selectedId === block.id;
          return (
            <div key={block.id} onClick={() => setSelectedId(sel ? null : block.id)} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", marginBottom: 3,
              background: "white", border: sel ? `1.5px solid ${c}` : "1px solid #E7E5E4",
              borderRadius: 12, cursor: "pointer", transition: "all 0.15s",
            }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 1.5, opacity: 0.2 }}>
                {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 1.5, background: "#1C1917", borderRadius: 1 }} />)}
              </div>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${c}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{def.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                  {def.label}
                  {def.custom && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "#FEF3C7", color: "#92400E", fontWeight: 600 }}>custom</span>}
                </div>
                <div style={{ fontSize: 11, color: "#A8A29E", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{def.desc}</div>
              </div>
              {sel && (
                <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                  {idx > 0 && <MiniBtn onClick={e => { e.stopPropagation(); moveBlock(idx, -1); }}>↑</MiniBtn>}
                  {idx < (pages[currentSurface]||[]).length - 1 && <MiniBtn onClick={e => { e.stopPropagation(); moveBlock(idx, 1); }}>↓</MiniBtn>}
                  <MiniBtn danger onClick={e => { e.stopPropagation(); removeBlock(block.id); }}>×</MiniBtn>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom bar */}
      <div style={S.bottomBar}>
        <button onClick={() => setView("templates")} style={{ width: 44, height: 44, borderRadius: 12, border: "1px solid #E7E5E4", background: "white", cursor: "pointer", fontSize: 16, color: "#78716C", display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>
        <button onClick={() => setDrawerOpen(true)} style={{ flex: 1, height: 44, borderRadius: 12, border: "none", background: "#1C1917", cursor: "pointer", color: "white", fontSize: 14, fontWeight: 700, fontFamily: "'Instrument Sans', sans-serif" }}>+ Add block</button>
        <button onClick={() => setView("preview")} style={{ height: 44, padding: "0 14px", borderRadius: 12, border: "none", background: totalBlocks > 0 ? "#16A34A" : "#E7E5E4", cursor: totalBlocks > 0 ? "pointer" : "default", color: totalBlocks > 0 ? "white" : "#A8A29E", fontSize: 13, fontWeight: 700, fontFamily: "'Instrument Sans', sans-serif" }}>
          Preview
        </button>
      </div>

      {/* Drawer */}
      {drawerOpen && (<>
        <div onClick={() => { setDrawerOpen(false); setCustomOpen(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 60 }} />
        <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 420, background: "white", borderRadius: "20px 20px 0 0", zIndex: 70, maxHeight: "75vh", overflow: "auto", boxShadow: "0 -4px 30px rgba(0,0,0,0.1)" }}>
          <div style={{ padding: "10px 0 6px", display: "flex", justifyContent: "center" }}><div style={{ width: 36, height: 4, borderRadius: 2, background: "#E7E5E4" }} /></div>
          <div style={{ padding: "4px 16px 24px" }}>
            {!customOpen ? (<>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Add block</div>
              {Object.entries(PKG_COLORS).filter(([k]) => k !== "custom" || Object.keys(customBlocks).length > 0).map(([pkgKey, color]) => {
                const items = pkgKey === "custom"
                  ? Object.entries(customBlocks).map(([k, v]) => ({ key: k, ...v }))
                  : Object.entries(BLOCKS).filter(([, v]) => v.pkg === pkgKey).map(([k, v]) => ({ key: k, ...v }));
                if (items.length === 0) return null;
                return (
                  <div key={pkgKey} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <div style={{ width: 6, height: 6, borderRadius: 3, background: color }} />
                      <span style={{ fontSize: 10, fontWeight: 600, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.06em" }}>{pkgKey}</span>
                    </div>
                    {items.map(item => (
                      <button key={item.key} onClick={() => addBlock(item.key)} style={{
                        display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 10px", marginBottom: 1,
                        background: "transparent", border: "none", borderRadius: 8, cursor: "pointer", textAlign: "left", fontFamily: "'Instrument Sans', sans-serif",
                      }}
                      onMouseOver={e => e.currentTarget.style.background = "#F5F5F4"}
                      onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: `${color}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>{item.icon}</div>
                        <div><div style={{ fontSize: 13, fontWeight: 600 }}>{item.label}</div><div style={{ fontSize: 11, color: "#A8A29E" }}>{item.desc}</div></div>
                      </button>
                    ))}
                  </div>
                );
              })}
              <button onClick={() => setCustomOpen(true)} style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "14px 12px", marginTop: 8,
                background: "#FFF7ED", border: "1.5px dashed #F97316", borderRadius: 12, cursor: "pointer", textAlign: "left", fontFamily: "'Instrument Sans', sans-serif",
              }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: "#F9731615", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>✨</div>
                <div><div style={{ fontSize: 13, fontWeight: 700, color: "#C2410C" }}>Something else</div><div style={{ fontSize: 11, color: "#A8A29E" }}>Describe it — AI builds it</div></div>
              </button>
            </>) : (<>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Describe a new block</div>
              <div style={{ fontSize: 12, color: "#A8A29E", marginBottom: 16, lineHeight: 1.6 }}>What should this part of the app do?</div>
              <input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="e.g. Event gallery"
                style={{ width: "100%", padding: "10px 12px", fontSize: 14, fontWeight: 600, border: "1.5px solid #E7E5E4", borderRadius: 10, outline: "none", fontFamily: "'Instrument Sans', sans-serif", marginBottom: 12, boxSizing: "border-box" }} />
              <textarea value={customDesc} onChange={e => setCustomDesc(e.target.value)} placeholder="e.g. Show past events with photos and dates…" rows={3}
                style={{ width: "100%", padding: "10px 12px", fontSize: 13, border: "1.5px solid #E7E5E4", borderRadius: 10, outline: "none", fontFamily: "'Instrument Sans', sans-serif", marginBottom: 16, boxSizing: "border-box", resize: "vertical", lineHeight: 1.6, color: "#57534E" }} />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setCustomOpen(false)} style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1px solid #E7E5E4", background: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Instrument Sans', sans-serif", color: "#78716C" }}>Cancel</button>
                <button onClick={addCustom} disabled={!customName.trim() || !customDesc.trim()} style={{
                  flex: 2, padding: "12px", borderRadius: 10, border: "none",
                  background: (customName.trim() && customDesc.trim()) ? "#F97316" : "#E7E5E4",
                  color: (customName.trim() && customDesc.trim()) ? "white" : "#A8A29E",
                  fontSize: 13, fontWeight: 700, cursor: (customName.trim() && customDesc.trim()) ? "pointer" : "default", fontFamily: "'Instrument Sans', sans-serif",
                }}>Add ✨</button>
              </div>
            </>)}
          </div>
        </div>
      </>)}
    </div>
  );

  // ─── Preview ──────────────────────────────────

  if (view === "preview") {
    const surfaceBlocks = pages[previewSurface] || [];

    return (
      <div style={S.root}>
        <div style={S.nav}>
          <div style={S.logo}>A</div>
          <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{identity.name || "Preview"}</span>
          <div style={{ display: "flex", gap: 2 }}>
            {["compose", "preview", "automations"].map(v => (
              <button key={v} onClick={() => setView(v)} style={S.tab(view === v)}>
                {v === "compose" ? "Build" : v === "preview" ? "Preview" : "Auto"}
              </button>
            ))}
          </div>
        </div>

        {/* Surface tabs */}
        <div style={{ display: "flex", gap: 2, padding: "8px 12px", background: "#1C1917" }}>
          {SURFACES.map(s => {
            const active = previewSurface === s.id;
            return (
              <button key={s.id} onClick={() => setPreviewSurface(s.id)} style={{
                flex: 1, padding: "7px 6px", borderRadius: 7, border: "none", cursor: "pointer",
                background: active ? "#292524" : "transparent", fontFamily: "'Instrument Sans', sans-serif",
              }}>
                <div style={{ fontSize: 14 }}>{s.emoji}</div>
                <div style={{ fontSize: 9, fontWeight: active ? 700 : 500, color: active ? "white" : "#78716C", marginTop: 2 }}>{s.label}</div>
              </button>
            );
          })}
        </div>

        {/* Preview content */}
        <div style={{ padding: "0", background: previewSurface === "admin" ? "#F5F5F4" : "white", minHeight: "calc(100vh - 110px)", paddingBottom: 80 }}>

          {/* ─ Public site preview ─ */}
          {previewSurface === "public" && (<>
            {surfaceBlocks.map((block, i) => {
              const def = allBlocks[block.type]; if (!def) return null;
              if (block.type === "hero") return (
                <div key={block.id} style={{ padding: "48px 24px 32px", background: "linear-gradient(180deg, #F5F5F4 0%, white 100%)" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#A8A29E", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{identity.desc || "Welcome"}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "'DM Serif Display', serif", lineHeight: 1.15, marginBottom: 12 }}>{identity.name || "Your App"}</div>
                  <div style={{ fontSize: 14, color: "#78716C", lineHeight: 1.6, marginBottom: 20 }}>Welcome to {identity.name || "our"} — your description goes here.</div>
                  <div style={{ display: "inline-block", padding: "10px 20px", background: "#1C1917", color: "white", borderRadius: 8, fontSize: 13, fontWeight: 700 }}>Get started →</div>
                </div>
              );
              if (block.type === "schedule") return (
                <div key={block.id} style={{ padding: "24px" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Upcoming classes</div>
                  {FAKE.classes.map((c, j) => (
                    <div key={j} style={{ display: "flex", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #F5F5F4" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</div>
                        <div style={{ fontSize: 12, color: "#A8A29E" }}>{c.time} · {c.teacher}</div>
                      </div>
                      <div style={{ padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: c.spots === "Full" ? "#FEF2F2" : "#F0FDF4", color: c.spots === "Full" ? "#DC2626" : "#16A34A" }}>{c.spots}</div>
                    </div>
                  ))}
                </div>
              );
              if (block.type === "signup" || block.type === "contact_form") return (
                <div key={block.id} style={{ padding: "24px", background: "#F5F5F4", margin: "0" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>{block.type === "signup" ? "Stay in the loop" : "Get in touch"}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1, padding: "10px 12px", background: "white", border: "1px solid #E7E5E4", borderRadius: 8, fontSize: 13, color: "#A8A29E" }}>Your email</div>
                    <div style={{ padding: "10px 16px", background: "#1C1917", color: "white", borderRadius: 8, fontSize: 13, fontWeight: 600 }}>→</div>
                  </div>
                </div>
              );
              if (block.type === "team") return (
                <div key={block.id} style={{ padding: "24px" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Our team</div>
                  <div style={{ display: "flex", gap: 12 }}>
                    {["Anna", "Marc", "Sophie"].map(n => (
                      <div key={n} style={{ textAlign: "center" }}>
                        <div style={{ width: 56, height: 56, borderRadius: 28, background: "#E7E5E4", marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#A8A29E" }}>{n[0]}</div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{n}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
              if (block.type === "text") return (
                <div key={block.id} style={{ padding: "24px" }}>
                  <div style={{ fontSize: 14, color: "#57534E", lineHeight: 1.7 }}>This is where your content goes. Tell your story, explain your mission, share what makes you different. The text block supports rich content.</div>
                </div>
              );
              // Generic block preview
              return (
                <div key={block.id} style={{ padding: "16px 24px", borderBottom: "1px solid #F5F5F4" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{def.icon}</span>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{def.label}</span>
                    {def.custom && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "#FEF3C7", color: "#92400E", fontWeight: 600 }}>custom — AI will generate</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "#A8A29E", marginTop: 4 }}>{def.desc}</div>
                </div>
              );
            })}
            {surfaceBlocks.length === 0 && <div style={{ padding: "60px 24px", textAlign: "center", color: "#D6D3D1" }}>No blocks on public site yet</div>}
          </>)}

          {/* ─ Dashboard preview ─ */}
          {previewSurface === "admin" && (<>
            {/* Stats bar */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, padding: "16px 12px" }}>
              {[
                { label: "Contacts", val: FAKE.stats.contacts, c: "#6366F1" },
                { label: "This week", val: FAKE.stats.bookingsThisWeek, c: "#F59E0B" },
                { label: "Revenue", val: FAKE.stats.revenue, c: "#10B981" },
                { label: "Unpaid", val: FAKE.stats.unpaid, c: "#EF4444" },
              ].map((s, i) => (
                <div key={i} style={{ padding: "12px 10px", background: "white", borderRadius: 10, border: "1px solid #E7E5E4" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: s.c }}>{s.val}</div>
                  <div style={{ fontSize: 10, color: "#A8A29E", fontWeight: 500, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Contacts */}
            {pkgsUsed.includes("contacts") && (
              <div style={{ margin: "0 12px 12px", background: "white", borderRadius: 12, border: "1px solid #E7E5E4", overflow: "hidden" }}>
                <div style={{ padding: "10px 14px", borderBottom: "1px solid #F5F5F4", display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: 3, background: "#6366F1" }} />
                  <span style={{ fontSize: 12, fontWeight: 700 }}>Recent contacts</span>
                </div>
                {FAKE.contacts.map((c, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderBottom: i < 3 ? "1px solid #F5F5F4" : "none" }}>
                    <div style={{ width: 28, height: 28, borderRadius: 14, background: "#6366F112", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#6366F1", fontWeight: 700 }}>{c.name[0]}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{c.name}</div>
                      <div style={{ fontSize: 10, color: "#A8A29E" }}>{c.email}</div>
                    </div>
                    <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: c.tag === "New" ? "#DBEAFE" : c.tag === "Lead" ? "#FEF3C7" : "#F0FDF4", color: c.tag === "New" ? "#2563EB" : c.tag === "Lead" ? "#92400E" : "#16A34A", fontWeight: 600 }}>{c.tag}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Invoices */}
            {pkgsUsed.includes("sales") && (
              <div style={{ margin: "0 12px 12px", background: "white", borderRadius: 12, border: "1px solid #E7E5E4", overflow: "hidden" }}>
                <div style={{ padding: "10px 14px", borderBottom: "1px solid #F5F5F4", display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: 3, background: "#8B5CF6" }} />
                  <span style={{ fontSize: 12, fontWeight: 700 }}>Invoices</span>
                </div>
                {FAKE.invoices.map((inv, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderBottom: i < 2 ? "1px solid #F5F5F4" : "none" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{inv.to}</div>
                      <div style={{ fontSize: 10, color: "#A8A29E" }}>{inv.amount}</div>
                    </div>
                    <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: `${inv.color}15`, color: inv.color, fontWeight: 600 }}>{inv.status}</span>
                  </div>
                ))}
              </div>
            )}

            {surfaceBlocks.length === 0 && !pkgsUsed.includes("contacts") && !pkgsUsed.includes("sales") && (
              <div style={{ padding: "40px 24px", textAlign: "center", color: "#D6D3D1" }}>Add packages to see your dashboard</div>
            )}
          </>)}

          {/* ─ Member preview ─ */}
          {previewSurface === "members" && (<>
            <div style={{ padding: "24px 20px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: 20, background: "#6366F112", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#6366F1", fontWeight: 700 }}>E</div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>Hi, Emma</div>
                  <div style={{ fontSize: 12, color: "#A8A29E" }}>Member since Jan 2025</div>
                </div>
              </div>
            </div>

            {pkgsUsed.includes("bookings") && (
              <div style={{ margin: "0 12px 12px", background: "white", borderRadius: 12, border: "1px solid #E7E5E4", overflow: "hidden" }}>
                <div style={{ padding: "10px 14px", borderBottom: "1px solid #F5F5F4", fontSize: 12, fontWeight: 700 }}>📅 My bookings</div>
                {FAKE.classes.slice(0, 2).map((c, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", padding: "10px 14px", borderBottom: i === 0 ? "1px solid #F5F5F4" : "none" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: "#A8A29E" }}>{c.time} · {c.teacher}</div>
                    </div>
                    <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: "#F0FDF4", color: "#16A34A", fontWeight: 600 }}>Confirmed</span>
                  </div>
                ))}
              </div>
            )}

            {pkgsUsed.includes("sales") && (
              <div style={{ margin: "0 12px 12px", background: "white", borderRadius: 12, border: "1px solid #E7E5E4", overflow: "hidden" }}>
                <div style={{ padding: "10px 14px", borderBottom: "1px solid #F5F5F4", fontSize: 12, fontWeight: 700 }}>🧾 My invoices</div>
                <div style={{ display: "flex", alignItems: "center", padding: "10px 14px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>March membership</div>
                    <div style={{ fontSize: 11, color: "#A8A29E" }}>€45 · Due Mar 1</div>
                  </div>
                  <div style={{ padding: "6px 14px", background: "#1C1917", color: "white", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Pay</div>
                </div>
              </div>
            )}

            {surfaceBlocks.length === 0 && !pkgsUsed.includes("bookings") && !pkgsUsed.includes("sales") && (
              <div style={{ padding: "40px 24px", textAlign: "center", color: "#D6D3D1" }}>Add member-facing blocks to see this view</div>
            )}
          </>)}
        </div>

        {/* Bottom */}
        <div style={S.bottomBar}>
          <button onClick={() => setView("compose")} style={{ flex: 1, height: 44, borderRadius: 12, border: "1px solid #E7E5E4", background: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Instrument Sans', sans-serif", color: "#78716C" }}>← Edit</button>
          <button style={{ flex: 2, height: 44, borderRadius: 12, border: "none", background: "#16A34A", color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Instrument Sans', sans-serif" }}>Build this app →</button>
        </div>
      </div>
    );
  }

  // ─── Automations ──────────────────────────────

  if (view === "automations") return (
    <div style={S.root}>
      <div style={S.nav}>
        <div style={S.logo}>A</div>
        <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{identity.name || "New app"}</span>
        <div style={{ display: "flex", gap: 2 }}>
          {["compose", "preview", "automations"].map(v => (
            <button key={v} onClick={() => setView(v)} style={S.tab(view === v)}>
              {v === "compose" ? "Build" : v === "preview" ? "Preview" : "Auto"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "24px 16px" }}>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Automations</div>
        <div style={{ fontSize: 13, color: "#A8A29E", marginBottom: 20 }}>When something happens, do something. Simple rules powered by your connected packages.</div>

        {automations.filter(a => a.pkgs.some(p => pkgsUsed.includes(p))).map(a => (
          <div key={a.id} onClick={() => toggleAutomation(a.id)} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", marginBottom: 6,
            background: "white", border: "1px solid #E7E5E4", borderRadius: 12, cursor: "pointer",
            opacity: a.on ? 1 : 0.5, transition: "all 0.15s",
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>When {a.when.toLowerCase()}</div>
              <div style={{ fontSize: 12, color: "#78716C" }}>→ {a.then}</div>
              <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                {a.pkgs.map(p => (
                  <span key={p} style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: `${PKG_COLORS[p]}15`, color: PKG_COLORS[p], fontWeight: 600 }}>{p}</span>
                ))}
              </div>
            </div>
            <div style={{ width: 40, height: 22, borderRadius: 11, background: a.on ? "#10B981" : "#E7E5E4", padding: 2, transition: "all 0.2s", flexShrink: 0 }}>
              <div style={{ width: 18, height: 18, borderRadius: 9, background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", transform: a.on ? "translateX(18px)" : "translateX(0)", transition: "all 0.2s" }} />
            </div>
          </div>
        ))}

        {automations.filter(a => a.pkgs.some(p => pkgsUsed.includes(p))).length === 0 && (
          <div style={{ padding: "40px 16px", textAlign: "center", color: "#D6D3D1" }}>
            <div style={{ fontSize: 13 }}>Add packages to unlock automations</div>
          </div>
        )}

        <div style={{ marginTop: 16, padding: "14px 16px", background: "#FFF7ED", border: "1.5px dashed #F97316", borderRadius: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#C2410C", marginBottom: 2 }}>Describe an automation</div>
          <div style={{ fontSize: 12, color: "#A8A29E" }}>"When a booking is cancelled, refund automatically" — coming soon</div>
        </div>
      </div>

      <div style={S.bottomBar}>
        <button onClick={() => setView("compose")} style={{ flex: 1, height: 44, borderRadius: 12, border: "1px solid #E7E5E4", background: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Instrument Sans', sans-serif", color: "#78716C" }}>← Build</button>
        <button onClick={() => setView("preview")} style={{ flex: 2, height: 44, borderRadius: 12, border: "none", background: "#16A34A", color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Instrument Sans', sans-serif" }}>Preview →</button>
      </div>
    </div>
  );

  return null;
}

function MiniBtn({ children, onClick, danger }) {
  return (
    <button onClick={onClick} style={{
      width: 26, height: 26, borderRadius: 7, cursor: "pointer", fontSize: 12,
      border: danger ? "1px solid #FECACA" : "1px solid #E7E5E4",
      background: danger ? "#FEF2F2" : "white",
      color: danger ? "#DC2626" : "#78716C",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>{children}</button>
  );
}
