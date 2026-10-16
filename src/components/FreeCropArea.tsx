import { useRef } from "react";

export type CropRect = { x: number; y: number; w: number; h: number }; // fractions 0..1 of image

type Handle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw" | "move";
const MIN = 0.05;

const HANDLES: { h: Handle; cls: string }[] = [
  { h: "n", cls: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 h-3 w-10 cursor-ns-resize" },
  { h: "s", cls: "left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 h-3 w-10 cursor-ns-resize" },
  { h: "w", cls: "top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 h-10 w-3 cursor-ew-resize" },
  { h: "e", cls: "top-1/2 right-0 translate-x-1/2 -translate-y-1/2 h-10 w-3 cursor-ew-resize" },
  { h: "nw", cls: "left-0 top-0 -translate-x-1/2 -translate-y-1/2 h-5 w-5 cursor-nwse-resize" },
  { h: "ne", cls: "right-0 top-0 translate-x-1/2 -translate-y-1/2 h-5 w-5 cursor-nesw-resize" },
  { h: "sw", cls: "left-0 bottom-0 -translate-x-1/2 translate-y-1/2 h-5 w-5 cursor-nesw-resize" },
  { h: "se", cls: "right-0 bottom-0 translate-x-1/2 translate-y-1/2 h-5 w-5 cursor-nwse-resize" },
];

export default function FreeCropArea({ src, width, height, rect, onChange }: { src: string; width: number; height: number; rect: CropRect; onChange: (r: CropRect) => void }) {
  const drag = useRef<{ handle: Handle; px: number; py: number; start: CropRect } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const start = (handle: Handle) => (e: React.PointerEvent) => {
    e.stopPropagation();
    boxRef.current?.setPointerCapture(e.pointerId);
    drag.current = { handle, px: e.clientX, py: e.clientY, start: rect };
  };

  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const bounds = boxRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const dx = (e.clientX - d.px) / bounds.width;
    const dy = (e.clientY - d.py) / bounds.height;
    let { x, y, w, h } = d.start;
    const right = x + w, bottom = y + h;
    if (d.handle === "move") {
      x = Math.min(Math.max(0, x + dx), 1 - w);
      y = Math.min(Math.max(0, y + dy), 1 - h);
    } else {
      if (d.handle.includes("w")) { x = Math.min(Math.max(0, x + dx), right - MIN); w = right - x; }
      if (d.handle.includes("e")) { w = Math.min(Math.max(MIN, w + dx), 1 - x); }
      if (d.handle.includes("n")) { y = Math.min(Math.max(0, y + dy), bottom - MIN); h = bottom - y; }
      if (d.handle.includes("s")) { h = Math.min(Math.max(MIN, h + dy), 1 - y); }
    }
    onChange({ x, y, w, h });
  };

  return (
    <div ref={boxRef} className="relative mx-auto select-none touch-none" style={{ width, height }} onPointerMove={move} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
      <img src={src} alt="Crop preview" draggable={false} className="pointer-events-none h-full w-full" />
      <div
        className="absolute border-2 border-primary cursor-move"
        style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.w * 100}%`, height: `${rect.h * 100}%`, boxShadow: "0 0 0 9999px hsl(var(--foreground) / 0.5)" }}
        onPointerDown={start("move")}
      >
        {HANDLES.map(({ h, cls }) => (
          <span key={h} aria-label={`Crop ${h}`} onPointerDown={start(h)} className={`absolute rounded-sm border border-primary-foreground bg-primary ${cls}`} />
        ))}
      </div>
    </div>
  );
}
