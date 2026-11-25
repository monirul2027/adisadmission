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

type FacingMode = "user" | "environment";

type CameraCaptureDialogProps = {
  onCapture: (file: File) => void;
  onCancel: () => void;
};

const getCameraErrorCopy = (error: unknown): { title: string; description: string } => {
  const name = error instanceof DOMException || error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError") {
    return {
      title: "Camera permission denied",
      description: "Please allow camera access in your browser settings, or use Select Photo instead.",
    };
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError" || name === "OverconstrainedError") {
    return {
      title: "No camera found",
      description: "No compatible camera was detected on this device. Please use Select Photo instead.",
    };
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return {
      title: "Camera is busy",
      description: "Your camera is being used by another app. Close it and try again, or use Select Photo.",
    };
  }
  return {
    title: "Camera unavailable",
    description: "Could not start the camera right now. Please try again or use Select Photo.",
  };
};

export default function CameraCaptureDialog({ onCapture, onCancel }: CameraCaptureDialogProps) {
  const { toast } = useToast();
  const [facingMode, setFacingMode] = useState<FacingMode>("user");
  const [starting, setStarting] = useState(true);
  const [streamReady, setStreamReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onCancelRef = useRef(onCancel);
  const toastRef = useRef(toast);

  onCancelRef.current = onCancel;
  toastRef.current = toast;

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
          description: "Live camera capture is unavailable in this browser. Please use Select Photo instead.",
          variant: "destructive",
        });
        onCancelRef.current();
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
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

        // If the user tried flipping to the rear camera on a device with only a front camera,
        // politely inform them and revert back to the front camera instead of aborting.
        const errName = err instanceof DOMException || err instanceof Error ? err.name : "";
        if (
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
  }, [facingMode, stopStream]);

  const handleClose = () => {
    if (capturing) return;
    stopStream();
    onCancel();
  };

  const handleFlipCamera = () => {
    if (starting || capturing) return;
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

      if (facingMode === "user") {
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

      const file = new File([blob], "student-photo.jpg", {
        type: "image/jpeg",
        lastModified: Date.now(),
      });

      stopStream();
      onCapture(file);
    } catch {
      toast({
        title: "Capture failed",
        description: "Could not capture the photo. Please try again or use Select Photo.",
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
          <DialogTitle>Take Student Photo</DialogTitle>
          <DialogDescription>
            Center the student&apos;s face inside the passport guide, then tap Capture.
          </DialogDescription>
        </DialogHeader>

        <div className="relative mx-auto aspect-[3.5/4.5] w-full max-w-[300px] max-h-[55vh] overflow-hidden rounded-lg border bg-neutral-950">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={() => setStreamReady(true)}
            onCanPlay={() => setStreamReady(true)}
            className={cn(
              "h-full w-full object-cover",
              facingMode === "user" && "-scale-x-100",
              !streamReady && "opacity-0",
            )}
          />

          {/* Passport portrait oval guide overlay */}
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

          {(starting || !streamReady) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-neutral-950/75 text-white">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-xs font-medium">Starting camera...</span>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:space-x-0">
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
