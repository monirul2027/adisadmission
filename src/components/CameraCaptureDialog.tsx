import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export type CameraCaptureMode = "photo" | "document" | "signature";

type FacingMode = "user" | "environment";

type CameraCaptureDialogProps = {
  mode?: CameraCaptureMode;
  title?: string;
  description?: string;
  onCapture: (file: File) => void;
  onCancel: () => void;
};

type ExtendedTrackCapabilities = MediaTrackCapabilities & {
  focusMode?: string[];
  exposureMode?: string[];
};

type ExtendedTrackConstraintSet = MediaTrackConstraintSet & {
  focusMode?: string;
  exposureMode?: string;
};

type PhotoCapabilitiesRange = {
  min?: number;
  max?: number;
  step?: number;
};

type NativePhotoCapabilities = {
  imageWidth?: PhotoCapabilitiesRange;
  imageHeight?: PhotoCapabilitiesRange;
};

type NativePhotoSettings = {
  imageWidth?: number;
  imageHeight?: number;
};

type NativeImageCaptureInstance = {
  takePhoto: (settings?: NativePhotoSettings) => Promise<Blob>;
  getPhotoCapabilities?: () => Promise<NativePhotoCapabilities>;
};

type NativeImageCaptureConstructor = new (track: MediaStreamTrack) => NativeImageCaptureInstance;

type DecodedDrawable = {
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
};

const SIGNATURE_GUIDE = {
  viewWidth: 480,
  viewHeight: 270,
  x: 32,
  y: 65,
  width: 416,
  height: 140,
} as const;

const MODE_CONFIG: Record<
  CameraCaptureMode,
  {
    defaultTitle: string;
    defaultDescription: string;
    fileName: string;
    viewportClass: string;
  }
> = {
  photo: {
    defaultTitle: "Take Student Photo",
    defaultDescription: "Center the student's face inside the passport guide, then tap Capture.",
    fileName: "student-photo.jpg",
    viewportClass: "aspect-[3.5/4.5] max-w-[300px] max-h-[55vh]",
  },
  document: {
    defaultTitle: "Capture Document",
    defaultDescription: "Align the full document inside the portrait frame using the rear camera, then tap Capture.",
    fileName: "document.jpg",
    viewportClass: "aspect-[3/4] max-w-[min(340px,calc(60vh*0.75))] max-h-[60vh]",
  },
  signature: {
    defaultTitle: "Capture Signature",
    defaultDescription: "Align the signature inside the horizontal box using the rear camera, then tap Capture.",
    fileName: "signature.jpg",
    viewportClass: "aspect-[16/9] max-w-[min(380px,calc(50vh*16/9))] max-h-[50vh]",
  },
};

const getCameraErrorCopy = (error: unknown): { title: string; description: string } => {
  const name = error instanceof DOMException || error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError") {
    return {
      title: "Camera permission denied",
      description: "Please allow camera access in your browser settings, or select a file from your device instead.",
    };
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError" || name === "OverconstrainedError") {
    return {
      title: "No camera found",
      description: "No compatible camera was detected on this device. Please select a file from your device instead.",
    };
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return {
      title: "Camera is busy",
      description: "Your camera is being used by another app. Close it and try again, or select a file instead.",
    };
  }
  return {
    title: "Camera unavailable",
    description: "Could not start the camera right now. Please try again or select a file instead.",
  };
};

const canvasToJpegBlob = (canvas: HTMLCanvasElement, quality = 0.92): Promise<Blob> =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) => (value ? resolve(value) : reject(new Error("Could not encode captured photo."))),
      "image/jpeg",
      quality,
    );
  });

const decodeBlobToDrawable = async (blob: Blob): Promise<DecodedDrawable> => {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(blob);
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      cleanup: () => bitmap.close(),
    };
  }
  const objectUrl = URL.createObjectURL(blob);
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not decode captured photo."));
    };
    img.src = objectUrl;
  });
  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    cleanup: () => URL.revokeObjectURL(objectUrl),
  };
};

const drawSignatureStripToCanvas = (
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  boxW: number,
  boxH: number,
): HTMLCanvasElement => {
  // Strictly export only the visible signature strip cutout inside the object-cover viewport.
  const scale = Math.max(boxW / srcW, boxH / srcH);
  const scaledW = srcW * scale;
  const scaledH = srcH * scale;
  const offsetX = (scaledW - boxW) / 2;
  const offsetY = (scaledH - boxH) / 2;

  const px = (SIGNATURE_GUIDE.x / SIGNATURE_GUIDE.viewWidth) * boxW;
  const py = (SIGNATURE_GUIDE.y / SIGNATURE_GUIDE.viewHeight) * boxH;
  const pw = (SIGNATURE_GUIDE.width / SIGNATURE_GUIDE.viewWidth) * boxW;
  const ph = (SIGNATURE_GUIDE.height / SIGNATURE_GUIDE.viewHeight) * boxH;

  const sx = Math.max(0, Math.min(srcW - 1, Math.round((px + offsetX) / scale)));
  const sy = Math.max(0, Math.min(srcH - 1, Math.round((py + offsetY) / scale)));
  const sWidth = Math.max(1, Math.min(srcW - sx, Math.round(pw / scale)));
  const sHeight = Math.max(1, Math.min(srcH - sy, Math.round(ph / scale)));

  const canvas = document.createElement("canvas");
  canvas.width = sWidth;
  canvas.height = sHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not capture image in this browser.");
  }
  context.drawImage(source, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
  return canvas;
};

const captureNativeStillBlob = async (
  track: MediaStreamTrack | undefined,
  targetWidth: number,
): Promise<Blob | null> => {
  if (!track || track.readyState !== "live" || typeof window === "undefined") {
    return null;
  }
  const ImageCaptureCtor = (window as Window & { ImageCapture?: NativeImageCaptureConstructor }).ImageCapture;
  if (typeof ImageCaptureCtor !== "function") {
    return null;
  }

  try {
    const imageCapture = new ImageCaptureCtor(track);
    let photoSettings: NativePhotoSettings | undefined;
    if (typeof imageCapture.getPhotoCapabilities === "function") {
      try {
        const capabilities = await imageCapture.getPhotoCapabilities();
        const minW = capabilities?.imageWidth?.min;
        const maxW = capabilities?.imageWidth?.max;
        if (typeof minW === "number" && typeof maxW === "number" && maxW >= minW) {
          photoSettings = { imageWidth: Math.min(maxW, Math.max(minW, targetWidth)) };
        }
      } catch {
        // Proceed without explicit photoSettings if getPhotoCapabilities is unsupported.
      }
    }

    if (photoSettings) {
      try {
        return await imageCapture.takePhoto(photoSettings);
      } catch {
        // Retry with default sensor settings if explicit imageWidth is rejected.
      }
    }
    return await imageCapture.takePhoto();
  } catch {
    return null;
  }
};

export default function CameraCaptureDialog({
  mode = "photo",
  title,
  description,
  onCapture,
  onCancel,
}: CameraCaptureDialogProps) {
  const isPhotoMode = mode === "photo";
  const config = MODE_CONFIG[mode];
  const { toast } = useToast();
  const [facingMode, setFacingMode] = useState<FacingMode>(isPhotoMode ? "user" : "environment");
  const [starting, setStarting] = useState(true);
  const [streamReady, setStreamReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onCancelRef = useRef(onCancel);
  const toastRef = useRef(toast);

  onCancelRef.current = onCancel;
  toastRef.current = toast;

  // Never mirror rear camera, documents, or signatures so text & numbers stay 100% readable.
  const shouldMirror = isPhotoMode && facingMode === "user";

  const stopStream = useCallback(() => {
    const activeStream = streamRef.current;
    if (activeStream) {
      activeStream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    let active = true;

    const startCamera = async () => {
      stopStream();
      setStarting(true);
      setStreamReady(false);

      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        toastRef.current({
          title: "Camera not supported",
          description: "Live camera capture is unavailable in this browser. Please select a file instead.",
          variant: "destructive",
        });
        onCancelRef.current();
        return;
      }

      try {
        const primaryVideoConstraints: MediaTrackConstraints = isPhotoMode
          ? {
              facingMode,
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            }
          : {
              facingMode: { ideal: "environment" },
              width: { ideal: 2560 },
              height: { ideal: 1440 },
            };

        const fallbackVideoConstraints: MediaTrackConstraints = isPhotoMode
          ? { facingMode }
          : { facingMode: { ideal: "environment" } };

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: primaryVideoConstraints,
          });
        } catch (primaryErr: unknown) {
          const primaryErrName =
            primaryErr instanceof DOMException || primaryErr instanceof Error ? primaryErr.name : "";
          if (primaryErrName === "OverconstrainedError") {
            stream = await navigator.mediaDevices.getUserMedia({
              video: fallbackVideoConstraints,
            });
          } else {
            throw primaryErr;
          }
        }

        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        // Enable continuous hardware autofocus & exposure when supported by the device camera.
        const track = stream.getVideoTracks()[0];
        if (track && typeof track.getCapabilities === "function") {
          try {
            const capabilities = track.getCapabilities() as ExtendedTrackCapabilities;
            const advancedConstraints: ExtendedTrackConstraintSet[] = [];
            if (capabilities.focusMode && capabilities.focusMode.includes("continuous")) {
              advancedConstraints.push({ focusMode: "continuous" });
            }
            if (capabilities.exposureMode && capabilities.exposureMode.includes("continuous")) {
              advancedConstraints.push({ exposureMode: "continuous" });
            }
            if (advancedConstraints.length > 0 && typeof track.applyConstraints === "function") {
              void track
                .applyConstraints({
                  advanced: advancedConstraints,
                })
                .catch(() => {
                  // Non-fatal if device refuses advanced constraints
                });
            }
          } catch {
            // Non-fatal if getCapabilities throws on a specific browser
          }
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          try {
            await video.play();
          } catch {
            // Autoplay will resume via onLoadedMetadata / playsInline when ready.
          }
        }
      } catch (err: unknown) {
        if (!active) return;

        // In portrait photo mode only: if flipping to the rear camera fails on a single-camera device,
        // politely inform the user and revert to the front camera instead of aborting.
        const errName = err instanceof DOMException || err instanceof Error ? err.name : "";
        if (
          isPhotoMode &&
          facingMode === "environment" &&
          (errName === "NotFoundError" || errName === "OverconstrainedError" || errName === "DevicesNotFoundError")
        ) {
          toastRef.current({
            title: "Back camera unavailable",
            description: "Only one camera was detected on this device. Switching back to front camera.",
          });
          setFacingMode("user");
          return;
        }

        stopStream();
        const copy = getCameraErrorCopy(err);
        toastRef.current({
          title: copy.title,
          description: copy.description,
          variant: "destructive",
        });
        onCancelRef.current();
      } finally {
        if (active) setStarting(false);
      }
    };

    void startCamera();

    return () => {
      active = false;
      stopStream();
    };
  }, [isPhotoMode, facingMode, stopStream]);

  const handleClose = () => {
    if (capturing) return;
    stopStream();
    onCancel();
  };

  const handleFlipCamera = () => {
    if (!isPhotoMode || starting || capturing) return;
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  const handleCapture = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight || capturing) return;

    setCapturing(true);
    try {
      const rect = video.getBoundingClientRect();
      const boxW = rect.width > 0 ? rect.width : SIGNATURE_GUIDE.viewWidth;
      const boxH = rect.height > 0 ? rect.height : SIGNATURE_GUIDE.viewHeight;
      const activeTrack = streamRef.current?.getVideoTracks()[0];

      let finalBlob: Blob | null = null;

      // 1. Prefer native sensor still capture (ImageCapture.takePhoto) on Chromium/Android for razor-sharp text.
      const nativeBlob = await captureNativeStillBlob(activeTrack, isPhotoMode ? 1920 : 2560);
      if (nativeBlob) {
        try {
          if (mode === "signature") {
            const decoded = await decodeBlobToDrawable(nativeBlob);
            try {
              const canvas = drawSignatureStripToCanvas(decoded.source, decoded.width, decoded.height, boxW, boxH);
              finalBlob = await canvasToJpegBlob(canvas, 0.92);
            } finally {
              decoded.cleanup();
            }
          } else if (shouldMirror) {
            const decoded = await decodeBlobToDrawable(nativeBlob);
            try {
              const canvas = document.createElement("canvas");
              canvas.width = decoded.width;
              canvas.height = decoded.height;
              const context = canvas.getContext("2d");
              if (!context) throw new Error("Could not capture image in this browser.");
              context.translate(canvas.width, 0);
              context.scale(-1, 1);
              context.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);
              finalBlob = await canvasToJpegBlob(canvas, 0.92);
            } finally {
              decoded.cleanup();
            }
          } else if (/^image\/jpe?g$/i.test(nativeBlob.type)) {
            finalBlob = nativeBlob;
          } else {
            const decoded = await decodeBlobToDrawable(nativeBlob);
            try {
              const canvas = document.createElement("canvas");
              canvas.width = decoded.width;
              canvas.height = decoded.height;
              const context = canvas.getContext("2d");
              if (!context) throw new Error("Could not capture image in this browser.");
              context.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);
              finalBlob = await canvasToJpegBlob(canvas, 0.92);
            } finally {
              decoded.cleanup();
            }
          }
        } catch {
          // Transparently fall back to HD video canvas capture below.
          finalBlob = null;
        }
      }

      // 2. Fallback: High-resolution <video> -> <canvas> capture (Safari, Firefox, or when takePhoto is unavailable).
      if (!finalBlob) {
        if (mode === "signature") {
          const canvas = drawSignatureStripToCanvas(video, video.videoWidth, video.videoHeight, boxW, boxH);
          finalBlob = await canvasToJpegBlob(canvas, 0.92);
        } else {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const context = canvas.getContext("2d");
          if (!context) {
            throw new Error("Could not capture image in this browser.");
          }
          if (shouldMirror) {
            context.translate(canvas.width, 0);
            context.scale(-1, 1);
          }
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          finalBlob = await canvasToJpegBlob(canvas, 0.92);
        }
      }

      const file = new File([finalBlob], config.fileName, {
        type: "image/jpeg",
        lastModified: Date.now(),
      });

      stopStream();
      onCapture(file);
    } catch {
      toast({
        title: "Capture failed",
        description: "Could not capture the photo. Please try again or select a file instead.",
        variant: "destructive",
      });
      setCapturing(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent className="w-[calc(100vw-1rem)] max-w-md p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{title || config.defaultTitle}</DialogTitle>
          <DialogDescription>{description || config.defaultDescription}</DialogDescription>
        </DialogHeader>

        <div
          className={cn(
            "relative mx-auto w-full overflow-hidden rounded-lg border bg-neutral-950",
            config.viewportClass,
          )}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={() => setStreamReady(true)}
            onCanPlay={() => setStreamReady(true)}
            className={cn(
              "h-full w-full object-cover",
              shouldMirror && "-scale-x-100",
              !streamReady && "opacity-0",
            )}
          />

          {/* Mode-specific alignment guide overlay */}
          {mode === "photo" && (
            <svg
              aria-hidden="true"
              viewBox="0 0 350 450"
              className="pointer-events-none absolute inset-0 h-full w-full"
              preserveAspectRatio="xMidYMid slice"
            >
              <defs>
                <mask id="passport-oval-cutout">
                  <rect width="350" height="450" fill="white" />
                  <ellipse cx="175" cy="195" rx="102" ry="132" fill="black" />
                </mask>
              </defs>
              <rect width="350" height="450" fill="rgba(0, 0, 0, 0.42)" mask="url(#passport-oval-cutout)" />
              <ellipse
                cx="175"
                cy="195"
                rx="102"
                ry="132"
                fill="none"
                stroke="rgba(255, 255, 255, 0.88)"
                strokeWidth="2.5"
                strokeDasharray="8 6"
              />
              <path
                d="M 65 405 Q 175 342 285 405"
                fill="none"
                stroke="rgba(255, 255, 255, 0.55)"
                strokeWidth="2"
                strokeDasharray="6 6"
              />
            </svg>
          )}

          {mode === "document" && (
            <svg
              aria-hidden="true"
              viewBox="0 0 300 400"
              className="pointer-events-none absolute inset-0 h-full w-full"
              preserveAspectRatio="none"
            >
              <defs>
                <mask id="document-box-cutout">
                  <rect width="300" height="400" fill="white" />
                  <rect x="22" y="24" width="256" height="352" rx="10" fill="black" />
                </mask>
              </defs>
              <rect width="300" height="400" fill="rgba(0, 0, 0, 0.42)" mask="url(#document-box-cutout)" />
              <rect
                x="22"
                y="24"
                width="256"
                height="352"
                rx="10"
                fill="none"
                stroke="rgba(255, 255, 255, 0.45)"
                strokeWidth="1.5"
                strokeDasharray="6 6"
              />
              {/* Portrait corner alignment brackets */}
              <path
                d="M 22 54 V 24 H 52 M 248 24 H 278 V 54 M 278 346 V 376 H 248 M 52 376 H 22 V 346"
                fill="none"
                stroke="rgba(255, 255, 255, 0.95)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}

          {mode === "signature" && (
            <svg
              aria-hidden="true"
              viewBox={`0 0 ${SIGNATURE_GUIDE.viewWidth} ${SIGNATURE_GUIDE.viewHeight}`}
              className="pointer-events-none absolute inset-0 h-full w-full"
              preserveAspectRatio="none"
            >
              <defs>
                <mask id="signature-strip-cutout">
                  <rect width={SIGNATURE_GUIDE.viewWidth} height={SIGNATURE_GUIDE.viewHeight} fill="white" />
                  <rect
                    x={SIGNATURE_GUIDE.x}
                    y={SIGNATURE_GUIDE.y}
                    width={SIGNATURE_GUIDE.width}
                    height={SIGNATURE_GUIDE.height}
                    rx="8"
                    fill="black"
                  />
                </mask>
              </defs>
              <rect
                width={SIGNATURE_GUIDE.viewWidth}
                height={SIGNATURE_GUIDE.viewHeight}
                fill="rgba(0, 0, 0, 0.46)"
                mask="url(#signature-strip-cutout)"
              />
              <rect
                x={SIGNATURE_GUIDE.x}
                y={SIGNATURE_GUIDE.y}
                width={SIGNATURE_GUIDE.width}
                height={SIGNATURE_GUIDE.height}
                rx="8"
                fill="none"
                stroke="rgba(255, 255, 255, 0.55)"
                strokeWidth="1.5"
                strokeDasharray="6 6"
              />
              {/* Corner alignment brackets */}
              <path
                d={`M ${SIGNATURE_GUIDE.x} ${SIGNATURE_GUIDE.y + 28} V ${SIGNATURE_GUIDE.y} H ${SIGNATURE_GUIDE.x + 30} M ${SIGNATURE_GUIDE.x + SIGNATURE_GUIDE.width - 30} ${SIGNATURE_GUIDE.y} H ${SIGNATURE_GUIDE.x + SIGNATURE_GUIDE.width} V ${SIGNATURE_GUIDE.y + 28} M ${SIGNATURE_GUIDE.x + SIGNATURE_GUIDE.width} ${SIGNATURE_GUIDE.y + SIGNATURE_GUIDE.height - 28} V ${SIGNATURE_GUIDE.y + SIGNATURE_GUIDE.height} H ${SIGNATURE_GUIDE.x + SIGNATURE_GUIDE.width - 30} M ${SIGNATURE_GUIDE.x + 30} ${SIGNATURE_GUIDE.y + SIGNATURE_GUIDE.height} H ${SIGNATURE_GUIDE.x} V ${SIGNATURE_GUIDE.y + SIGNATURE_GUIDE.height - 28}`}
                fill="none"
                stroke="rgba(255, 255, 255, 0.95)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Signature baseline guide */}
              <line
                x1={SIGNATURE_GUIDE.x + 28}
                y1={SIGNATURE_GUIDE.y + SIGNATURE_GUIDE.height - 33}
                x2={SIGNATURE_GUIDE.x + SIGNATURE_GUIDE.width - 28}
                y2={SIGNATURE_GUIDE.y + SIGNATURE_GUIDE.height - 33}
                stroke="rgba(255, 255, 255, 0.5)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
            </svg>
          )}

          {(starting || !streamReady) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-neutral-950/75 text-white">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-xs font-medium">Starting camera...</span>
            </div>
          )}
        </div>

        <DialogFooter
          className={cn(
            "flex-col gap-2 sm:flex-row sm:items-center sm:space-x-0",
            isPhotoMode ? "sm:justify-between" : "sm:justify-end",
          )}
        >
          {isPhotoMode && (
            <Button
              type="button"
              variant="outline"
              onClick={handleFlipCamera}
              disabled={starting || capturing}
              className="min-h-10 gap-2 whitespace-nowrap"
            >
              <RefreshCw className="h-4 w-4" />
              Flip Camera
            </Button>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={capturing}
              className="min-h-10 whitespace-nowrap"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCapture}
              disabled={starting || !streamReady || capturing}
              className="min-h-10 gap-2 whitespace-nowrap"
            >
              {capturing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              {capturing ? "Capturing..." : "Capture"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
