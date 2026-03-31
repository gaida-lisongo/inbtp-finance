declare module "pdfmake/build/pdfmake" {
  const pdfMake: {
    addVirtualFileSystem: (vfs: unknown) => void;
    createPdf: (definition: unknown) => {
      getBuffer: () => Promise<Buffer>;
    };
  };

  export default pdfMake;
}

declare module "pdfmake/build/vfs_fonts" {
  const pdfFonts: unknown;
  export default pdfFonts;
}
