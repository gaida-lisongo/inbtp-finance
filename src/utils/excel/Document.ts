import ExcelJS from "exceljs";

// Définition des types pour les styles
export type FontSize = "XL" | "LG" | "MD" | "SM" | "XS";
export type ColorKey =
  | "PRIMARY"
  | "SECONDARY"
  | "GRAY"
  | "WHITE"
  | "BLACK"
  | "SUCCESS"
  | "DANGER";
export type BorderKey = "THICK" | "THIN" | "HAIR";
export type Orientation = "landscape" | "portrait";

// Interfaces pour les options de style
export interface StyleOptions {
  bold?: boolean;
  color?: ColorKey | string;
  size?: FontSize | number;
  bg?: string;
  align?: Partial<ExcelJS.Alignment>;
}

export interface BorderOptions {
  style?: BorderKey | ExcelJS.BorderStyle;
  top?: boolean;
  left?: boolean;
  bottom?: boolean;
  right?: boolean;
}

export interface SheetOptions {
  name: string;
  orientation?: Orientation;
  hidden?: boolean;
}

export interface DocumentConfig {
  defaultFontSize?: FontSize;
  defaultColor?: ColorKey;
}

export default class Document {
  // 1) Constantes de style typées
  public static readonly COLORS: Record<ColorKey, string> = {
    PRIMARY: "FF1A5276",
    SECONDARY: "FFD4AC0D",
    GRAY: "FFEBEDEF",
    WHITE: "FFFFFFFF",
    BLACK: "FF000000",
    SUCCESS: "FF27AE60",
    DANGER: "FFE74C3C",
  };

  public static readonly FONT_SIZE: Record<FontSize, number> = {
    XL: 20,
    LG: 16,
    MD: 12,
    SM: 10,
    XS: 8,
  };

  public static readonly BORDER_STYLES: Record<BorderKey, ExcelJS.BorderStyle> =
    {
      THICK: "medium",
      THIN: "thin",
      HAIR: "hair",
    };

  protected workbook: ExcelJS.Workbook;
  protected currentSheet: ExcelJS.Worksheet | null = null;
  protected config: Required<DocumentConfig>;

  constructor(config?: DocumentConfig) {
    this.workbook = new ExcelJS.Workbook();
    this.config = {
      defaultFontSize: config?.defaultFontSize || "MD",
      defaultColor: config?.defaultColor || "BLACK",
    };
  }

  // Méthode utilitaire pour convertir ColorKey en hex
  protected getColorHex(color: ColorKey | string): string {
    if (color in Document.COLORS) {
      return Document.COLORS[color as ColorKey];
    }
    return color.startsWith("FF") ? color : `FF${color}`;
  }

  // Méthode utilitaire pour convertir FontSize en nombre
  protected getFontSize(size: FontSize | number): number {
    if (typeof size === "number") return size;
    return Document.FONT_SIZE[size];
  }

  // Méthode utilitaire pour convertir BorderKey en style
  protected getBorderStyle(
    style: BorderKey | ExcelJS.BorderStyle,
  ): ExcelJS.BorderStyle {
    if (style in Document.BORDER_STYLES) {
      return Document.BORDER_STYLES[style as BorderKey];
    }
    return style as ExcelJS.BorderStyle;
  }

  // 3) Gestion des feuilles
  public addSheet(
    name: string,
    orientation: Orientation = "portrait",
  ): ExcelJS.Worksheet {
    const sheet = this.workbook.addWorksheet(name);
    sheet.pageSetup.orientation = orientation;
    sheet.pageSetup.paperSize = 9; // A4
    this.currentSheet = sheet;
    return sheet;
  }

  public getSheet(name: string): ExcelJS.Worksheet | undefined {
    return this.workbook.getWorksheet(name);
  }

  public removeSheet(name: string): boolean {
    const sheet = this.getSheet(name);
    if (sheet) {
      this.workbook.removeWorksheet(sheet.id);
      if (this.currentSheet?.name === name) {
        this.currentSheet = null;
      }
      return true;
    }
    return false;
  }

  // Méthode de formatage typée avec retour this pour chaînage
  public applyStyle(cell: ExcelJS.Cell, options: StyleOptions = {}): Document {
    const {
      bold = false,
      color = this.config.defaultColor,
      size = this.config.defaultFontSize,
      bg,
      align,
    } = options;

    cell.font = {
      bold,
      size: this.getFontSize(size),
      name: "Arial",
      color: { argb: this.getColorHex(color) },
    };

    if (bg) {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: this.getColorHex(bg) },
      };
    }

    if (align) {
      cell.alignment = {
        vertical: "middle",
        horizontal: "left",
        ...align,
      };
    }

    return this;
  }

  public applyBorder(
    cell: ExcelJS.Cell,
    options: BorderOptions = { style: "THIN" },
  ): Document {
    const {
      style = "THIN",
      top = true,
      left = true,
      bottom = true,
      right = true,
    } = options;

    const borderStyle = this.getBorderStyle(style);

    cell.border = {
      ...(top && { top: { style: borderStyle } }),
      ...(left && { left: { style: borderStyle } }),
      ...(bottom && { bottom: { style: borderStyle } }),
      ...(right && { right: { style: borderStyle } }),
    };

    return this;
  }

  // Alias pour compatibilité
  public applyFullBorders(
    cell: ExcelJS.Cell,
    style: BorderKey | ExcelJS.BorderStyle = "THIN",
  ): Document {
    return this.applyBorder(cell, { style });
  }

  // 2) Génération pour Next.js
  public async generateBuffer(): Promise<Buffer> {
    const buffer = await this.workbook.xlsx.writeBuffer();
    if (!Buffer.isBuffer(buffer)) {
      throw new Error("Failed to generate Excel buffer");
    }
    return buffer;
  }

  public async saveFile(filepath: string): Promise<void> {
    try {
      await this.workbook.xlsx.writeFile(filepath);
    } catch (error) {
      throw new Error(
        `Failed to save file to ${filepath}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  public static createResponse(buffer: Buffer, filename: string): Response {
    if (!buffer || buffer.length === 0) {
      throw new Error("Buffer is empty or invalid");
    }

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  }

  public getWorkbook(): ExcelJS.Workbook {
    return this.workbook;
  }
}
