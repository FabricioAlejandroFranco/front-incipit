import { useEffect, useRef } from "react";

/**
 * Wrapper mínimo para tu editor Canvas legacy.
 * Ajusta las líneas marcadas si tu constructor o métodos tienen otro nombre/firma.
 */
export default function IncipitEditor({ mode = "add", value = "", onChange }) {
  const canvasRef = useRef(null);
  const instRef = useRef(null);

  useEffect(() => {
    // Verificación básica
    if (!window.CanvasClass || !canvasRef.current) {
      console.warn("CanvasClass no está disponible o canvasRef es nulo.");
      return;
    }

    // ⬇️ INICIALIZACIÓN: ajusta a tu firma real si difiere
    try {
      instRef.current = new window.CanvasClass({
        canvas: canvasRef.current, // si tu clase espera un id string, usa canvasRef.current.id
        mode, // "view" | "add" | "edit"
        pae: value, // PAE inicial
        onUpdate: (newPAE) => onChange?.(newPAE) // callback al cambiar
      });

      // Algunos legacies exponen initialize/draw; otros dibujan en el constructor:
      instRef.current.initializeCanvas?.();
      instRef.current.drawPentagram?.(); // opcional, si existe
    } catch (e) {
      console.error("Error creando CanvasClass:", e);
    }

    // Limpieza al desmontar (importante para evitar listeners colgando)
    return () => {
      try {
        instRef.current?.destroy?.();
      } catch (_) {}
      instRef.current = null;
    };
  }, [mode]);

  // Sincroniza cambios externos de `value` hacia el editor
  useEffect(() => {
    try {
      instRef.current?.setPAE?.(value);
    } catch (_) {}
  }, [value]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={220}
      className="w-full border rounded"
    />
  );
}
