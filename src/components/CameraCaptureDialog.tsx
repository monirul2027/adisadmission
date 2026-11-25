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
    defaultDescription: "Align the full document inside the frame using the rear camera, then tap Capture.",
    fileName: "document.jpg",
    viewportClass: "aspect-[4/3] max-w-[380px] max-h-[55vh]",
  },
  signature: {
    defaultTitle: "Capture Signature",
    defaultDescription: "Align the signature inside the horizontal box using the rear camera, then tap Capture.",
    fileName: "signature.jpg",
    viewportClass: "aspect-[16/9] max-w-[380px] max-h-[50vh]",
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
        const videoConstraints: MediaTrackConstraints = isPhotoMode
          ? { facingMode }
          : { facingMode: { ideal: "environment" } };

        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
        });

        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
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

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (value) => (value ? resolve(value) : reject(new Error("Could not encode captured photo."))),
          "image/jpeg",
          0.92,
        );
      });

      const file = new File([blob], config.fileName, {
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
              viewBox="0 0 400 300"
              className="pointer-events-none absolute inset-0 h-full w-full"
              preserveAspectRatio="none"
            >
              <defs>
                <mask id="document-box-cutout">
                  <rect width="400" height="300" fill="white" />
                  <rect x="28" y="24" width="344" height="252" rx="10" fill="black" />
                </mask>
              </defs>
              <rect width="400" height="300" fill="rgba(0, 0, 0, 0.42)" mask="url(#document-box-cutout)" />
              <rect
                x="28"
                y="24"
                width="344"
                height="252"
                rx="10"
                fill="none"
                stroke="rgba(255, 255, 255, 0.45)"
                strokeWidth="1.5"
                strokeDasharray="6 6"
              />
              {/* Corner alignment brackets */}
              <path
                d="M 28 56 V 24 H 60 M 340 24 H 372 V 56 M 372 244 V 276 H 340 M 60 276 H 28 V 244"
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
              viewBox="0 0 480 270"
              className="pointer-events-none absolute inset-0 h-full w-full"
              preserveAspectRatio="none"
            >
              <defs>
                <mask id="signature-strip-cutout">
                  <rect width="480" height="270" fill="white" />
                  <rect x="32" y="65" width="416" height="140" rx="8" fill="black" />
                </mask>
              </defs>
              <rect width="480" height="270" fill="rgba(0, 0, 0, 0.46)" mask="url(#signature-strip-cutout)" />
              <rect
                x="32"
                y="65"
                width="416"
                height="140"
                rx="8"
                fill="none"
                stroke="rgba(255, 255, 255, 0.55)"
                strokeWidth="1.5"
                strokeDasharray="6 6"
              />
              {/* Corner alignment brackets */}
              <path
                d="M 32 93 V 65 H 62 M 418 65 H 448 V 93 M 448 177 V 205 H 418 M 62 205 H 32 V 177"
                fill="none"
                stroke="rgba(255, 255, 255, 0.95)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Signature baseline guide */}
              <line
                x1="60"
                y1="172"
                x2="420"
                y2="172"
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
