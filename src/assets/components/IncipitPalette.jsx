import { useEffect, useMemo, useState } from "react";

// bridges
function readBridge(id) {
  return (document.getElementById(id)?.value || "").trim();
}
function writeBridge(id, v) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = v;
  el.dispatchEvent(new Event("change", { bubbles: true }));
}
function syncLegacyPAE(pae) {
  writeBridge("031p", pae);
  writeBridge("incipitPaec", pae);
  window.dispatchEvent(new CustomEvent("incipit:sync"));
}

// PAE helpers
const DURATIONS = [
  { d: 1, icon: "𝅝", label: "1 (semibreve)" },
  { d: 2, icon: "𝅗𝅥", label: "2 (mínima)" },
  { d: 4, icon: "♩", label: "4 (negra)" },
  { d: 8, icon: "♪", label: "8 (corchea)" },
  { d: 16, icon: "♫", label: "16 (semicorchea)" },
  { d: 32, icon: "𝅘𝅥𝅯", label: "32 (fusa)" }
];
const PITCHES = ["C", "D", "E", "F", "G", "A", "B"];
const ACCS = [
  { a: "", label: "–" },
  { a: "#", label: "♯" },
  { a: "b", label: "♭" },
  { a: "n", label: "♮" }
];
const OCTS = [
  { o: ",,", label: ",,", title: "−24" },
  { o: ",", label: ",", title: "−12" },
  { o: "", label: "•", title: "central" },
  { o: "'", label: "'", title: "+12" },
  { o: "''", label: "''", title: "+24" }
];

export default function IncipitPalette() {
  const [dur, setDur] = useState(4);
  const [pitch, setPitch] = useState("C");
  const [acc, setAcc] = useState("");
  const [dot, setDot] = useState(false);
  const [oct, setOct] = useState("");
  const [insertSpace, setInsertSpace] = useState(true);
  const [paeLive, setPaeLive] = useState("");

  // PAE actual en tiempo real
  useEffect(() => {
    const sync = () => setPaeLive(readBridge("031p"));
    const el = document.getElementById("031p");
    el?.addEventListener("change", sync);
    sync();
    return () => el?.removeEventListener("change", sync);
  }, []);

  const tokenPreview = useMemo(
    () => `${dur}${pitch}${oct}${acc}${dot ? "." : ""}`,
    [dur, pitch, oct, acc, dot]
  );

  const pushToken = (t) => {
    const cur = readBridge("031p");
    const sep = cur && insertSpace ? " " : "";
    syncLegacyPAE((cur + sep + t).trim());
  };

  const handleInsertNote = () => pushToken(tokenPreview);
  const handleInsertRest = () => pushToken(`${dur}r`);
  const handleInsertBar = () => pushToken(`/`);
  const handleInsertTie = () => pushToken(`=`);

  const handleUndoLast = () => {
    const cur = readBridge("031p");
    if (!cur) return;
    const parts = cur.split(/\s+/);
    parts.pop();
    syncLegacyPAE(parts.join(" ").trim());
  };
  const clearPAE = () => syncLegacyPAE("");

  // Publica el token actual para click-to-insert
  useEffect(() => {
    window.__PAE_TOKEN = tokenPreview;
    return () => {
      if (window.__PAE_TOKEN === tokenPreview) delete window.__PAE_TOKEN;
    };
  }, [tokenPreview]);

  return (
    <div className="grid gap-3 p-3 rounded border bg-white/90">
      {/* PAE actual */}
      <div className="text-xs text-gray-600">
        <span className="font-medium mr-2">PAE actual:</span>
        <span className="font-mono break-all">{paeLive || "—"}</span>
      </div>

      {/* Duraciones */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium w-24">Duración</span>
        <div className="flex flex-wrap gap-1">
          {DURATIONS.map(({ d, icon, label }) => (
            <button
              key={d}
              onClick={() => setDur(d)}
              className={`px-2 py-1 rounded border text-sm leading-none ${
                dur === d ? "bg-black text-white" : ""
              }`}
              title={label}
            >
              <span className="mr-1">{icon}</span>
              <span>{d}</span>
            </button>
          ))}
        </div>
        <label className="ml-3 inline-flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={dot}
            onChange={(e) => setDot(e.target.checked)}
          />
          Puntillo
        </label>
      </div>

      {/* Altura + octava */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium w-24">Altura</span>
        <div className="flex gap-1">
          {PITCHES.map((p) => (
            <button
              key={p}
              onClick={() => setPitch(p)}
              className={`px-2 py-1 rounded border ${
                pitch === p ? "bg-black text-white" : ""
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <span className="text-sm font-medium ml-3">Octava</span>
        <div className="flex gap-1">
          {OCTS.map(({ o, label, title }) => (
            <button
              key={label}
              onClick={() => setOct(o)}
              className={`px-2 py-1 rounded border text-sm ${
                oct === o ? "bg-black text-white" : ""
              }`}
              title={title}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Alteraciones */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium w-24">Alteración</span>
        <div className="flex gap-1">
          {ACCS.map(({ a, label }) => (
            <button
              key={label}
              onClick={() => setAcc(a)}
              className={`px-2 py-1 rounded border ${
                acc === a ? "bg-black text-white" : ""
              }`}
              title={label}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Inserciones */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium w-24">Insertar</span>
        <button onClick={handleInsertNote} className="px-3 py-1 rounded border">
          Nota <span className="ml-1 font-mono">{tokenPreview}</span>
        </button>
        <button onClick={handleInsertRest} className="px-3 py-1 rounded border">
          Silencio {dur}r
        </button>
        <button onClick={handleInsertBar} className="px-3 py-1 rounded border">
          Barra /
        </button>
        <button onClick={handleInsertTie} className="px-3 py-1 rounded border">
          Ligadura =
        </button>

        <label className="ml-3 inline-flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={insertSpace}
            onChange={(e) => setInsertSpace(e.target.checked)}
          />
          Espaciar tokens
        </label>

        <div className="ml-auto flex gap-2">
          <button onClick={handleUndoLast} className="px-3 py-1 rounded border">
            Deshacer último
          </button>
          <button onClick={clearPAE} className="px-3 py-1 rounded border">
            Limpiar
          </button>
        </div>
      </div>
    </div>
  );
}
