"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, ScanLine, Video, VideoOff, XCircle } from "lucide-react";
import { checkInByQrTokenAction } from "@/lib/actions/attendance";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

// The BarcodeDetector API is a browser-native (Chromium-only) capability with
// no corresponding TypeScript DOM lib types yet — declare a minimal shape.
type DetectedBarcode = { rawValue: string };

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats?: string[] }) => BarcodeDetectorLike;
  }
}

type ScanResult =
  | { status: "idle" }
  | { status: "success"; message: string; memberName?: string; memberPhoto: string | null }
  | { status: "error"; message: string };

const SCAN_INTERVAL_MS = 400;
const RESCAN_COOLDOWN_MS = 1500;

export function CheckinScanner() {
  const [token, setToken] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ScanResult>({ status: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);

  const [cameraSupported, setCameraSupported] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetectorLike | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    // Browser capability detection: must run after mount (the server has no
    // `window`), and computing it in a lazy useState initializer instead
    // would make the client's first render disagree with the SSR'd HTML —
    // a real hydration mismatch, not just a lint nitpick.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCameraSupported(typeof window !== "undefined" && "BarcodeDetector" in window);
  }, []);

  const handleScan = useCallback(async (rawToken: string) => {
    const value = rawToken.trim();
    if (!value || busyRef.current) return;
    busyRef.current = true;
    setPending(true);
    try {
      const res = await checkInByQrTokenAction(value);
      if (res.success) {
        const memberName =
          typeof res.data?.memberName === "string" ? res.data.memberName : undefined;
        const memberPhoto =
          typeof res.data?.memberPhoto === "string" ? res.data.memberPhoto : null;
        setResult({ status: "success", message: res.message ?? "Checked in.", memberName, memberPhoto });
      } else {
        setResult({ status: "error", message: res.error ?? "Could not check in." });
      }
    } catch {
      setResult({ status: "error", message: "Something went wrong. Try again." });
    } finally {
      setPending(false);
      setToken("");
      inputRef.current?.focus();
      setTimeout(() => {
        busyRef.current = false;
      }, RESCAN_COOLDOWN_MS);
    }
  }, []);

  function handleManualSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void handleScan(token);
  }

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      if (window.BarcodeDetector) {
        detectorRef.current = new window.BarcodeDetector({ formats: ["qr_code"] });
      }
      setCameraActive(true);
      scanIntervalRef.current = setInterval(() => {
        if (!videoRef.current || !detectorRef.current || busyRef.current) return;
        detectorRef.current
          .detect(videoRef.current)
          .then((codes) => {
            if (codes.length > 0) {
              void handleScan(codes[0].rawValue);
            }
          })
          .catch(() => {
            // ignore transient detection errors (e.g. video not ready yet)
          });
      }, SCAN_INTERVAL_MS);
    } catch {
      setCameraError("Could not access the camera. Check permissions and try again.");
      setCameraActive(false);
    }
  }, [handleScan]);

  // Clean up the camera stream on unmount.
  useEffect(() => {
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-1 text-base font-semibold text-foreground">Manual entry</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Type or scan a member&apos;s QR token with a USB barcode scanner, then press Enter.
            </p>
            <form onSubmit={handleManualSubmit} className="flex items-end gap-2">
              <Field label="QR token" htmlFor="qrToken" className="flex-1">
                <Input
                  id="qrToken"
                  ref={inputRef}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Scan or paste QR token…"
                  autoFocus
                  autoComplete="off"
                />
              </Field>
              <Button type="submit" loading={pending} disabled={!token.trim()}>
                Check in
              </Button>
            </form>
          </CardContent>
        </Card>

        {cameraSupported && (
          <Card>
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Camera scan</h3>
                  <p className="text-sm text-muted-foreground">
                    Point the camera at a member&apos;s QR code.
                  </p>
                </div>
                <Button
                  type="button"
                  variant={cameraActive ? "outline" : "primary"}
                  size="sm"
                  onClick={cameraActive ? stopCamera : () => void startCamera()}
                >
                  {cameraActive ? (
                    <>
                      <VideoOff className="h-4 w-4" /> Stop
                    </>
                  ) : (
                    <>
                      <Video className="h-4 w-4" /> Start camera
                    </>
                  )}
                </Button>
              </div>
              <div className="relative overflow-hidden rounded-lg border border-border bg-muted">
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  className={cn("aspect-video w-full object-cover", !cameraActive && "hidden")}
                />
                {!cameraActive && (
                  <div className="flex aspect-video items-center justify-center text-muted-foreground">
                    <ScanLine className="h-8 w-8" />
                  </div>
                )}
              </div>
              {cameraError && <p className="mt-2 text-sm text-destructive">{cameraError}</p>}
            </CardContent>
          </Card>
        )}
      </div>

      {result.status !== "idle" && (
        <Card
          className={cn(
            "mt-6 border-2 p-6",
            result.status === "success"
              ? "border-success bg-success-bg"
              : "border-destructive bg-destructive/10",
          )}
        >
          <div className="flex items-center gap-4">
            {result.status === "success" ? (
              <>
                <Avatar name={result.memberName ?? "?"} src={result.memberPhoto} size={56} />
                <div>
                  <p className="flex items-center gap-2 text-lg font-semibold text-success">
                    <CheckCircle2 className="h-5 w-5" /> {result.message}
                  </p>
                  {result.memberName && (
                    <p className="text-sm text-foreground">{result.memberName}</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                  <XCircle className="h-7 w-7" />
                </div>
                <p className="text-lg font-semibold text-destructive">{result.message}</p>
              </>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
