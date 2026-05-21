// Tweaks panel for the N8iV site — loaded on every page
const { useState, useEffect } = React;

function Tweaks() {
  const T = window.__siteTweaks;
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState(T.read());

  // Listen for host toolbar
  useEffect(() => {
    function onMsg(e) {
      const d = e.data || {};
      if (d.type === "__activate_edit_mode") setOpen(true);
      if (d.type === "__deactivate_edit_mode") setOpen(false);
    }
    window.addEventListener("message", onMsg);
    window.parent.postMessage({ type: "__edit_mode_available" }, "*");
    return () => window.removeEventListener("message", onMsg);
  }, []);

  function update(patch) {
    const next = { ...vals, ...patch };
    setVals(next);
    T.write(next);
    T.apply(next);
    window.parent.postMessage({ type: "__edit_mode_set_keys", edits: patch }, "*");
  }

  function close() {
    setOpen(false);
    window.parent.postMessage({ type: "__edit_mode_dismissed" }, "*");
  }

  if (!open) return null;

  const accents = [
    { id: "purple", color: "#593DDC" },
    { id: "red",    color: "#E5341B" },
    { id: "lime",   color: "#B8DB1F" },
    { id: "black",  color: "#0A0A0A" },
  ];
  const displays = [
    { id: "anton",         label: "Anton",        ff: "Anton, sans-serif" },
    { id: "archivo-black", label: "Archivo",      ff: "'Archivo Black', sans-serif" },
    { id: "bebas",         label: "Bebas",        ff: "'Bebas Neue', sans-serif" },
    { id: "oswald",        label: "Oswald",       ff: "Oswald, sans-serif" },
  ];

  return (
    <div className="tw-panel" onClick={(e)=>e.stopPropagation()}>
      <div className="tw-head">
        <span className="tw-title">Tweaks</span>
        <button className="tw-x" onClick={close} aria-label="Close">×</button>
      </div>

      <section className="tw-sec">
        <div className="tw-label">Accent color</div>
        <div className="tw-swatches">
          {accents.map(a => (
            <button
              key={a.id}
              className={"tw-sw " + (vals.accent===a.id?"on":"")}
              style={{ background: a.color }}
              onClick={() => update({ accent: a.id })}
              aria-label={a.id}
            >
              {vals.accent===a.id ? <span className="tw-tick">✓</span> : null}
            </button>
          ))}
        </div>
      </section>

      <section className="tw-sec">
        <div className="tw-label">Display font</div>
        <div className="tw-fonts">
          {displays.map(d => (
            <button
              key={d.id}
              className={"tw-font " + (vals.display===d.id?"on":"")}
              onClick={() => update({ display: d.id })}
              style={{ fontFamily: d.ff }}
            >
              <span className="big">Aa</span>
              <span className="lbl">{d.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="tw-sec">
        <div className="tw-label">Stat numbers</div>
        <div className="tw-stats">
          {[1,2,3,4].map(i => (
            <div key={i} className="tw-stat-row">
              <input
                className="tw-input num"
                value={vals["stat"+i+"Num"]}
                onChange={e => update({ ["stat"+i+"Num"]: e.target.value })}
              />
              <input
                className="tw-input lbl"
                value={vals["stat"+i+"Label"]}
                onChange={e => update({ ["stat"+i+"Label"]: e.target.value })}
              />
            </div>
          ))}
        </div>
      </section>

      <button className="tw-reset" onClick={() => { update(T.defaults); }}>Reset all</button>
    </div>
  );
}

const __twMount = document.getElementById("tweaks-root");
if (__twMount) {
  ReactDOM.createRoot(__twMount).render(<Tweaks />);
}
