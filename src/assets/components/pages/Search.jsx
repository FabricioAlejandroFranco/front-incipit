import { useEffect, useRef, useState } from "react";
import IncipitCanvas from "../IncipitCanvas";
import IncipitToolbar from "../IncipitToolbar";
import IncipitPalette from "../IncipitPalette";
import IncipitMenuClassic from "../IncipitMenuClassic";
import api from "../../../Services/api";

// utils bridges
const readBridge = (id) => (document.getElementById(id)?.value || "").trim();
const writeBridge = (id, v) => {
  const el = document.getElementById(id);
  if (!el) return false;
  const next = (v || "").trim();
  if ((el.value || "").trim() === next) return false;
  el.value = next;
  el.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
};

export default function Search() {
  const [pae, setPae] = useState("");
  const [threshold, setThreshold] = useState(0.3);
  const [windowSize, setWindowSize] = useState(48);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Crear bridges requeridos por el legacy (una sola vez)
  useEffect(() => {
    const ensureInput = (id) => {
      if (!document.getElementById(id)) {
        const input = document.createElement("input");
        input.type = "text";
        input.id = id;
        input.style.display = "none";
        document.body.appendChild(input);
      }
    };
    ["031g", "031n", "031o", "031p", "0312", "incipitPaec"].forEach(
      ensureInput
    );
    ["toneUp", "toneDown"].forEach((id) => {
      if (!document.getElementById(id)) {
        const div = document.createElement("div");
        div.id = id;
        div.style.visibility = "hidden";
        div.style.position = "absolute";
        document.body.appendChild(div);
      }
    });
  }, []);

  // Anti-loop flags
  const pushingFromReactRef = useRef(false); // React -> bridges
  const pullingFromLegacyRef = useRef(false); // bridges -> React

  // React -> bridges (cuando cambia `pae` en React)
  useEffect(() => {
    if (pullingFromLegacyRef.current) {
      pullingFromLegacyRef.current = false;
      return;
    }
    pushingFromReactRef.current = true;
    try {
      writeBridge("031p", pae);
      writeBridge("incipitPaec", pae);
      // fuerza redibujo del editor
      window.dispatchEvent(new CustomEvent("incipit:sync"));
    } finally {
      pushingFromReactRef.current = false;
    }
  }, [pae]);

  // bridges -> React (cuando el legacy escribe en #031p/#incipitPaec)
  useEffect(() => {
    const handler = () => {
      if (pushingFromReactRef.current) return; // ignora eco
      const v = readBridge("031p") || readBridge("incipitPaec");
      if (v !== pae) {
        pullingFromLegacyRef.current = true;
        setPae(v);
      }
    };
    const a = document.getElementById("031p");
    const b = document.getElementById("incipitPaec");
    a?.addEventListener("change", handler);
    b?.addEventListener("change", handler);
    return () => {
      a?.removeEventListener("change", handler);
      b?.removeEventListener("change", handler);
    };
  }, [pae]);

  // búsqueda
  const toNumberLoose = (v, def = 0.3) => {
    const n = Number(String(v ?? "").replace(",", "."));
    return Number.isFinite(n) ? n : def;
  };
  const normalizeResults = (data) =>
    Array.isArray(data) ? data : data.results || data.items || [];

  const runSearch = async (mode) => {
    setErrorMsg("");
    setResults([]);

    const current = (
      readBridge("031p") ||
      readBridge("incipitPaec") ||
      pae
    ).trim();
    if (!current) {
      setErrorMsg("Dibuja o pega un PAE para buscar.");
      return;
    }
    if (current !== pae) setPae(current);

    setLoading(true);
    try {
      const url =
        mode === "similar"
          ? `/incipit/search?mode=similar&pae=${encodeURIComponent(
              current
            )}&threshold=${toNumberLoose(threshold)}`
          : `/incipit/search?mode=substring&pae=${encodeURIComponent(
              current
            )}&window=${parseInt(windowSize, 10) || 48}`;
      const { data } = await api.get(url);
      setResults(normalizeResults(data));
    } catch (e) {
      console.error(e);
      setErrorMsg("No se pudo completar la búsqueda.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Búsqueda por íncipit</h1>

      <label className="text-sm text-gray-600">Cabeceras</label>
      <IncipitToolbar />

      <label className="text-sm text-gray-600">Paleta</label>
      <IncipitPalette />

      <label className="text-sm text-gray-600 mt-2">Editor de íncipit</label>
      <IncipitCanvas pae={pae} mode="edit" width={800} height={220} />

      <div className="flex gap-2 items-center">
        <input
          className="border rounded px-3 py-2 w-full"
          value={pae}
          onChange={(e) => setPae(e.target.value)} // solo setState
          placeholder="o pega PAE aquí (MARC 031 $p)"
        />
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm">threshold</span>
          <input
            type="text"
            className="border rounded px-2 py-1 w-24"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm">window</span>
          <input
            type="number"
            className="border rounded px-2 py-1 w-24"
            value={windowSize}
            onChange={(e) => setWindowSize(e.target.value)}
          />
        </div>
        <button
          onClick={() => runSearch("similar")}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60"
        >
          {loading ? "Buscando..." : "Buscar (similar)"}
        </button>
        <button
          onClick={() => runSearch("substring")}
          disabled={loading}
          className="bg-slate-700 text-white px-4 py-2 rounded disabled:opacity-60"
        >
          {loading ? "Buscando..." : "Buscar (substring)"}
        </button>
      </div>

      {errorMsg && <div className="text-sm text-red-600">{errorMsg}</div>}

      <div className="pt-2">
        <div className="text-sm text-gray-600 mb-2">
          {results.length
            ? `${results.length} resultado(s)`
            : "Sin resultados aún"}
        </div>
        <ul className="space-y-4">
          {results.map((r) => {
            const paeRes = (r.marc_031_p || "").trim();
            return (
              <li
                key={
                  r.id ?? `${r.title}-${Math.random().toString(36).slice(2)}`
                }
                className="border rounded p-3"
              >
                <div className="font-semibold mb-2">
                  {r.title ?? "(Sin título)"}
                </div>
                <div className="text-xs text-gray-600 mb-2">{paeRes}</div>
                <IncipitCanvas
                  key={`res-${r.id}-${paeRes}`}
                  pae={paeRes}
                  mode="list"
                  width={800}
                  height={220}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
