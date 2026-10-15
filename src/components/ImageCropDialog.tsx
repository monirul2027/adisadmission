import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { compressImage } from "@/lib/image-compressor";

type ImageCropDialogProps = {
  file: File | null;
  aspectRatio: number;
  maxSizeBytes: number;
  onCancel: () => void;
  onSave: (file: File) => void;
  onProcessingChange?: (processing: boolean) => void;
};

const FRAME_WIDTH = 340;

export default function ImageCropDialog({ file, aspectRatio, maxSizeBytes, onCancel, onSave, onProcessingChange }: ImageCropDialogProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState("");
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerX: number; pointerY: number; x: number; y: number } | null>(null);
  const imageUrl = useMemo(() => file ? URL.createObjectURL(file) : "", [file]);
  const frame = useMemo(() => {
    const maxHeight = Math.min(420, typeof window === "undefined" ? 420 : Math.max(220, window.innerHeight * 0.52));
    const availableWidth = typeof window === "undefined" ? FRAME_WIDTH : Math.max(240, window.innerWidth - 48);
    const width = Math.min(FRAME_WIDTH, availableWidth, maxHeight * aspectRatio);
    return { width, height: width / aspectRatio };
  }, [aspectRatio]);
  const scaledImage = useMemo(() => {
    if (!image) return null;
    const base = Math.max(frame.width / image.naturalWidth, frame.height / image.naturalHeight);
    return { width: image.naturalWidth * base * zoom, height: image.naturalHeight * base * zoom, scale: base * zoom };
  }, [frame, image, zoom]);

  useEffect(() => {
    if (!imageUrl) { setImage(null); return; }
    const nextImage = new Image();
    nextImage.onload = () => { setImage(nextImage); setZoom(1); setPan({ x: 0, y: 0 }); setError(""); };
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
    if (!image || !scaledImage || !file) return;
    setCompressing(true);
    onProcessingChange?.(true);
    setError("");
    try {
      const canvas = document.createElement("canvas");
      const outputWidth = Math.round(frame.width * 3);
      const outputHeight = Math.round(frame.height * 3);
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Image cropping is not supported in this browser.");
      const left = (frame.width - scaledImage.width) / 2 + pan.x;
      const top = (frame.height - scaledImage.height) / 2 + pan.y;
      const sx = Math.max(0, Math.min(image.naturalWidth, -left / scaledImage.scale));
      const sy = Math.max(0, Math.min(image.naturalHeight, -top / scaledImage.scale));
      const sw = Math.min(image.naturalWidth - sx, frame.width / scaledImage.scale);
      const sh = Math.min(image.naturalHeight - sy, frame.height / scaledImage.scale);
      context.drawImage(image, sx, sy, sw, sh, 0, 0, outputWidth, outputHeight);
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
        <DialogDescription>Drag the image to position it inside the frame, then adjust zoom.</DialogDescription>
      </DialogHeader>
      <div className="relative mx-auto overflow-hidden rounded-lg border bg-muted touch-none" ref={frameRef} style={{ width: frame.width, height: frame.height, maxWidth: "100%" }} onPointerDown={(event) => { if (!scaledImage) return; event.currentTarget.setPointerCapture(event.pointerId); dragRef.current = { pointerX: event.clientX, pointerY: event.clientY, ...pan }; }} onPointerMove={(event) => { if (!dragRef.current) return; const rect = frameRef.current?.getBoundingClientRect(); const factor = rect ? frame.width / rect.width : 1; setPan(clampPan(dragRef.current.x + (event.clientX - dragRef.current.pointerX) * factor, dragRef.current.y + (event.clientY - dragRef.current.pointerY) * factor)); }} onPointerUp={() => { dragRef.current = null; }}>
        {image && scaledImage && <img alt="Crop preview" draggable={false} src={imageUrl} className="pointer-events-none max-w-none select-none" style={{ position: "absolute", width: scaledImage.width, height: scaledImage.height, left: `calc(50% + ${pan.x}px)`, top: `calc(50% + ${pan.y}px)`, transform: "translate(-50%, -50%)" }} />}
      </div>
      <div className="flex items-center gap-3"><ZoomOut className="h-4 w-4 text-muted-foreground" /><Slider aria-label="Image zoom" min={1} max={3} step={0.05} value={[zoom]} onValueChange={(value) => { setZoom(value[0]); setPan((current) => clampPan(current.x, current.y, value[0])); }} /><ZoomIn className="h-4 w-4 text-muted-foreground" /></div>
      {compressing && <p className="inline-flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Compressing...</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter><Button type="button" variant="outline" onClick={onCancel} disabled={compressing}>Cancel</Button><Button type="button" onClick={saveCrop} disabled={!image || compressing}>{compressing ? "Compressing..." : "Crop & Save"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
