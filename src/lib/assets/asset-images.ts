import { readFile } from "node:fs/promises";
import path from "node:path";

export const assetImageRegistry = {
  appLogo: {
    src: "/images/inbtp/logo.webp",
    alt: "Logo application",
    width: 180,
    height: 180,
  },
  elmes: {
    src: "/images/inbtp/LOGO_ELMES.png",
    alt: "Logo ELMES",
    width: 180,
    height: 180,
  },
  inbtpLogo: {
    src: "/images/inbtp/logo_inbtp.jpg",
    alt: "Logo INBTP",
    width: 180,
    height: 180,
  },
  minLogo: {
    src: "/images/inbtp/min_logo.png",
    alt: "Mini logo INBTP",
    width: 80,
    height: 80,
  },
  drcFlag: {
    src: "/images/inbtp/drc_flag.png",
    alt: "Drapeau RDC",
    width: 120,
    height: 80,
  },
} as const;

export type AssetImageKey = keyof typeof assetImageRegistry;

export const getAssetImageMeta = (key: AssetImageKey) => assetImageRegistry[key];

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
  const [schoolLogo, drcFlag] = await Promise.all([
    getAssetImageDataUrl("inbtpLogo"),
    getAssetImageDataUrl("drcFlag"),
  ]);

  return { schoolLogo, drcFlag };
};
