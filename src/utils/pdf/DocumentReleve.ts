import { DocumentRelevePayload, ReleveSummary, ReleveUnitItem } from "@/lib/documents/DocumentReleve";
import Document from "./Document";

class DocumentReleve extends Document {
    private student: {
        nomComplet: string,
        ville: string,
        dateNaissance: Date,
        matricule: string
    } = {
        nomComplet: 'Godefroid BIMA SANTEY',
        ville: 'KINSHASA',
        dateNaissance: new Date(),
        matricule: 'BTP.026.001'

    };

    private programme: {
        classe: string;
        annee: string
    } = {
        classe: 'L1-CIB',
        annee: '2024-2025'
    };

    private units: ReleveUnitItem[] = [];

    private summary: ReleveSummary = {
        ncv: 0,
        ncnv: 60,
        totalObtenu : 0.0,
        totalMax: 20 * 60,
        pourcentage: 0.0,
        mention: 'F',
        decision: 'Double'
    };

    constructor(payload: DocumentRelevePayload){
        super();

        if(payload) this.parseData(payload)

    }

    parseData(data: DocumentRelevePayload){
        this.student = {
            nomComplet: data.studentName,
            ville: data.studentVille,
            dateNaissance: data.studentDateNaiss,
            matricule: data.matricule
        }

        this.programme = {
            classe: data.programmeName,
            annee: data.serialNumber
        }

        this.units = data.units

        this.summary = data.summary

    }

    async generate(payload: string){

    }
}

export default DocumentReleve;