declare module "pdfmake" {
  type FontDescriptors = Record<
    string,
    {
      normal: string;
      bold?: string;
      italics?: string;
      bolditalics?: string;
    }
  >;

  class PdfPrinter {
    constructor(fontDescriptors: FontDescriptors);
    createPdfKitDocument(
      docDefinition: unknown,
      options?: unknown,
    ): NodeJS.ReadableStream & {
      end(): void;
    };
  }

  export default PdfPrinter;
}
