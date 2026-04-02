import DocumentJury, { JuryIdentity } from "./DocumentJury";
import {
  ElementResultat,
  ResultatEtudiant,
  SemestreResultat,
  SessionType,
  SessionSummary,
} from "./NoteManager";
import ExcelJS from "exceljs";
import { StyleOptions } from "./Document";

type DocumentGrilleOptions = {
  sessionType?: SessionType;
  includeAnnualSheet?: boolean;
  includeSemesterSheets?: boolean;
};

export default class DocumentGrille extends DocumentJury {
  public async generate(
    resultats: ResultatEtudiant[],
    identity: JuryIdentity,
    options?: DocumentGrilleOptions,
  ) {
    const sessionType = options?.sessionType ?? "best";
    const includeAnnualSheet =
      options?.includeAnnualSheet ?? sessionType === "best";
    const includeSemesterSheets = options?.includeSemesterSheets ?? true;
    // 1. Feuilles semestrielles
    if (includeSemesterSheets) {
      const nbSemestres = resultats[0].semestres.length;
      for (let i = 0; i < nbSemestres; i++) {
        this.renderGrilleSheet(resultats, identity, i, sessionType);
      }
    }

    // 2. Grille Globale (Récapitulative)
    if (includeAnnualSheet) {
      this.renderGrilleGlobaleSheet(resultats, identity, sessionType);
    }
  }

  private buildSheetName(base: string, sessionType: SessionType): string {
    const suffix =
      sessionType === "principale"
        ? " Principale"
        : sessionType === "rattrapage"
          ? " Rattrapage"
          : "";

    const trimmedLength = Math.max(31 - suffix.length, 0);
    const baseTrimmed = base.substring(0, trimmedLength);
    return `${baseTrimmed}${suffix}`.substring(0, 31);
  }

  private getElementNoteValue(
    element: ElementResultat,
    sessionType: SessionType,
  ): number {
    if (sessionType === "principale") return element.noteSession;
    if (sessionType === "rattrapage") return element.rattrapage;
    return element.noteFinale;
  }

  private getSessionSummary(
    sem: SemestreResultat,
    sessionType: SessionType,
  ): SessionSummary {
    return sem.sessions[sessionType] ?? sem.sessions.best;
  }

  private roundValue(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private renderGrilleSheet(
    resultats: ResultatEtudiant[],
    identity: JuryIdentity,
    sIdx: number,
    sessionType: SessionType,
  ) {
    const semNom = resultats[0].semestres[sIdx].designation ?? `Semestre ${sIdx + 1}`;
    const sheet = this.addSheet(this.buildSheetName(semNom, sessionType), "landscape");
    let curr = this.drawAcademicHeader(sheet, identity);

    // En-tête de grille
    const sem = resultats[0].semestres[sIdx];
    this.renderHeaderComplex(sheet, sem, curr);
    curr += 3;

    // Données avec bordures
    resultats.forEach((etud, idx) => {
      const r = sheet.getRow(curr + idx);
      const resSem = etud.semestres[sIdx];

      const numCell = r.getCell(1);
      numCell.value = idx + 1;
      this.applyBorder(numCell, { style: "THIN" });
      this.applyStyle(numCell, { align: { horizontal: "center" } });

      const nameCell = r.getCell(2);
      nameCell.value = etud.studentName;
      this.applyBorder(nameCell, { style: "THIN" });

      let c = 3;
      resSem.unites.forEach((u) => {
        u.elements.forEach((e) => {
          const value = this.getElementNoteValue(e, sessionType);
          const cell = r.getCell(c++);
          cell.value = value;
          cell.numFmt = "0.00";
          this.applyBorder(cell, { style: "THIN" });
          this.applyStyle(cell, {
            color: value < 10 ? "DANGER" : "BLACK",
            align: { horizontal: "center" },
          });
        });

        const moyCell = r.getCell(c++);
        const unitStats = u.sessions[sessionType] ?? u.sessions.best;
        moyCell.value = unitStats.moyenne;
        moyCell.numFmt = "0.00";
        this.applyBorder(moyCell, { style: "THIN" });
        this.applyStyle(moyCell, { align: { horizontal: "center" } });

        const vCell = r.getCell(c++);
        vCell.value = unitStats.isValide ? "V" : "NV";
        this.applyBorder(vCell, { style: "THIN" });
        this.applyStyle(vCell, {
          color: unitStats.isValide ? "SUCCESS" : "DANGER",
          bold: true,
          align: { horizontal: "center" },
        });
      });

      // Synthèse
      const summary = this.getSessionSummary(resSem, sessionType);
      const synthData = this.calculateSynthesis(summary);
      const pourcCell = r.getCell(c++);
      pourcCell.value = synthData.pourcentage / 100;
      pourcCell.numFmt = "0.00%";
      this.applyBorder(pourcCell, { style: "THIN" });
      this.applyStyle(pourcCell, { align: { horizontal: "center" } });

      const ncvCell = r.getCell(c++);
      ncvCell.value = synthData.ncv;
      this.applyBorder(ncvCell, { style: "THIN" });
      this.applyStyle(ncvCell, { align: { horizontal: "center" } });

      const ncnvCell = r.getCell(c++);
      ncnvCell.value = synthData.ncnv;
      this.applyBorder(ncnvCell, { style: "THIN" });
      this.applyStyle(ncnvCell, { align: { horizontal: "center" } });

      const mentionCell = r.getCell(c++);
      mentionCell.value = synthData.mention;
      this.applyBorder(mentionCell, { style: "THIN" });
      this.applyStyle(mentionCell, {
        bold: true,
        align: { horizontal: "center" },
      });

      const apprCell = r.getCell(c++);
      apprCell.value = synthData.appreciation;
      this.applyBorder(apprCell, { style: "THIN" });
      this.applyStyle(apprCell, { align: { horizontal: "center" } });

      const decisionCell = r.getCell(c++);
      decisionCell.value = synthData.decision;
      decisionCell.font = {
        bold: true,
        color: {
          argb: synthData.decision === "AJOURNÉ" ? "FFFF0000" : "FF008000",
        },
      };
      this.applyBorder(decisionCell, { style: "THIN" });
      this.applyStyle(decisionCell, { align: { horizontal: "center" } });
    });

    // Pied de page avec signatures
    this.drawSignatureBlock(sheet, curr + resultats.length + 2, identity);
  }

  private calculateSynthesis(summary: SessionSummary) {
    const pourcentage = summary.pourcentage;
    const ncv = summary.ncv;
    const ncnv = summary.ncnv;
    const total = ncv + ncnv;
    const ncvPercentage = total > 0 ? (ncv / total) * 100 : 0;
    const isAdjourne = ncvPercentage < 75;

    return {
      obtenu: this.roundValue(summary.totalObtenu),
      maximum: summary.totalMax,
      pourcentage,
      ncv,
      ncnv,
      mention: this.getMentionCode(pourcentage),
      appreciation: isAdjourne ? "AJOURNÉ(E)" : "SATISFAISANT(E)",
      decision: isAdjourne ? "AJOURNÉ" : "ADMIS",
    };
  }

  private getMentionCode(pourcentage: number): string {
    if (pourcentage >= 90) return "A";
    if (pourcentage >= 80) return "B";
    if (pourcentage >= 70) return "C";
    if (pourcentage >= 60) return "D";
    if (pourcentage >= 50) return "E";
    if (pourcentage >= 40) return "F";
    if (pourcentage >= 35) return "G";
    return "H";
  }

  private renderHeaderComplex(
    sheet: ExcelJS.Worksheet,
    sem: SemestreResultat,
    row: number,
  ) {
    const defaultStyle: StyleOptions = {
      bold: true,
      size: "SM",
      color: "BLACK",
      align: { vertical: "middle", horizontal: "center", wrapText: true },
    };

    const rowIdx = row - 1;

    sheet.getCell(`A${rowIdx + 1}`).value = "Credit";
    this.applyStyle(sheet.getCell(`A${rowIdx + 1}`), {
      ...defaultStyle,
    });
    sheet.mergeCells(`A${rowIdx + 1}:B${rowIdx + 1}`);
    this.applyFullBorders(sheet.getCell(`A${rowIdx + 1}`), "HAIR");

    const mentionsLabel = [
      "LÉGENDE",
      "A: ≥ 90% | B: ≥ 80%",
      "C: ≥ 70% | D: ≥ 60%",
      "E: ≥ 50% | F: ≥ 40%",
      "G: ≥ 35% | H: < 35%",
      "APPR: SATISFAISANT(E) / AJOURNÉ(E)",
      "AJOURNÉ si NCV < 75%",
    ];

    sheet.getCell(`A${rowIdx + 2}`).value = mentionsLabel.join("\n");
    this.applyStyle(sheet.getCell(`A${rowIdx + 2}`), {
      ...defaultStyle,
      size: "SM",
      color: "BLACK",
    });
    sheet.mergeCells(`A${rowIdx + 2}:B${rowIdx + 2}`);
    this.applyFullBorders(sheet.getCell(`A${rowIdx + 2}`), "HAIR");

    // Headers N° et ÉTUDIANT
    const contentsLabel = ["N°", "ÉTUDIANT"];
    contentsLabel.forEach((label, idx) => {
      const cell = sheet.getCell(rowIdx + 3, idx + 1);
      cell.value = label;
      cell.alignment = { horizontal: "center", vertical: "middle" };
      this.applyStyle(cell, { bold: true });
      this.applyBorder(cell);
    });

    sheet.getColumn(1).width = this.getFontSize("SM") / 2;
    sheet.getColumn(2).width = this.getFontSize("SM") * 3.5;

    const { colEnd } = this.renderNotesHeader(sheet, 3, rowIdx, sem.unites);
    this.renderSyntheseHeader(sheet, colEnd + 1, rowIdx, sem);
  }

  private renderNotesHeader(
    sheet: ExcelJS.Worksheet,
    colStart: number,
    row: number,
    unites: SemestreResultat["unites"],
  ): { rowEnd: number; colEnd: number } {
    let col = colStart;

    unites.forEach((u) => {
      const start = col;

      // Code de l'unité (row)
      const ueCell = sheet.getCell(row, start);
      ueCell.value = u.designation;
      ueCell.font = { bold: true };
      ueCell.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
        textRotation: 90,
      };
      this.applyStyle(ueCell, { bold: true });
      this.applyBorder(ueCell);

      u.elements.forEach((e) => {
        sheet.getCell(row + 1, col).value = e.credit;
        sheet.getCell(row + 1, col).alignment = {
          horizontal: "center",
          vertical: "middle",
        };
        this.applyStyle(sheet.getCell(row + 1, col), {});
        this.applyBorder(sheet.getCell(row + 1, col));

        const cell = sheet.getCell(row + 2, col);
        cell.value = e.designation;
        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
          textRotation: 90,
          wrapText: true,
        };
        this.applyStyle(cell, {});
        this.applyBorder(cell);
        sheet.mergeCells(row + 2, col, row + 3, col);
        col++;
      });

      // Colonne MOYENNE
      sheet.getCell(row + 1, col).value = u.credit;
      sheet.getCell(row + 1, col).alignment = {
        horizontal: "center",
        vertical: "middle",
      };
      this.applyStyle(sheet.getCell(row + 1, col), {});
      this.applyBorder(sheet.getCell(row + 1, col));

      const moyCell = sheet.getCell(row + 2, col);
      moyCell.value = "MOYENNE";
      moyCell.alignment = {
        horizontal: "center",
        vertical: "middle",
        textRotation: 90,
      };
      this.applyStyle(moyCell, {});
      this.applyBorder(moyCell);
      sheet.mergeCells(row + 2, col, row + 3, col);

      // Colonne DECISION
      const decCell = sheet.getCell(row + 1, col + 1);
      decCell.value = "DECISION";
      decCell.alignment = {
        horizontal: "center",
        vertical: "middle",
        textRotation: 90,
      };
      sheet.getColumn(col + 1).width = this.getFontSize("SM") / 1.8;
      this.applyStyle(decCell, {});
      this.applyBorder(decCell);
      sheet.mergeCells(row + 1, col + 1, row + 3, col + 1);

      //Fusion de l'entête de l'unité
      sheet.mergeCells(row, start, row, col + 1);

      col += 2;
    });

    return { rowEnd: row + 2, colEnd: col - 1 };
  }

  private renderSyntheseHeader(
    sheet: ExcelJS.Worksheet,
    colStart: number,
    row: number,
    sem: SemestreResultat,
  ): { rowEnd: number; colEnd: number } {
    // 1. Définition des colonnes de synthèse
    const headersResultat = [
      { title: "POURCENTAGE", value: "100%" },
      { title: "NCV", value: null },
      { title: "NCNV", value: null },
    ];

    const headersJury = [
      { title: "MENTION", value: null },
      { title: "APPRECIATION", value: null },
      { title: "DECISION", value: null },
    ];

    // 1. Colonne de synthèse globale
    const cellResultat = sheet.getCell(row, colStart) as ExcelJS.Cell;
    cellResultat.value = "SYNTHÈSE RESULTATS";
    cellResultat.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
      textRotation: 90,
    };
    this.applyStyle(cellResultat, { bold: true });
    this.applyBorder(cellResultat);
    sheet.mergeCells(
      row,
      colStart,
      row + 1,
      colStart + headersResultat.length - 1,
    );
    sheet.getRow(row).height = this.getFontSize("LG") * 6;
    sheet.getRow(row + 2).height = this.getFontSize("LG") * 6;

    // 2. Rendu des headers de synthèse
    let col = colStart;
    let rowIdx = row + 2;
    headersResultat.forEach((h, idx) => {
      const cell = sheet.getCell(rowIdx, col + idx);
      cell.value = h.title;
      cell.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
        textRotation: 90,
      };
      this.applyStyle(cell, { bold: true });
      this.applyBorder(cell);
      sheet.getColumn(col + idx).width = this.getFontSize("SM");

      if (h.value) {
        const subCell = sheet.getCell(rowIdx + 1, col + idx);
        subCell.value = h.value;
        subCell.alignment = {
          horizontal: "center",
          vertical: "middle",
        };
        this.applyStyle(subCell, { bold: true });
        this.applyBorder(subCell);
      } else {
        sheet.mergeCells(rowIdx, col + idx, rowIdx + 1, col + idx);
      }
      colStart += 1;
    });

    // 3. Colonne de décision du jury
    col = colStart;
    const cellJury = sheet.getCell(row, col) as ExcelJS.Cell;
    cellJury.value = "DELIBERATION JURY";
    cellJury.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
      textRotation: 90,
    };
    this.applyStyle(cellJury, { bold: true });
    this.applyBorder(cellJury);
    sheet.mergeCells(row, col, row + 1, col + headersJury.length - 1);

    headersJury.forEach((h, idx) => {
      const cell = sheet.getCell(rowIdx, col + idx);
      cell.value = h.title;
      cell.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
        textRotation: 90,
      };
      this.applyStyle(cell, { bold: true });
      this.applyBorder(cell);
      sheet.getColumn(col + idx).width = this.getFontSize("SM");
      sheet.mergeCells(rowIdx, col + idx, rowIdx + 1, col + idx);
      colStart += 1;
    });

    return { rowEnd: row + 2, colEnd: colStart };
  }
  private renderGrilleGlobaleSheet(
    resultats: ResultatEtudiant[],
    identity: JuryIdentity,
    sessionType: SessionType,
  ) {
    const sheetName = this.buildSheetName("Grille Annuelle", sessionType);
    const sheet = this.addSheet(sheetName, "landscape");
    let curr = this.drawAcademicHeader(sheet, identity);

    // 1. Consolidation des unités (Toutes les UE de l'année dans un seul tableau)
    // On préfixe le code/designation par S1 ou S2 pour la clarté
    const allUnitesConsolidees = resultats[0].semestres.flatMap((sem, sIdx) =>
      sem.unites.map((u) => ({
        ...u,
        designation: `(S${sIdx + 1}) ${u.designation}`, // Identification du semestre
        code: `S${sIdx + 1}-${u.code}`,
      })),
    );

    // 2. Création d'un objet "Semestre Virtuel" pour la synthèse annuelle
    const promotionStats = resultats[0].promotion;
    const semVirtuelGlobal: any = {
      unites: allUnitesConsolidees,
      totalObtenu: promotionStats.totalObtenu,
      totalMax: promotionStats.totalMax,
      pourcentage: promotionStats.pourcentage,
      ncv: promotionStats.ncv,
      ncnv: promotionStats.ncnv,
    };

    // 3. Rendu de l'en-tête complexe (Réutilisation de la logique semestrielle)
    this.renderHeaderComplex(sheet, semVirtuelGlobal, curr);
    const rowIdx = curr - 1;

    curr += 3;

    // 4. Rendu des données (Boucle sur les étudiants)
    resultats.forEach((etud, idx) => {
      const r = sheet.getRow(curr + idx);

      // N° et Nom
      r.getCell(1).value = idx + 1;
      r.getCell(2).value = etud.studentName;
      [1, 2].forEach((c) => {
        this.applyBorder(r.getCell(c));
        this.applyStyle(r.getCell(c), {
          align: { horizontal: c === 1 ? "center" : "left" },
        });
      });

      let c = 3;
      // Parcours de toutes les unités de tous les semestres
      etud.semestres.forEach((sem) => {
        sem.unites.forEach((u) => {
          // Notes des EC
          u.elements.forEach((e) => {
            const cell = r.getCell(c++);
            const value = this.getElementNoteValue(e, sessionType);
            cell.value = value;
            cell.numFmt = "0.00";
            this.applyBorder(cell);
            this.applyStyle(cell, {
              color: value < 10 ? "DANGER" : "BLACK",
              align: { horizontal: "center" },
            });
          });

          // Moyenne UE
          const moyCell = r.getCell(c++);
          const unitStats = u.sessions[sessionType] ?? u.sessions.best;
          moyCell.value = unitStats.moyenne;
          moyCell.numFmt = "0.00";
          this.applyBorder(moyCell);
          this.applyStyle(moyCell, {
            align: { horizontal: "center" },
            bold: true,
          });

          // Validation UE
          const vCell = r.getCell(c++);
          vCell.value = unitStats.isValide ? "V" : "NV";
          this.applyBorder(vCell);
          this.applyStyle(vCell, {
            color: unitStats.isValide ? "SUCCESS" : "DANGER",
            bold: true,
            align: { horizontal: "center" },
          });
        });
      });

      // 5. Synthèse Annuelle (Données Promotion)
      const promotionSummary =
        etud.promotion.sessions[sessionType] ??
        etud.promotion.sessions.best;
      const synthData = this.calculateSynthesis(promotionSummary);

      const summaryValues = [
        synthData.pourcentage / 100,
        synthData.ncv,
        synthData.ncnv,
        synthData.mention,
        synthData.appreciation,
        synthData.decision,
      ];

      summaryValues.forEach((val, sIdx) => {
        const cell = r.getCell(c + sIdx);
        cell.value = val;
        if (sIdx === 0) cell.numFmt = "0.00%";
        this.applyBorder(cell);
        this.applyStyle(cell, {
          align: { horizontal: "center" },
          bold: sIdx >= 3,
          color:
            sIdx === 5 && val === "D"
              ? "DANGER"
              : sIdx === 5 && val === "P"
                ? "SUCCESS"
                : undefined,
        });
      });
    });

    this.drawSignatureBlock(sheet, curr + resultats.length + 2);
  }
  //   private renderGrilleGlobaleSheet(
  //     resultats: ResultatEtudiant[],
  //     identity: JuryIdentity,
  //   ) {
  //     const sheet = this.addSheet("Grille Annuelle", "landscape");
  //     let curr = this.drawAcademicHeader(sheet, identity);

  //     const semesterGroups = resultats[0].semestres.map((sem, semIdx) => ({
  //       semIdx,
  //       label: sem.designation || `SEMESTRE ${semIdx + 1}`,
  //       units: sem.unites.map((u) => ({
  //         unitId: u._id,
  //         label: u.code || u.designation,
  //       })),
  //     }));

  //     const allUnitColumns = semesterGroups.flatMap((group) =>
  //       group.units.map((unit) => ({
  //         semIdx: group.semIdx,
  //         unitId: unit.unitId,
  //         label: unit.label,
  //       })),
  //     );

  //     // En-tête
  //     this.renderGlobalHeader(sheet, curr, semesterGroups);
  //     curr += 3;

  //     // Données globales avec toutes les unités
  //     resultats.forEach((etud, idx) => {
  //       const r = sheet.getRow(curr + idx);

  //       const numCell = r.getCell(1);
  //       numCell.value = idx + 1;
  //       this.applyBorder(numCell);
  //       this.applyStyle(numCell, { align: { horizontal: "center" } });

  //       const nameCell = r.getCell(2);
  //       nameCell.value = etud.studentName;
  //       this.applyBorder(nameCell);

  //       // Moyennes par unité (tous semestres)
  //       let c = 3;
  //       allUnitColumns.forEach((colDef) => {
  //         const sem = etud.semestres[colDef.semIdx];
  //         const unite = sem?.unites.find((u) => u._id === colDef.unitId);
  //         const cell = r.getCell(c++);
  //         cell.value = unite ? unite.moyenne : "-";
  //         if (typeof cell.value === "number") {
  //           cell.numFmt = "0.00";
  //         }
  //         this.applyBorder(cell);
  //         this.applyStyle(cell, { align: { horizontal: "center" } });
  //       });

  //       // Synthèse globale
  //       const promo = etud.promotion;
  //       const obtCell = r.getCell(c++);
  //       obtCell.value = Number(promo.totalObtenu).toFixed(2);
  //       this.applyBorder(obtCell);
  //       this.applyStyle(obtCell, {
  //         bold: true,
  //         align: { horizontal: "center" },
  //       });

  //       const maxCell = r.getCell(c++);
  //       maxCell.value = Number(promo.totalMax).toFixed(2);
  //       this.applyBorder(maxCell);
  //       this.applyStyle(maxCell, {
  //         bold: true,
  //         align: { horizontal: "center" },
  //       });

  //       const pourcCell = r.getCell(c++);
  //       pourcCell.value = promo.pourcentage / 100;
  //       pourcCell.numFmt = "0.00%";
  //       this.applyBorder(pourcCell);
  //       this.applyStyle(pourcCell, {
  //         bold: true,
  //         align: { horizontal: "center" },
  //       });

  //       const mentionCell = r.getCell(c++);
  //       mentionCell.value = this.getMentionCode(promo.pourcentage);
  //       this.applyBorder(mentionCell);
  //       this.applyStyle(mentionCell, {
  //         bold: true,
  //         align: { horizontal: "center" },
  //       });

  //       const ncvCell = r.getCell(c++);
  //       ncvCell.value = promo.ncv;
  //       this.applyBorder(ncvCell);
  //       this.applyStyle(ncvCell, { align: { horizontal: "center" } });

  //       const ncnvCell = r.getCell(c++);
  //       ncnvCell.value = promo.ncnv;
  //       this.applyBorder(ncnvCell);
  //       this.applyStyle(ncnvCell, { align: { horizontal: "center" } });

  //       // Décision globale
  //       const totalCredits = Number(ncvCell.value) + Number(ncnvCell.value);
  //       const isAdjourne =
  //         totalCredits > 0
  //           ? (Number(ncvCell.value) / totalCredits) * 100 < 75
  //           : false;

  //       const apprCell = r.getCell(c++);
  //       apprCell.value = isAdjourne ? "A" : "S";
  //       this.applyBorder(apprCell);
  //       this.applyStyle(apprCell, {
  //         align: { horizontal: "center" },
  //         bold: true,
  //       });

  //       const decisionCell = r.getCell(c++);
  //       decisionCell.value = isAdjourne ? "AJOURNÉ" : "VALIDÉ";
  //       this.applyBorder(decisionCell);
  //       this.applyStyle(decisionCell, {
  //         align: { horizontal: "center" },
  //         bold: true,
  //         color: isAdjourne ? "DANGER" : "SUCCESS",
  //       });
  //     });

  //     // Pied de page avec signatures
  //     this.drawSignatureBlock(sheet, curr + resultats.length + 2);
  //   }

  private renderGlobalHeader(
    sheet: ExcelJS.Worksheet,
    row: number,
    semesterGroups: Array<{
      semIdx: number;
      label: string;
      units: Array<{ unitId: string; label: string }>;
    }>,
  ) {
    // Légende
    sheet.mergeCells(row, 1, row + 1, 2);
    const legendeCell = sheet.getCell(row, 1);
    legendeCell.value = "GRILLE ANNUELLE";
    legendeCell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    this.applyStyle(legendeCell, { bold: true });
    this.applyBorder(legendeCell);

    // Headers principaux
    sheet.getColumn(1).width = this.getFontSize("SM") / 2;
    sheet.getColumn(2).width = this.getFontSize("SM") * 3.5;

    const mainHeaders = ["N°", "ÉTUDIANT"];
    mainHeaders.forEach((label, idx) => {
      const cell = sheet.getCell(row + 2, idx + 1);
      cell.value = label;
      cell.alignment = { horizontal: "center", vertical: "middle" };
      this.applyStyle(cell, { bold: true });
      this.applyBorder(cell);
    });

    // Headers unités globales (addition des grilles semestrielles)
    let c = 3;
    semesterGroups.forEach((group, groupIdx) => {
      if (group.units.length === 0) {
        return;
      }

      const groupStart = c;
      const groupEnd = c + group.units.length - 1;
      const semCell = sheet.getCell(row, groupStart);
      semCell.value = `S${groupIdx + 1} - ${group.label}`;
      semCell.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
      this.applyStyle(semCell, { bold: true });
      sheet.mergeCells(row, groupStart, row, groupEnd);

      group.units.forEach((unit) => {
        const cell = sheet.getCell(row + 1, c);
        cell.value = unit.label;
        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
          textRotation: 90,
          wrapText: true,
        };
        sheet.getColumn(c).width = this.getFontSize("SM") / 1.8;
        this.applyStyle(cell, { bold: true, size: "SM" });
        this.applyBorder(cell);

        const subCell = sheet.getCell(row + 2, c);
        subCell.value = "MOY";
        subCell.alignment = { horizontal: "center", vertical: "middle" };
        this.applyStyle(subCell, {});
        this.applyBorder(subCell);

        c++;
      });

      for (let borderCol = groupStart; borderCol <= groupEnd; borderCol++) {
        this.applyBorder(sheet.getCell(row, borderCol));
      }
    });

    // Headers synthèse globale
    const synthHeaders = ["OBT", "MAX", "%", "M", "NCV", "NCNV", "APPR", "DEC"];
    synthHeaders.forEach((title) => {
      const cell = sheet.getCell(row + 1, c);
      cell.value = title;
      cell.alignment = {
        horizontal: "center",
        vertical: "middle",
        textRotation: 90,
      };
      sheet.getColumn(c).width = this.getFontSize("SM") / 1.8;
      this.applyStyle(cell, { bold: true });
      this.applyBorder(cell);

      const subCell = sheet.getCell(row + 2, c);
      subCell.value = "";
      this.applyStyle(subCell, {});
      this.applyBorder(subCell);

      c++;
    });
  }
}
