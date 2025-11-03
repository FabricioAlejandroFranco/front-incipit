import { useEffect, useRef } from "react";

export default function IncipitCanvas({
  pae = "",
  mode = "list", // "edit" = interactivo (legacy op "add"), "list" = solo render
  width = 800,
  height = 220,
  className = "block w-full bg-white border rounded",
  clickToInsert = true // click inserta el token de la paleta
}) {
  const canvasRef = useRef(null);
  const instanceRef = useRef(null);

  // Cabeceras por defecto (clave, compás; armadura neutra la aporta combinedPAE)
  const SEED_PAE = "%G-2 @4/4";

  const ensureId = (el) => {
    if (!el.id) el.id = "incipit_" + Math.random().toString(36).slice(2);
    return el.id;
  };

  const waitFontsAndFrame = async () => {
    await new Promise((r) => requestAnimationFrame(r));
    if (document.fonts?.ready) {
      try {
        await document.fonts.ready;
      } catch {}
    }
  };

  const destroy = () => {
    try {
      instanceRef.current?.destroy?.();
    } catch {}
    instanceRef.current = null;
  };

  const initLegacy = (canvasId, operation, paeStr) => {
    if (!window.CanvasClass) {
      console.error("CanvasClass no está cargado.");
      return;
    }
    destroy();
    const inst = new window.CanvasClass();
    instanceRef.current = inst;
    inst.initializeCanvas(canvasId, operation, paeStr);
  };

  const read = (id) => (document.getElementById(id)?.value || "").trim();
  const write = (id, v) => {
    const el = document.getElementById(id);
    if (!el) return;
    const next = (v || "").trim();
    if ((el.value || "").trim() === next) return;
    el.value = next;
    el.dispatchEvent(new Event("change", { bubbles: true }));
  };

  // Construye PAE completo (cabeceras + cuerpo) desde los bridges
  const combinedPAE = () => {
    const g = read("031g") || "%G-2";
    const n = read("031n") || "$x";
    const o = read("031o") || "@4/4";
    const p = read("031p") || read("incipitPaec") || "";
    return [g, n, o, p].filter(Boolean).join(" ").trim();
  };

  // --- EDITOR: inicializa una sola vez ---
  useEffect(() => {
    if (mode === "list") return;

    let canceled = false;
    const el = canvasRef.current;
    if (!el) return;
    const id = ensureId(el);

    (async () => {
      await waitFontsAndFrame();
      if (canceled) return;

      const op = "add";
      const initial = pae && pae.trim().startsWith("%") ? pae.trim() : SEED_PAE;

      try {
        initLegacy(id, op, initial);
      } catch (e1) {
        console.error("init editor 1:", e1);
        try {
          initLegacy(id, op, SEED_PAE);
        } catch (e2) {
          console.error("init editor 2:", e2);
        }
      }

      // Click-to-insert (opcional)
      const onClick = (ev) => {
        if (!clickToInsert || ev.button !== 0) return;
        const token = (window.__PAE_TOKEN || "").trim();
        if (!token) return;
        const cur = read("031p") || read("incipitPaec");
        const sep = cur ? " " : "";
        const next = (cur + sep + token).trim();
        write("031p", next);
        write("incipitPaec", next);
        window.dispatchEvent(new CustomEvent("incipit:sync"));
      };
      const onCtx = (ev) => ev.preventDefault();

      // 🔔 SIEMPRE escucha estos eventos (aunque clickToInsert sea false)
      const onSync = () => {
        try {
          const full = combinedPAE() || SEED_PAE;
          instanceRef.current?.initializeCanvas(id, "add", full);
        } catch (e) {
          console.error("incipit:sync redraw failed:", e);
        }
      };
      const onClear = () => {
        try {
          // Limpia cuerpo y redibuja solo cabeceras
          write("031p", "");
          write("incipitPaec", "");
          const full = combinedPAE() || SEED_PAE;
          instanceRef.current?.initializeCanvas(id, "add", full);
        } catch (e) {
          console.error("incipit:clear failed:", e);
        }
      };
      const onRedraw = () => onSync();

      el.addEventListener("click", onClick);
      el.addEventListener("contextmenu", onCtx);
      window.addEventListener("incipit:sync", onSync);
      window.addEventListener("incipit:clear", onClear);
      window.addEventListener("incipit:redraw", onRedraw);

      return () => {
        el.removeEventListener("click", onClick);
        el.removeEventListener("contextmenu", onCtx);
        window.removeEventListener("incipit:sync", onSync);
        window.removeEventListener("incipit:clear", onClear);
        window.removeEventListener("incipit:redraw", onRedraw);
      };
    })();

    return () => {
      canceled = true;
      destroy();
    };
  }, [mode, clickToInsert]);

  // --- LISTA: renderiza cada vez que cambie `pae` ---
  useEffect(() => {
    if (mode !== "list") return;

    let canceled = false;
    const el = canvasRef.current;
    if (!el) return;
    const id = ensureId(el);

    (async () => {
      await waitFontsAndFrame();
      if (canceled) return;
      const op = "list";
      const val = (pae || "").trim();
      try {
        initLegacy(id, op, val || SEED_PAE);
      } catch (e1) {
        console.error("init list 1:", e1);
        try {
          initLegacy(id, op, SEED_PAE);
        } catch (e2) {
          console.error("init list 2:", e2);
        }
      }
    })();

    return () => {
      canceled = true;
      destroy();
    };
  }, [pae, mode]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
    />
  );
}
