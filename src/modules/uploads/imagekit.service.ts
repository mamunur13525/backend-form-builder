import { env } from "../../config/env";
import { ApiError } from "../../utils/ApiError";
import { httpStatus } from "../../constants/httpStatus";

/**
 * ImageKit image uploads.
 *
 * We call ImageKit's REST upload endpoint directly (no SDK) so the server keeps
 * a single dependency-free surface. Authentication is HTTP Basic with the
 * private API key as the username and an empty password — see
 * https://imagekit.io/docs/api-reference/upload-file/upload-file
 *
 * Node 18+ provides global `fetch`, `FormData` and `Blob`, so the multipart body
 * is assembled without any extra packages.
 */
const IMAGEKIT_UPLOAD_URL = "https://upload.imagekit.io/api/v1/files/upload";

export interface ImageKitUploadResult {
  /** Absolute, CDN-served URL of the uploaded image. */
  url: string;
  /** ImageKit-generated thumbnail URL (falls back to `url`). */
  thumbnailUrl: string;
  /** ImageKit file id — handy for later deletion. */
  fileId: string;
  /** Stored file name. */
  name: string;
  height?: number;
  width?: number;
  size?: number;
}

/** Whether the server has enough config to perform an upload. */
export const isImageKitConfigured = (): boolean => Boolean(env.imagekitPrivateKey);

/** Shape of the fields we read off ImageKit's JSON response. */
interface ImageKitResponse {
  url?: string;
  thumbnailUrl?: string;
  fileId?: string;
  name?: string;
  height?: number;
  width?: number;
  size?: number;
  message?: string;
}

export const uploadImageToImageKit = async (
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  folder = "/feedback"
): Promise<ImageKitUploadResult> => {
  if (!isImageKitConfigured()) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Image uploads are not configured — set IMAGEKIT_PRIVATE_KEY in the server environment."
    );
  }

  const form = new FormData();
  // `new Uint8Array(buffer)` yields a plain ArrayBufferView (a valid BlobPart)
  // and sidesteps Buffer/BlobPart typing differences across Node versions.
  form.append("file", new Blob([new Uint8Array(buffer)], { type: mimeType }), fileName);
  form.append("fileName", fileName);
  form.append("folder", folder);
  form.append("useUniqueFileName", "true");

  const auth = Buffer.from(`${env.imagekitPrivateKey}:`).toString("base64");

  let response: Response;
  try {
    response = await fetch(IMAGEKIT_UPLOAD_URL, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}` },
      body: form,
    });
  } catch (err) {
    console.error(`ImageKit upload request failed: ${String(err)}`);
    throw new ApiError(httpStatus.BAD_GATEWAY, "Could not reach the image host");
  }

  const data = (await response.json().catch(() => ({}))) as ImageKitResponse;

  if (!response.ok) {
    // A 401 means bad/absent credentials — that's a server misconfiguration,
    // not the client's fault, so surface it as a 500.
    const status =
      response.status === 401 || response.status === 403
        ? httpStatus.INTERNAL_SERVER_ERROR
        : httpStatus.BAD_REQUEST;
    console.error(`ImageKit upload rejected (${response.status}): ${data.message ?? "unknown error"}`);
    throw new ApiError(status, data.message || "Image upload failed");
  }

  if (!data.url || !data.fileId) {
    throw new ApiError(httpStatus.BAD_GATEWAY, "Image host returned an unexpected response");
  }

  return {
    url: data.url,
    thumbnailUrl: data.thumbnailUrl ?? data.url,
    fileId: data.fileId,
    name: data.name ?? fileName,
    height: data.height,
    width: data.width,
    size: data.size,
  };
};
