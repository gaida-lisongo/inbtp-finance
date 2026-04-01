import DocumentJury, { JuryIdentity } from "./DocumentJury";
import { ResultatEtudiant } from "./NoteManager";

export default class DocumentPalmares extends DocumentJury {
  public async generate(resultats: ResultatEtudiant[], identity: JuryIdentity) {
    const sheet = this.addSheet("Palmarès Global");
    let curr = this.drawAcademicHeader(sheet, identity);

    const headers = [
      "Rang",
      "Matricule",
      "Nom et Postnom",
      "Pourcentage",
      "Mention",
      "Décision",
    ];
    const headerRow = sheet.getRow(curr);
    headers.forEach((h, i) => {
      headerRow.getCell(i + 1).value = h;
      this.applyStyle(headerRow.getCell(i + 1), {
        bg: "PRIMARY",
        color: "WHITE",
        bold: true,
      });
    });

    const sorted = [...resultats].sort(
      (a, b) => b.promotion.pourcentage - a.promotion.pourcentage,
    );

    sorted.forEach((etud, idx) => {
      const r = sheet.getRow(curr + 1 + idx);
      r.values = [
        idx + 1,
        etud.matricule,
        etud.studentName,
        etud.promotion.pourcentage / 100,
        etud.promotion.mention,
        etud.promotion.pourcentage >= 50 ? "ADMIS" : "AJOURNÉ",
      ];
      r.getCell(4).numFmt = "0.00%";
      this.applyStyle(r.getCell(5), {
        bold: true,
        color: etud.promotion.pourcentage >= 50 ? "SUCCESS" : "DANGER",
      });
    });

    this.drawSignatureBlock(sheet, curr + sorted.length + 3, identity);
  }
}
