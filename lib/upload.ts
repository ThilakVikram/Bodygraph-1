import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const MAX_SIZE_BYTES =
  Number(process.env.MAX_UPLOAD_SIZE_MB ?? 5) * 1024 * 1024;

export class UploadError extends Error {}

/** Saves an uploaded image under public/uploads/<subdir>/ and returns its public URL path. */
export async function saveUploadedImage(
  file: File,
  subdir: string,
): Promise<string> {
  if (!file || file.size === 0) {
    throw new UploadError("No file provided.");
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new UploadError(
      `File exceeds the ${MAX_SIZE_BYTES / (1024 * 1024)}MB limit.`,
    );
  }
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    throw new UploadError("Unsupported file type. Use JPEG, PNG or WEBP.");
  }

  const dir = path.join(process.cwd(), "public", "uploads", subdir);
  await mkdir(dir, { recursive: true });
  const filename = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  return `/uploads/${subdir}/${filename}`;
}

/** Deletes a previously uploaded file given its public URL path. Safe no-op for non-upload paths. */
export async function deleteUploadedFile(
  publicPath: string | null | undefined,
): Promise<void> {
  if (!publicPath || !publicPath.startsWith("/uploads/")) return;
  const filePath = path.join(process.cwd(), "public", publicPath);
  await unlink(filePath).catch(() => {});
}
