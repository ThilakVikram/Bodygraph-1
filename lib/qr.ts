import { randomBytes } from "crypto";
import QRCode from "qrcode";

/** A high-entropy, non-guessable identifier — safe to embed in a QR code. */
export function generateQrToken(): string {
  return randomBytes(16).toString("hex");
}

/** Renders a QR code (as a data URL) that encodes only the member's token. */
export async function qrTokenToDataUrl(token: string): Promise<string> {
  return QRCode.toDataURL(token, {
    margin: 1,
    width: 320,
    errorCorrectionLevel: "M",
  });
}
