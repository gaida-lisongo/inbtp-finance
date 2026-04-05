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
