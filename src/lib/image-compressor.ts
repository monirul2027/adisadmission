export type ImageCompressionOptions = {
  maxSizeBytes: number;
  maxWidthOrHeight: number;
  initialQuality?: number;
};

const loadImage = (file: File) => new Promise<HTMLImageElement>((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
  image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("The selected image could not be read.")); };
  image.src = url;
});

const canvasBlob = (canvas: HTMLCanvasElement, quality: number) => new Promise<Blob>((resolve, reject) => {
  canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("The image could not be optimized.")), "image/jpeg", quality);
});

/** Compresses image uploads in-browser while preserving their visible quality. */
export async function compressImage(file: File, options: ImageCompressionOptions): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  const image = await loadImage(file);
  const maxDimension = Math.max(image.naturalWidth, image.naturalHeight);
  const maxScale = Math.min(1, options.maxWidthOrHeight / maxDimension);
  let best: Blob | null = null;
  for (const dimensionScale of [1, 0.82, 0.66, 0.5, 0.38]) {
    const scale = maxScale * dimensionScale;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser does not support image optimization.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [options.initialQuality ?? 0.85, 0.75, 0.6, 0.45, 0.3]) {
      const candidate = await canvasBlob(canvas, quality);
      if (!best || candidate.size < best.size) best = candidate;
      if (candidate.size <= options.maxSizeBytes) break;
    }
    if (best.size <= options.maxSizeBytes) break;
  }
  if (!best || best.size > options.maxSizeBytes) throw new Error(`This image cannot be reduced below ${Math.round(options.maxSizeBytes / 1024)} KB. Try a tighter crop.`);
  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([best], `${baseName}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
}
