import Image, { type ImageProps } from "next/image";

import { getAssetImageMeta, type AssetImageKey } from "@/lib/assets/asset-images";

type AssetImageProps = Omit<ImageProps, "src" | "alt"> & {
  src: AssetImageKey;
  alt?: string;
};

export default function AssetImage({ src, alt, width, height, ...props }: AssetImageProps) {
  const meta = getAssetImageMeta(src);

  return (
    <Image
      src={meta.src}
      alt={alt ?? meta.alt}
      width={width ?? meta.width}
      height={height ?? meta.height}
      {...props}
    />
  );
}
