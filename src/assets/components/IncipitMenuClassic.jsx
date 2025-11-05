// src/components/IncipitMenuClassic.jsx
import { useEffect, useMemo, useState } from "react";

/* ========= Bridges al legacy ========= */
const readBridge = (id) => (document.getElementById(id)?.value || "").trim();
const writeBridge = (id, v) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = v;
  el.dispatchEvent(new Event("change", { bubbles: true }));
};
const syncLegacyPAE = (pae) => {
  writeBridge("031p", pae);
  writeBridge("incipitPaec", pae);
  window.dispatchEvent(new CustomEvent("incipit:sync"));
};

/* ========= Helpers PAE ========= */
const SHARP_ORDER = ["F", "C", "G", "D", "A", "E", "B"];
const FLAT_ORDER = ["B", "E", "A", "D", "G", "C", "F"];
const makeKeyPAE = (n) => {
  if (!Number.isFinite(n) || n === 0) return "$x";
  return n > 0
    ? "$" + SHARP_ORDER.slice(0, n).join("")
    : "$b" + FLAT_ORDER.slice(0, Math.abs(n)).join("");
};

const CLEFS = [
  { label: "G-2", pae: "%G-2" },
  { label: "F-4", pae: "%F-4" },
  { label: "C-3", pae: "%C-3" },
  { label: "C-4", pae: "%C-4" },
  { label: "G-1", pae: "%G-1" },
  { label: "F-3", pae: "%F-3" }
];

const DUR_NOTES = [
  { d: 1, glyph: "𝅝", title: "Semibreve (1)" },
  { d: 2, glyph: "𝅗𝅥", title: "Mínima (2)" },
  { d: 4, glyph: "♩", title: "Negra (4)" },
  { d: 8, glyph: "♪", title: "Corchea (8)" },
  { d: 16, glyph: "♫", title: "Semicorchea (16)" },
  { d: 32, glyph: "𝅘𝅥𝅯", title: "Fusa (32)" }
];

const RESTS = [
  { d: 1, glyph: "𝄻", title: "Silencio 1" },
  { d: 2, glyph: "𝄼", title: "Silencio 2" },
  { d: 4, glyph: "𝄽", title: "Silencio 4" },
  { d: 8, glyph: "𝄾", title: "Silencio 8" },
  { d: 16, glyph: "𝄿", title: "Silencio 16" }
];

const PITCHES = ["C", "D", "E", "F", "G", "A", "B"];
const OCTS = [
  { o: ",,", label: ",," },
  { o: ",", label: "," },
  { o: "", label: "•" },
  { o: "'", label: "'" },
  { o: "''", label: "''" }
];
const ACCS = [
  { a: "", label: "—" },
  { a: "#", label: "♯" },
  { a: "b", label: "♭" },
  { a: "n", label: "♮" }
];

export default function IncipitMenuClassic() {
  // Estado de inserción
  const [dur, setDur] = useState(4);
  const [dot, setDot] = useState(false);
  const [pitch, setPitch] = useState("C");
  const [oct, setOct] = useState("");
  const [acc, setAcc] = useState("");
  const [ks, setKs] = useState(0); // armadura −7..+7
  const [clef, setClef] = useState("%G-2");
  const [space, setSpace] = useState(true);

  // Token PAE de la próxima nota
  const token = useMemo(
    () => `${dur}${pitch}${oct}${acc}${dot ? "." : ""}`,
    [dur, pitch, oct, acc, dot]
  );

  // Publica token para click-to-insert en el canvas
  useEffect(() => {
    window.__PAE_TOKEN = token;
    return () => {
      if (window.__PAE_TOKEN === token) delete window.__PAE_TOKEN;
    };
  }, [token]);

  // Inserta en $p manteniendo (opcional) espacio separador
  const appendToken = (t) => {
    const cur = readBridge("031p");
    const sep = cur && space ? " " : "";
    syncLegacyPAE((cur + sep + t).trim());
  };

  const insertNote = (customDur) => {
    const d = customDur ?? dur;
    appendToken(`${d}${pitch}${oct}${acc}${dot ? "." : ""}`);
  };
  const insertRest = (d = dur) => appendToken(`${d}r`);
  const insertBar = (kind = "/") => appendToken(kind);
  const insertTie = () => appendToken("=");

  const undoLast = () => {
    const cur = readBridge("031p");
    if (!cur) return;
    const arr = cur.split(/\s+/);
    arr.pop();
    syncLegacyPAE(arr.join(" ").trim());
  };
  const clearAll = () => {
    writeBridge("031p", "");
    writeBridge("incipitPaec", "");
    // notifica limpieza inmediata al canvas
    window.dispatchEvent(new Event("incipit:clear"));
  };

  // Cabeceras
  const applyClef = (p) => {
    setClef(p);
    writeBridge("031g", p);
    window.dispatchEvent(new CustomEvent("incipit:sync"));
  };
  const applyKey = (n) => {
    setKs(n);
    writeBridge("031n", makeKeyPAE(n));
    window.dispatchEvent(new CustomEvent("incipit:sync"));
  };

  return (
    <div className="grid gap-4 p-3 rounded border bg-white/90">
      {/* Alteraciones */}
      <section>
        <div className="font-semibold mb-1">Alteraciones:</div>
        <div className="flex gap-2 items-center">
          {ACCS.map(({ a, label }) => (
            <button
              key={label}
              onClick={() => setAcc(a)}
              className={`px-2 py-1 rounded border text-xl music-font ${
                acc === a ? "bg-black text-white" : ""
              }`}
            >
              {label}
            </button>
          ))}
          <label className="ml-3 text-xs inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={dot}
              onChange={(e) => setDot(e.target.checked)}
            />
            Puntillo
          </label>
        </div>
      </section>

      {/* Armadura */}
      <section>
        <div className="font-semibold mb-1">Armadura de Compás:</div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={-7}
            max={7}
            step={1}
            value={ks}
            onChange={(e) => applyKey(Number(e.target.value))}
          />
          <span className="w-28 text-center text-sm">
            {ks > 0 ? `+${ks} ♯` : ks < 0 ? `${ks} ♭` : "0 (sin)"}
          </span>
          <button
            className="px-2 py-1 rounded border text-xs"
            onClick={() => applyKey(0)}
          >
            Quitar
          </button>
        </div>
      </section>

      {/* Barras */}
      <section>
        <div className="font-semibold mb-1">Barras de Compás:</div>
        <div className="flex flex-wrap gap-2">
          <button
            className="px-2 py-1 rounded border"
            onClick={() => insertBar("/")}
          >
            |
          </button>
          <button
            className="px-2 py-1 rounded border"
            onClick={() => insertBar("//")}
          >
            ||
          </button>
          <button
            className="px-2 py-1 rounded border"
            onClick={() => insertBar(":/")}
          >
            |:
          </button>
          <button
            className="px-2 py-1 rounded border"
            onClick={() => insertBar("/:")}
          >
            :|
          </button>
          <button
            className="px-2 py-1 rounded border"
            onClick={() => insertBar(":/:")}
          >
            :|:
          </button>
        </div>
      </section>

      {/* Figuras rítmicas */}
      <section>
        <div className="font-semibold mb-1">Figuras Rítmicas:</div>

        {/* Notas: al pulsar, selecciona duración y además inserta una nota */}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {DUR_NOTES.map(({ d, glyph, title }) => (
            <button
              key={`n${d}`}
              title={title}
              onClick={(e) => {
                setDur(d);
                if (e.ctrlKey) return; // Ctrl = solo seleccionar
                insertNote(d); // Click normal = insertar
              }}
              className={`px-2 py-1 rounded border text-xl music-font ${
                dur === d ? "bg-black text-white" : ""
              }`}
            >
              {glyph}
            </button>
          ))}
          <button
            className="ml-3 px-3 py-1 rounded border"
            onClick={() => insertNote()}
          >
            Insertar Nota <span className="ml-1 font-mono">{token}</span>
          </button>
        </div>

        {/* Silencios */}
        <div className="flex flex-wrap items-center gap-2">
          {RESTS.map(({ d, glyph, title }) => (
            <button
              key={`r${d}`}
              title={title}
              onClick={() => insertRest(d)}
              className="px-2 py-1 rounded border text-xl music-font"
            >
              {glyph}
            </button>
          ))}
          <button className="ml-3 px-3 py-1 rounded border" onClick={insertTie}>
            Ligadura =
          </button>
        </div>
      </section>

      {/* Claves */}
      <section>
        <div className="font-semibold mb-1">Claves:</div>
        <div className="flex flex-wrap gap-2">
          {CLEFS.map((c) => (
            <button
              key={c.pae}
              onClick={() => applyClef(c.pae)}
              className={`px-2 py-1 rounded border text-sm ${
                clef === c.pae ? "bg-black text-white" : ""
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </section>

      {/* Altura / Octava */}
      <section className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Altura:</span>
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
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Octava:</span>
          <div className="flex gap-1">
            {OCTS.map(({ o, label }) => (
              <button
                key={label}
                onClick={() => setOct(o)}
                className={`px-2 py-1 rounded border text-sm ${
                  oct === o ? "bg-black text-white" : ""
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <label className="ml-auto inline-flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={space}
            onChange={(e) => setSpace(e.target.checked)}
          />
          Espaciar tokens
        </label>

        <div className="flex gap-2">
          <button className="px-3 py-1 rounded border" onClick={undoLast}>
            Deshacer
          </button>
          <button className="px-3 py-1 rounded border" onClick={clearAll}>
            Limpiar
          </button>
        </div>
      </section>
    </div>
  );
}
