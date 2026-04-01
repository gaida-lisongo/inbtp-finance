import DocumentJury, { JuryIdentity } from "./DocumentJury";
import { ResultatEtudiant } from "./NoteManager";

export default class DocumentPV extends DocumentJury {
  public async generate(resultats: ResultatEtudiant[], identity: JuryIdentity) {
    // 1. Feuille de Synthèse PV
    const sheet = this.addSheet("PV Délibération");
    let curr = this.drawAcademicHeader(sheet, identity);

    sheet.getCell(curr, 1).value = "STATISTIQUES DE RÉUSSITE";
    this.applyStyle(sheet.getCell(curr, 1), { bold: true, size: "LG" });

    const admis = resultats.filter((r) => r.promotion.pourcentage >= 50).length;
    sheet.getCell(curr + 2, 1).value = `Inscrits: ${resultats.length}`;
    sheet.getCell(curr + 3, 1).value = `Admis: ${admis}`;
    sheet.getCell(curr + 4, 1).value = `Ajournés: ${resultats.length - admis}`;

    if (identity.designation) {
      sheet.getCell(curr + 1, 1).value = `Jury: ${identity.designation}`;
    }

    this.drawSignatureBlock(sheet, curr + 8, identity);

    // 2. On réutilise les autres générateurs pour ajouter les feuilles au même classeur
    // Note: Dans une version optimisée, on passerait le même objet workbook
  }
}
