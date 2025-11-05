import { useEffect, useMemo, useRef, useState } from "react";

/* ===== ESCALA / TAMAÑO ===== */
const LINE_GAP = 24; // distancia entre líneas del pentagrama
const DEFAULT_WIDTH = 860;
const DEFAULT_HEIGHT = 260;

/* === NUEVO: escala sólo para las NOTAS (no afecta a las claves) === */
const NOTE_SCALE = 0.58; // 0.78–0.90 según prefieras

/* ===== MÉTRICAS derivadas del gap ===== */
const MARGIN_LEFT = Math.round(LINE_GAP * 2.2);
const MARGIN_RIGHT = Math.round(LINE_GAP * 1.6);

const STAFF = {
  top: 70,
  lineGap: LINE_GAP,
  lines: 5,
  updateTop(cssH) {
    this.top = Math.round(cssH / 2 - ((this.lines - 1) * this.lineGap) / 2);
  },
  get bottomY() {
    return this.top + (this.lines - 1) * this.lineGap;
  },
  get unit() {
    return this.lineGap / 2;
  },

  /* === AJUSTES DE TAMAÑO DE NOTAS (aplican NOTE_SCALE) === */
  get stemLen() {
    return this.lineGap * 3.3 * NOTE_SCALE;
  },
  get headRx() {
    return this.lineGap * 0.62 * NOTE_SCALE;
  },
  get headRy() {
    return this.lineGap * 0.48 * NOTE_SCALE;
  },
  get dotR() {
    return this.lineGap * 0.12 * NOTE_SCALE;
  },
  get accFs() {
    return Math.round(this.lineGap * 0.92 * NOTE_SCALE);
  }
};

/* ===== PAE cabecera ===== */
const SHARP_ORDER = ["F", "C", "G", "D", "A", "E", "B"];
const FLAT_ORDER = ["B", "E", "A", "D", "G", "C", "F"];
const keyToPAE = (n) => {
  if (!Number.isFinite(n) || n === 0) return "$x";
  return n > 0
    ? "$" + SHARP_ORDER.slice(0, n).join("")
    : "$b" + FLAT_ORDER.slice(0, Math.abs(n)).join("");
};

/* ===== Claves ===== */
const CLEFS = {
  G: { code: "%G-2", symbol: "𝄞", lineIndex: 1 },
  F: { code: "%F-4", symbol: "𝄢", lineIndex: 3 },
  C: { code: "%C-3", symbol: "𝄡", lineIndex: 2 }
};
/* (mantengo tamaños/offsets de claves SIN cambios) */
const CLEF_DRAW = {
  G: { fsMul: 5.0, xOff: 8, yOff: -0.48 },
  F: { fsMul: 5.0, xOff: 11, yOff: +0.72 },
  C: { fsMul: 4.4, xOff: 9, yOff: +0.48 }
};
const CLEF_LIST = [
  { id: "G", label: "Sol", icon: "𝄞" },
  { id: "F", label: "Fa", icon: "𝄢" },
  { id: "C", label: "Do", icon: "𝄡" }
];

/* ===== Paleta ===== */
const DURATIONS = [
  { d: 1, label: "𝅝" },
  { d: 2, label: "𝅗𝅥" },
  { d: 4, label: "♩" },
  { d: 8, label: "♪" },
  { d: 16, label: "♫" }
];
const ALTERATIONS = [
  { code: "", label: "—" },
  { code: "x", label: "♯" },
  { code: "b", label: "♭" },
  { code: "n", label: "♮" }
];
const BARS = [
  { code: "/", label: "|" },
  { code: "//", label: "||" },
  { code: ":/", label: "|:" },
  { code: "/:", label: ":|" },
  { code: ":/:", label: ":|:" }
];
const TIMES = ["@2/4", "@3/4", "@4/4", "@6/8", "@3/8", "@9/8", "@12/8"];

/* ===== Helpers diatónicos/PAE ===== */
const STEP_INDEX = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
const INDEX_STEP = ["C", "D", "E", "F", "G", "A", "B"];
const octMarkToNum = (m = "") =>
  m === "''" ? 6 : m === "'" ? 5 : m === "," ? 3 : m === ",, " ? 2 : 4;
const diatonicIndex = (step, oct) => oct * 7 + STEP_INDEX[step];
const pitchFromIndex = (ix) => {
  const oct = Math.floor(ix / 7);
  const step = INDEX_STEP[((ix % 7) + 7) % 7];
  return { step, oct };
};
const octNumToMark = (n) =>
  n >= 6 ? "''" : n === 5 ? "'" : n === 4 ? "" : n === 3 ? "," : ",,";

const lineIndexToY = (lineIdxFromBottom) =>
  STAFF.bottomY - lineIdxFromBottom * STAFF.lineGap;

const CLEF_BOTTOM_PITCH = {
  G: { step: "E", oct: 4 },
  F: { step: "G", oct: 2 },
  C: { step: "F", oct: 3 }
};
const stepOctToY = (step, oct, clefId) => {
  const ref = CLEF_BOTTOM_PITCH[clefId];
  const diff = diatonicIndex(step, oct) - diatonicIndex(ref.step, ref.oct);
  return STAFF.bottomY - diff * STAFF.unit;
};
const yToStepOct = (yCss, clefId) => {
  const ref = CLEF_BOTTOM_PITCH[clefId];
  const diff = Math.round((STAFF.bottomY - yCss) / STAFF.unit);
  const { step, oct } = pitchFromIndex(diatonicIndex(ref.step, ref.oct) + diff);
  return { step, oct: Math.max(2, Math.min(6, oct)) };
};

const noteToToken = (n) => {
  if (n.bar) return n.code;
  if (n.rest) return `${n.dur}-`;
  const acc = n.acc ?? "";
  const dot = n.dot ? "." : "";
  const oct = octNumToMark(n.oct);
  return `${n.step}${acc}${oct}${n.dur}${dot}`;
};
const tokenToNotes = (body) => {
  const out = [];
  const parts = (body || "").trim().split(/\s+/).filter(Boolean);
  for (const t of parts) {
    if (t === "/" || t === "//" || t === ":/" || t === "/:" || t === ":/:") {
      out.push({ bar: true, code: t });
      continue;
    }
    if (/^\d+-$/i.test(t)) {
      out.push({ rest: true, dur: parseInt(t, 10) || 4 });
      continue;
    }
    const m = t.match(/^([A-G])([xbn]?)([,']{0,2}|''|,,)?(\d+)(\.)?$/);
    if (!m) continue;
    const [, step, acc, octMark = "", dur, dot] = m;
    out.push({
      step,
      acc: acc || "",
      oct: octMarkToNum(octMark),
      dur: parseInt(dur, 10) || 4,
      dot: !!dot
    });
  }
  return out;
};

/* ===== Dibujo ===== */
function drawStaff(ctx, cssW, cssH) {
  STAFF.updateTop(cssH);
  ctx.clearRect(0, 0, cssW, cssH);
  ctx.strokeStyle = "#121212";
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const y = STAFF.top + i * STAFF.lineGap;
    ctx.beginPath();
    ctx.moveTo(MARGIN_LEFT, y);
    ctx.lineTo(cssW - MARGIN_RIGHT, y);
    ctx.stroke();
  }
}
function drawClef(ctx, clefId) {
  const cd = CLEF_DRAW[clefId];
  const fs = Math.round(STAFF.lineGap * cd.fsMul);
  const x = MARGIN_LEFT + cd.xOff;
  const yLn = lineIndexToY(CLEFS[clefId].lineIndex);
  const y = yLn + cd.yOff * STAFF.lineGap;

  ctx.save();
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#101010";
  ctx.font = `${fs}px 'Noto Music','Bravura','Sebastian','Segoe UI Symbol','Arial Unicode MS',system-ui,sans-serif`;
  ctx.fillText(CLEFS[clefId].symbol, x, y);
  ctx.restore();
}
function drawLedgerLines(ctx, x, y) {
  const half = STAFF.headRx + 4; // (ligeramente menor por notas más pequeñas)
  ctx.save();
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 1.4;
  for (let yy = STAFF.top - STAFF.lineGap; yy >= y; yy -= STAFF.lineGap) {
    ctx.beginPath();
    ctx.moveTo(x - half, yy);
    ctx.lineTo(x + half, yy);
    ctx.stroke();
  }
  for (let yy = STAFF.bottomY + STAFF.lineGap; yy <= y; yy += STAFF.lineGap) {
    ctx.beginPath();
    ctx.moveTo(x - half, yy);
    ctx.lineTo(x + half, yy);
    ctx.stroke();
  }
  ctx.restore();
}
function drawNote(ctx, x, y, dur, acc, dot, ghost = false) {
  ctx.save();
  ctx.strokeStyle = ghost ? "rgba(30,64,175,0.80)" : "#0e0e0f";
  ctx.fillStyle = ghost ? "rgba(30,64,175,0.28)" : "#0e0e0f";
  ctx.lineWidth = 1.6;

  drawLedgerLines(ctx, x, y);

  const hollow = dur <= 2;
  ctx.beginPath();
  ctx.ellipse(x, y, STAFF.headRx, STAFF.headRy, -0.35, 0, Math.PI * 2);
  if (!hollow) ctx.fill();
  ctx.stroke();

  if (dur >= 2) {
    ctx.beginPath();
    ctx.moveTo(x + STAFF.headRx, y);
    ctx.lineTo(x + STAFF.headRx, y - STAFF.stemLen);
    ctx.stroke();
    if (dur >= 8) {
      ctx.beginPath();
      ctx.moveTo(x + STAFF.headRx, y - STAFF.stemLen);
      ctx.quadraticCurveTo(
        x + STAFF.headRx + 11,
        y - STAFF.stemLen + 6,
        x + STAFF.headRx - 2,
        y - STAFF.stemLen + 12
      );
      ctx.stroke();
      if (dur >= 16) {
        ctx.beginPath();
        ctx.moveTo(x + STAFF.headRx, y - STAFF.stemLen + 10);
        ctx.quadraticCurveTo(
          x + STAFF.headRx + 11,
          y - STAFF.stemLen + 16,
          x + STAFF.headRx - 2,
          y - STAFF.stemLen + 22
        );
        ctx.stroke();
      }
    }
  }

  if (acc) {
    ctx.fillStyle = ghost ? "rgba(30,64,175,0.95)" : "#0e0e0f";
    ctx.font = `${STAFF.accFs}px system-ui, 'Segoe UI Symbol', Arial`;
    const sym = acc === "x" ? "♯" : acc === "b" ? "♭" : "♮";
    ctx.fillText(sym, x - (STAFF.headRx + 14), y + 6); // offsets un poco menores
  }
  if (dot) {
    ctx.beginPath();
    ctx.arc(x + STAFF.headRx + 6, y - 4, STAFF.dotR, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/* ===== HiDPI limpio ===== */
function setupHiDPICanvas(canvas, cssW, cssH) {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, cssW, cssH };
}

/* ===== Componente ===== */
export default function IncipitCanvas() {
  const [clefId, setClefId] = useState("G");
  const [keySteps, setKeySteps] = useState(0);
  const [time, setTime] = useState("@4/4");

  const [dur, setDur] = useState(4);
  const [acc, setAcc] = useState("");
  const [dot, setDot] = useState(false);

  const [items, setItems] = useState([]);
  const [body, setBody] = useState("");

  const [hover, setHover] = useState(null);

  const canvasRef = useRef(null);
  const sizeRef = useRef({ cssW: DEFAULT_WIDTH, cssH: DEFAULT_HEIGHT });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parentW = canvas.parentElement?.clientWidth || DEFAULT_WIDTH;
    sizeRef.current.cssW = Math.min(1000, Math.max(680, parentW - 32));
    sizeRef.current.cssH = DEFAULT_HEIGHT;

    const { ctx, cssW, cssH } = setupHiDPICanvas(
      canvas,
      sizeRef.current.cssW,
      sizeRef.current.cssH
    );

    drawStaff(ctx, cssW, cssH);
    drawClef(ctx, clefId);

    let x = MARGIN_LEFT + Math.round(LINE_GAP * 3.9);
    const stepX = Math.round(LINE_GAP * 1.5); // espaciado entre notas

    for (const it of items) {
      if (it.bar) {
        ctx.beginPath();
        ctx.moveTo(x, STAFF.top - 1);
        ctx.lineTo(x, STAFF.bottomY + 1);
        ctx.strokeStyle = "#111";
        ctx.lineWidth = 2;
        ctx.stroke();
        x += Math.round(stepX * 0.5);
        continue;
      }
      const y = stepOctToY(it.step, it.oct, clefId);
      drawNote(ctx, x, y, it.dur, it.acc, it.dot, false);
      x += stepX;
    }

    if (hover) {
      const yGhost = stepOctToY(hover.step, hover.oct, clefId);
      ctx.save();
      ctx.strokeStyle = "rgba(30,64,175,0.35)";
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(x, STAFF.top - LINE_GAP);
      ctx.lineTo(x, STAFF.bottomY + LINE_GAP);
      ctx.stroke();
      ctx.restore();

      drawNote(ctx, x, yGhost, dur, acc, dot, true);
    }
  }, [items, clefId, hover, dur, acc, dot]);

  useEffect(() => {
    setBody(items.map(noteToToken).join(" "));
  }, [items]);
  useEffect(() => {
    const parsed = tokenToNotes(body).map((n) =>
      n.bar
        ? { bar: true, code: n.code ?? n.bar }
        : n.rest
        ? { rest: true, dur: n.dur }
        : { step: n.step, acc: n.acc, oct: n.oct, dur: n.dur, dot: n.dot }
    );
    const same =
      parsed.length === items.length &&
      parsed.every((p, i) => JSON.stringify(p) === JSON.stringify(items[i]));
    if (!same) setItems(parsed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body]);

  const onClick = (e) => {
    const c = canvasRef.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    const yCss = e.clientY - r.top;
    if (e.shiftKey) {
      setItems((p) => [...p, { bar: true, code: "/" }]);
      return;
    }
    const { step, oct } = yToStepOct(yCss, clefId);
    setItems((p) => [...p, { step, oct, dur, acc, dot }]);
  };
  const onMouseMove = (e) => {
    const c = canvasRef.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    setHover(yToStepOct(e.clientY - r.top, clefId));
  };
  const onMouseLeave = () => setHover(null);

  const handleUndo = () => setItems((p) => p.slice(0, -1));
  const handleClear = () => {
    setItems([]);
    setBody("");
    setHover(null);
  };

  const fullPAE = useMemo(
    () => `${CLEFS[clefId].code} ${keyToPAE(keySteps)} ${time} ${body}`.trim(),
    [clefId, keySteps, time, body]
  );

  return (
    <div className="flex gap-6">
      {/* Sidebar (igual) */}
      <div className="w-64 bg-white border rounded-lg p-4 space-y-4">
        <h2 className="font-bold text-sm text-gray-700">Menú del Íncipit</h2>

        {/* Claves */}
        <div>
          <div className="text-xs font-semibold mb-2 text-gray-600">
            Claves (afectan el mapeo):
          </div>
          <div className="flex gap-2">
            {CLEF_LIST.map((c) => (
              <button
                key={c.id}
                title={c.label}
                onClick={() => setClefId(c.id)}
                className={`w-12 h-12 flex items-center justify-center text-3xl border rounded ${
                  clefId === c.id
                    ? "bg-amber-800 text-white"
                    : "bg-amber-700 text-white hover:bg-amber-800"
                }`}
              >
                {c.icon}
              </button>
            ))}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            PAE: {CLEFS[clefId].code}
          </div>
        </div>

        {/* Alteraciones */}
        <div>
          <div className="text-xs font-semibold mb-2 text-gray-600">
            Alteraciones:
          </div>
          <div className="flex gap-2 flex-wrap">
            {ALTERATIONS.map((a) => (
              <button
                key={a.code}
                onClick={() => setAcc(a.code)}
                className={`w-10 h-10 flex items-center justify-center text-xl border rounded ${
                  acc === a.code
                    ? "bg-amber-800 text-white"
                    : "bg-amber-700 text-white hover:bg-amber-800"
                }`}
              >
                {a.label}
              </button>
            ))}
            <label className="flex items-center text-xs ml-2">
              <input
                type="checkbox"
                className="mr-1"
                checked={dot}
                onChange={(e) => setDot(e.target.checked)}
              />
              Puntillo
            </label>
          </div>
        </div>

        {/* Barras */}
        <div>
          <div className="text-xs font-semibold mb-2 text-gray-600">
            Barras de compás:
          </div>
          <div className="flex gap-2 flex-wrap">
            {BARS.map((b) => (
              <button
                key={b.code}
                onClick={() =>
                  setItems((p) => [...p, { bar: true, code: b.code }])
                }
                className="px-3 py-2 bg-amber-700 text-white text-sm rounded hover:bg-amber-800"
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Figuras */}
        <div>
          <div className="text-xs font-semibold mb-2 text-gray-600">
            Figuras rítmicas:
          </div>
          <div className="grid grid-cols-4 gap-2">
            {DURATIONS.map((x) => (
              <button
                key={x.d}
                onClick={() => setDur(x.d)}
                className={`h-12 flex items-center justify-center text-2xl border rounded ${
                  dur === x.d
                    ? "bg-amber-800 text-white"
                    : "bg-amber-700 text-white hover:bg-amber-800"
                }`}
              >
                <span className="leading-none">{x.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Compás */}
        <div>
          <div className="text-xs font-semibold mb-2 text-gray-600">
            Compás:
          </div>
          <div className="grid grid-cols-4 gap-1">
            {TIMES.map((t) => (
              <button
                key={t}
                onClick={() => setTime(t)}
                className={`px-2 py-1 text-xs border rounded ${
                  time === t
                    ? "bg-amber-800 text-white"
                    : "bg-amber-700 text-white hover:bg-amber-800"
                }`}
              >
                {t.replace("@", "")}
              </button>
            ))}
          </div>
        </div>

        {/* Armadura */}
        <div>
          <div className="text-xs font-semibold mb-2 text-gray-600">
            Armadura (♯/♭):
          </div>
          <div className="grid grid-cols-4 gap-1">
            {[-7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7].map((k) => (
              <button
                key={k}
                onClick={() => setKeySteps(k)}
                className={`px-2 py-1 text-xs border rounded ${
                  keySteps === k
                    ? "bg-amber-800 text-white"
                    : "bg-amber-700 text-white hover:bg-amber-800"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            PAE: {keyToPAE(keySteps)}
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex flex-col">
        <div className="bg-white border rounded-lg p-4 mb-4 flex justify-between items-center">
          <div>
            <h1 className="text-base font-bold text-gray-800">
              Búsqueda por íncipit
            </h1>
            <p className="text-xs text-gray-500">
              Click = nota | Shift+Click = barra | guía vertical
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleUndo}
              className="px-3 py-2 bg-amber-700 text-white rounded hover:bg-amber-800 text-sm"
            >
              Borrar nota
            </button>
            <button
              onClick={handleClear}
              className="px-3 py-2 bg-amber-700 text-white rounded hover:bg-amber-800 text-sm"
            >
              Borrar íncipit
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <canvas
            ref={canvasRef}
            width={DEFAULT_WIDTH}
            height={DEFAULT_HEIGHT}
            className="w-full bg-white rounded border-2 border-gray-200"
            onClick={onClick}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
            onContextMenu={(e) => e.preventDefault()}
          />
        </div>

        {/* PAE */}
        <div className="bg-white border rounded-lg p-4 mt-4">
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-600 font-medium">
              Código P&E (cuerpo):
            </label>
            <div className="text-xs text-gray-500">
              Cabecera:&nbsp;
              <code className="bg-gray-100 px-2 py-1 rounded">
                {CLEFS[clefId].code} {keyToPAE(keySteps)} {time}
              </code>
            </div>
          </div>
          <input
            type="text"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Ej: G'4 A'4 B'4 / C''4 ..."
            className="mt-2 w-full px-3 py-2 border rounded font-mono text-sm"
          />
          <div className="mt-2 text-xs text-gray-600">
            PAE completo:&nbsp;
            <code className="bg-gray-50 px-2 py-1 rounded">
              {`${CLEFS[clefId].code} ${keyToPAE(
                keySteps
              )} ${time} ${body}`.trim()}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
