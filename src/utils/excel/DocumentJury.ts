import Document, { StyleOptions } from "./Document";
import ExcelJS from "exceljs";

export interface JuryDocumentMember {
  id?: string | null;
  nomComplet?: string | null;
  grade?: string | null;
}

export interface JuryDocumentYear {
  id?: string | null;
  designation?: string | null;
}

export interface JuryIdentity {
  id?: string | null;
  designation?: string | null;
  annee_id?: string | null;
  president_id?: string | null;
  secretaire_id?: string | null;
  isActivate?: boolean | null;
  universite?: string | null;
  faculte?: string | null;
  departement?: string | null;
  promotion?: string | null;
  anneeAcademique?: string | null;
  annee?: JuryDocumentYear | null;
  president?: JuryDocumentMember | null;
  secretaire?: JuryDocumentMember | null;
}

export default class DocumentJury extends Document {
  constructor() {
    super({ defaultFontSize: "SM" }); // Le jury préfère souvent des documents compacts
  }

  protected getAcademicYearLabel(identity: JuryIdentity): string | null {
    return identity.annee?.designation ?? identity.anneeAcademique ?? null;
  }

  protected getMemberLabel(member: JuryDocumentMember | null | undefined): string | null {
    if (!member) {
      return null;
    }

    const parts = [member.grade, member.nomComplet].filter(
      (value): value is string => Boolean(value && value.trim()),
    );

    return parts.length > 0 ? parts.join(" ") : null;
  }

  /**
   * Méthode protégée pour dessiner le bloc d'en-tête académique
   */
  protected drawAcademicHeader(
    sheet: ExcelJS.Worksheet,
    identity: JuryIdentity,
  ): number {
    const defaultStyle: StyleOptions = {
      bold: true,
      size: "SM",
      color: "BLACK",
      align: { vertical: "middle", horizontal: "center", wrapText: true },
    };
    const titles = [
      identity.universite,
      identity.faculte ? `Section: ${identity.faculte}` : null,
      identity.departement,
      identity.promotion ? `Promotion: ${identity.promotion}` : null,
      identity.designation ? `Jury: ${identity.designation}` : null,
      this.getAcademicYearLabel(identity)
        ? `Année Académique: ${this.getAcademicYearLabel(identity)}`
        : null,
    ].filter((value): value is string => Boolean(value && value.trim()));

    let rowIdx = 1;

    sheet.getCell(`A${rowIdx}`).value = titles.join("\r\n");
    this.applyStyle(sheet.getCell(`A${rowIdx}`), defaultStyle);
    sheet.mergeCells(`A${rowIdx}:B${rowIdx}`);
    this.applyFullBorders(sheet.getCell(`A${rowIdx}`), "HAIR");

    return rowIdx + 1; // On retourne la ligne où le contenu peut commencer
  }

  /**
   * Pied de page pour les signatures
   */
  protected drawSignatureBlock(
    sheet: ExcelJS.Worksheet,
    startRow: number,
    identity?: JuryIdentity,
  ): void {
    // Signature Président
    sheet.mergeCells(`A${startRow}:C${startRow}`);
    const pres = sheet.getCell(`A${startRow}`);
    const presidentLabel = this.getMemberLabel(identity?.president);
    pres.value = presidentLabel
      ? `Le Président du Jury\n${presidentLabel}`
      : "Le Président du Jury";
    this.applyStyle(pres, { bold: true, align: { horizontal: "center" } });

    // Signature Secrétaire
    sheet.mergeCells(`F${startRow}:H${startRow}`);
    const sec = sheet.getCell(`F${startRow}`);
    const secretaryLabel = this.getMemberLabel(identity?.secretaire);
    sec.value = secretaryLabel
      ? `Le Secrétaire du Jury\n${secretaryLabel}`
      : "Le Secrétaire du Jury";
    this.applyStyle(sec, { bold: true, align: { horizontal: "center" } });
  }
}
