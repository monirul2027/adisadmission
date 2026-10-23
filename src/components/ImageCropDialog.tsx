import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { compressImage } from "@/lib/image-compressor";
import FreeCropArea, { type CropRect } from "@/components/FreeCropArea";

type ImageCropDialogProps = {
  file: File | null;
  /** Fixed ratio (e.g. passport photo). Omit/null for free crop from any side, keeping original shape by default. */
  aspectRatio?: number | null;
  maxSizeBytes: number;
  onCancel: () => void;
  onSave: (file: File) => void;
  onProcessingChange?: (processing: boolean) => void;
};

const FRAME_WIDTH = 340;
const FULL: CropRect = { x: 0, y: 0, w: 1, h: 1 };

export default function ImageCropDialog({ file, aspectRatio, maxSizeBytes, onCancel, onSave, onProcessingChange }: ImageCropDialogProps) {
  const free = !aspectRatio;
  const ratio = aspectRatio || 1;
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [rect, setRect] = useState<CropRect>(FULL);
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState("");
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerX: number; pointerY: number; x: number; y: number } | null>(null);
  const imageUrl = useMemo(() => file ? URL.createObjectURL(file) : "", [file]);
  const maxHeight = Math.min(420, typeof window === "undefined" ? 420 : Math.max(220, window.innerHeight * 0.52));
  const availableWidth = typeof window === "undefined" ? FRAME_WIDTH : Math.max(240, Math.min(400, window.innerWidth - 48));
  const frame = useMemo(() => {
    const width = Math.min(FRAME_WIDTH, availableWidth, maxHeight * ratio);
    return { width, height: width / ratio };
  }, [ratio, availableWidth, maxHeight]);
  const freeFrame = useMemo(() => {
    if (!image) return { width: availableWidth, height: maxHeight };
    const s = Math.min(availableWidth / image.naturalWidth, maxHeight / image.naturalHeight);
    return { width: image.naturalWidth * s, height: image.naturalHeight * s };
  }, [image, availableWidth, maxHeight]);
  const scaledImage = useMemo(() => {
    if (!image) return null;
    const base = Math.max(frame.width / image.naturalWidth, frame.height / image.naturalHeight);
    return { width: image.naturalWidth * base * zoom, height: image.naturalHeight * base * zoom, scale: base * zoom };
  }, [frame, image, zoom]);

  useEffect(() => {
    if (!imageUrl) { setImage(null); return; }
    const nextImage = new Image();
    nextImage.onload = () => { setImage(nextImage); setZoom(1); setPan({ x: 0, y: 0 }); setRect(FULL); setError(""); };
    nextImage.onerror = () => setError("This image could not be opened. Choose a JPG or PNG image.");
    nextImage.src = imageUrl;
    return () => URL.revokeObjectURL(imageUrl);
  }, [imageUrl]);

  const clampPan = (x: number, y: number, nextZoom = zoom) => {
    if (!image) return { x, y };
    const base = Math.max(frame.width / image.naturalWidth, frame.height / image.naturalHeight) * nextZoom;
    const maxX = Math.max(0, (image.naturalWidth * base - frame.width) / 2);
    const maxY = Math.max(0, (image.naturalHeight * base - frame.height) / 2);
    return { x: Math.max(-maxX, Math.min(maxX, x)), y: Math.max(-maxY, Math.min(maxY, y)) };
  };

  const saveCrop = async () => {
    if (!image || !file) return;
    setCompressing(true);
    onProcessingChange?.(true);
    setError("");
    try {
      let sx: number, sy: number, sw: number, sh: number, outW: number, outH: number;
      if (free) {
        sx = rect.x * image.naturalWidth; sy = rect.y * image.naturalHeight;
        sw = rect.w * image.naturalWidth; sh = rect.h * image.naturalHeight;
        outW = Math.round(sw); outH = Math.round(sh);
      } else {
        if (!scaledImage) return;
        const left = (frame.width - scaledImage.width) / 2 + pan.x;
        const top = (frame.height - scaledImage.height) / 2 + pan.y;
        sx = Math.max(0, Math.min(image.naturalWidth, -left / scaledImage.scale));
        sy = Math.max(0, Math.min(image.naturalHeight, -top / scaledImage.scale));
        sw = Math.min(image.naturalWidth - sx, frame.width / scaledImage.scale);
        sh = Math.min(image.naturalHeight - sy, frame.height / scaledImage.scale);
        outW = Math.round(frame.width * 3); outH = Math.round(frame.height * 3);
      }
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, outW);
      canvas.height = Math.max(1, outH);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Image cropping is not supported in this browser.");
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Could not create the cropped image.")), "image/jpeg", 0.92));
      const cropped = new File([blob], file.name.replace(/\.[^.]+$/, "") + "-cropped.jpg", { type: "image/jpeg", lastModified: Date.now() });
      const compressed = await compressImage(cropped, { maxSizeBytes, maxWidthOrHeight: 1600, initialQuality: 0.85 });
      if (compressed.size > maxSizeBytes) throw new Error("The image could not be reduced enough. Try a tighter crop or a smaller image.");
      onSave(compressed);
    } catch (cropError) {
      setError(cropError instanceof Error ? cropError.message : "Could not crop this image.");
    } finally {
      setCompressing(false);
      onProcessingChange?.(false);
    }
  };

  return <Dialog open={Boolean(file)} onOpenChange={(open) => { if (!open && !compressing) onCancel(); }}>
    <DialogContent className="w-[calc(100vw-1rem)] max-w-md p-4 sm:p-6">
      <DialogHeader>
        <DialogTitle>Crop image</DialogTitle>
        <DialogDescription>{free ? "Drag any edge or corner to trim from that side. Leave as is to keep the full document." : "Drag the image to position it inside the frame, then adjust zoom."}</DialogDescription>
      </DialogHeader>
      {free ? (
        image ? <div className="py-2"><FreeCropArea src={imageUrl} width={freeFrame.width} height={freeFrame.height} rect={rect} onChange={setRect} /></div> : <div className="h-40" />
      ) : <>
        <div className="relative mx-auto overflow-hidden rounded-lg border bg-muted touch-none" ref={frameRef} style={{ width: frame.width, height: frame.height, maxWidth: "100%" }} onPointerDown={(event) => { if (!scaledImage) return; event.currentTarget.setPointerCapture(event.pointerId); dragRef.current = { pointerX: event.clientX, pointerY: event.clientY, ...pan }; }} onPointerMove={(event) => { if (!dragRef.current) return; const r = frameRef.current?.getBoundingClientRect(); const factor = r ? frame.width / r.width : 1; setPan(clampPan(dragRef.current.x + (event.clientX - dragRef.current.pointerX) * factor, dragRef.current.y + (event.clientY - dragRef.current.pointerY) * factor)); }} onPointerUp={() => { dragRef.current = null; }}>
          {image && scaledImage && <img alt="Crop preview" draggable={false} src={imageUrl} className="pointer-events-none max-w-none select-none" style={{ position: "absolute", width: scaledImage.width, height: scaledImage.height, left: `calc(50% + ${pan.x}px)`, top: `calc(50% + ${pan.y}px)`, transform: "translate(-50%, -50%)" }} />}
        </div>
        <div className="flex items-center gap-3"><ZoomOut className="h-4 w-4 text-muted-foreground" /><Slider aria-label="Image zoom" min={1} max={3} step={0.05} value={[zoom]} onValueChange={(value) => { setZoom(value[0]); setPan((current) => clampPan(current.x, current.y, value[0])); }} /><ZoomIn className="h-4 w-4 text-muted-foreground" /></div>
      </>}
      {compressing && <p className="inline-flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Compressing...</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter className="gap-2">
        {free && <Button type="button" variant="ghost" onClick={() => setRect(FULL)} disabled={compressing}>Reset</Button>}
        <Button type="button" variant="outline" onClick={onCancel} disabled={compressing}>Cancel</Button>
        <Button type="button" onClick={saveCrop} disabled={!image || compressing}>{compressing ? "Compressing..." : "Crop & Save"}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
