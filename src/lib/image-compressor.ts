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
  const scale = Math.min(1, options.maxWidthOrHeight / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser does not support image optimization.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  let best = await canvasBlob(canvas, options.initialQuality ?? 0.85);
  for (const quality of [0.75, 0.6, 0.45, 0.3]) {
    if (best.size <= options.maxSizeBytes) break;
    best = await canvasBlob(canvas, quality);
  }
  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([best], `${baseName}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
}
