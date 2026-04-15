import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { getAssetImageMeta, type AssetImageKey } from "@/lib/assets/asset-images";

const getMimeType = (filepath: string) => {
  const extension = path.extname(filepath).toLowerCase();

  if (extension === ".png") {
    return "image/png";
  }

  if (extension === ".jpg" || extension === ".jpeg") {
    return "image/jpeg";
  }

  if (extension === ".webp") {
    return "image/webp";
  }

  return "application/octet-stream";
};

const toAbsolutePublicPath = (src: string) => {
  const relativePath = src.replace(/^\//, "");
  return path.join(process.cwd(), "public", relativePath);
};

const assetDataUrlCache = new Map<AssetImageKey, string>();

export const getAssetImageDataUrl = async (key: AssetImageKey): Promise<string> => {
  const cached = assetDataUrlCache.get(key);

  if (cached) {
    return cached;
  }

  const meta = getAssetImageMeta(key);
  const absolutePath = toAbsolutePublicPath(meta.src);
  const binary = await readFile(absolutePath);
  const base64 = binary.toString("base64");
  const mimeType = getMimeType(absolutePath);
  const dataUrl = `data:${mimeType};base64,${base64}`;

  assetDataUrlCache.set(key, dataUrl);
  return dataUrl;
};

export const getSchoolPdfBrandingAssets = async () => {
  const [schoolLogo, drcFlag, motif, fond] = await Promise.all([
    getAssetImageDataUrl("inbtpLogo"),
    getAssetImageDataUrl("drcFlag"),
    getAssetImageDataUrl("motif"),
    getAssetImageDataUrl("fond")
  ]);

  return { schoolLogo, drcFlag, motif, fond };
};

export const imageUrlToBase64 = async (url: string): Promise<string | null> => {
  try {
    const trimmedUrl = url.trim();
    if (trimmedUrl.length === 0) return null;
    if (trimmedUrl.startsWith("data:")) return trimmedUrl;

    if (trimmedUrl.startsWith("/")) {
      const absolutePath = toAbsolutePublicPath(trimmedUrl);
      const binary = await readFile(absolutePath);
      const base64 = binary.toString("base64");
      const mimeType = getMimeType(absolutePath);
      return `data:${mimeType};base64,${base64}`;
    }

    const response = await fetch(trimmedUrl);
    if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);

    const contentType = response.headers.get("content-type") ?? "application/octet-stream";
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error("Show error : ", error);
    return null;
  }
};
