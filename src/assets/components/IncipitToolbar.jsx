import { useMemo, useState } from "react";

// Bridges
function writeBridge(id, v) {
  const el = document.getElementById(id);
  if (el) {
    el.value = v;
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }
}
function readBridge(id) {
  return (document.getElementById(id)?.value || "").trim();
}
const SHARP_ORDER = ["F", "C", "G", "D", "A", "E", "B"];
const FLAT_ORDER = ["B", "E", "A", "D", "G", "C", "F"];

function makeKeyPAE(n) {
  if (!Number.isFinite(n) || n === 0) return "$x";
  return n > 0
    ? "$" + SHARP_ORDER.slice(0, n).join("")
    : "$b" + FLAT_ORDER.slice(0, Math.abs(n)).join("");
}
function makeTimePAE(num, den) {
  const N = parseInt(num, 10) || 4;
  const D = parseInt(den, 10) || 4;
  return `@${N}/${D}`;
}

const CLEFS = [
  { label: "G-2 (Sol estándar)", pae: "%G-2" },
  { label: "F-4 (Fa en 4ª, Bajo)", pae: "%F-4" },
  { label: "C-3 (Do en 3ª, Alto)", pae: "%C-3" },
  { label: "C-4 (Do en 4ª, Tenor)", pae: "%C-4" },
  { label: "G-1 (Sol en 1ª, Francés)", pae: "%G-1" },
  { label: "F-3 (Fa en 3ª, Barítono)", pae: "%F-3" }
];

export default function IncipitToolbar() {
  const [clef, setClef] = useState(readBridge("031g") || "%G-2");
  const [acc, setAcc] = useState(0); // -7..+7
  const [num, setNum] = useState(4);
  const [den, setDen] = useState(4);

  const keyPAE = useMemo(() => makeKeyPAE(Number(acc)), [acc]);
  const timePAE = useMemo(() => makeTimePAE(num, den), [num, den]);

  const applyClef = (paeClef) => {
    setClef(paeClef);
    writeBridge("031g", paeClef);
    writeBridge("incipitPaec", readBridge("031p"));
    window.dispatchEvent(new CustomEvent("incipit:sync"));
  };
  const applyKey = () => {
    writeBridge("031n", keyPAE);
    writeBridge("incipitPaec", readBridge("031p"));
    window.dispatchEvent(new CustomEvent("incipit:sync"));
  };
  const applyTime = () => {
    writeBridge("031o", timePAE);
    writeBridge("incipitPaec", readBridge("031p"));
    window.dispatchEvent(new CustomEvent("incipit:sync"));
  };

  const setTime = (n, d) => {
    setNum(n);
    setDen(d);
  };

  return (
    <div className="grid gap-3 p-3 rounded border bg-white/80">
      {/* Clave */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium w-20">Clave</span>
        <select
          value={clef}
          onChange={(e) => applyClef(e.target.value)}
          className="border rounded px-2 py-1"
        >
          {CLEFS.map((c) => (
            <option key={c.pae} value={c.pae}>
              {c.label}
            </option>
          ))}
        </select>
        <button
          onClick={() => applyClef(clef)}
          className="px-3 py-1 rounded border"
        >
          Aplicar
        </button>
        <span className="text-xs text-gray-500 ml-2">PAE: {clef}</span>
      </div>

      {/* Armadura */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium w-20">Armadura</span>
        <input
          type="range"
          min={-7}
          max={7}
          step={1}
          value={acc}
          onChange={(e) => setAcc(Number(e.target.value))}
        />
        <span className="w-24 text-center text-sm">
          {acc > 0 ? `+${acc} ♯` : acc < 0 ? `${acc} ♭` : "0 (sin)"}
        </span>
        <button onClick={applyKey} className="px-3 py-1 rounded border">
          Aplicar
        </button>
        <span className="text-xs text-gray-500 ml-2">PAE: {keyPAE}</span>
      </div>

      {/* Compás */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium w-20">Compás</span>
        <input
          type="number"
          className="border rounded px-2 py-1 w-20"
          value={num}
          onChange={(e) => setNum(e.target.value)}
        />
        <span>/</span>
        <input
          type="number"
          className="border rounded px-2 py-1 w-20"
          value={den}
          onChange={(e) => setDen(e.target.value)}
        />
        <button onClick={applyTime} className="px-3 py-1 rounded border">
          Aplicar
        </button>

        <div className="flex gap-2 ml-2">
          {[
            ["2/4", 2, 4],
            ["3/4", 3, 4],
            ["4/4", 4, 4],
            ["6/8", 6, 8]
          ].map(([lbl, n, d]) => (
            <button
              key={lbl}
              onClick={() => {
                setTime(n, d);
                applyTime();
              }}
              className="px-2 py-1 rounded border text-xs"
            >
              {lbl}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-500 ml-2">PAE: {timePAE}</span>
      </div>
    </div>
  );
}
