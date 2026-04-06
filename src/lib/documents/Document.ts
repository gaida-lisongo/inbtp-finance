import { buildDocumentFooter } from "@/lib/documents/layout";

type PdfDocumentInfo = {
  title: string;
  author?: string;
  subject?: string;
  keywords?: string;
};

export type PdfDocumentDefinition = {
  info?: PdfDocumentInfo;
  content?: unknown[];
  pageSize?: string;
  pageMargins?: [number, number, number, number];
  defaultStyle?: Record<string, unknown>;
  styles?: Record<string, unknown>;
  [key: string]: unknown;
};

export type ReferenceItem = {
  label: string;
  value: string;
};

export type StudentDocumentIdentity = {
  fullName: string;
  email?: string | null;
  telephone?: string | null;
};

export const generatePdfBufferFromDefinition = async (docDefinition: PdfDocumentDefinition): Promise<Buffer> => {
  const pdfMakeModule = await import("pdfmake/build/pdfmake");
  const pdfFontsModule = await import("pdfmake/build/vfs_fonts");

  const pdfMake = (pdfMakeModule.default ?? pdfMakeModule) as {
    addVirtualFileSystem: (vfs: unknown) => void;
    createPdf: (definition: PdfDocumentDefinition) => { getBuffer: () => Promise<Buffer> };
  };
  const pdfFonts = (pdfFontsModule.default ?? pdfFontsModule) as unknown;

  pdfMake.addVirtualFileSystem(pdfFonts);

  return pdfMake.createPdf(docDefinition).getBuffer();
};

export abstract class Document<TPayload = unknown> {
  constructor(protected readonly payload: TPayload) {}

  abstract info(): PdfDocumentInfo;

  abstract reference(data?: ReferenceItem[]): unknown;

  abstract student(): unknown;

  abstract content(docDefinition: PdfDocumentDefinition): PdfDocumentDefinition | Promise<PdfDocumentDefinition>;

  async generateBuffer(): Promise<Buffer> {
    const baseDefinition: PdfDocumentDefinition = {
      info: this.info(),
      pageSize: "A4",
      pageMargins: [48, 56, 48, 56],
      defaultStyle: {
        fontSize: 11,
        lineHeight: 1.35,
      },
      styles: {
        title: {
          fontSize: 18,
          bold: true,
          alignment: "center",
        },
        sectionLabel: {
          fontSize: 10,
          bold: true,
          color: "#4B5563",
          margin: [0, 0, 0, 6],
        },
      },
      content: [],
      footer: buildDocumentFooter(),
    };

    const contentDefinition = await this.content(baseDefinition);
    return generatePdfBufferFromDefinition(contentDefinition);
  }
}
