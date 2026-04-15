import Document from "./Document";

class DocumentStage extends Document {
    constructor(){
        super();

        this.docDefinition.styles = {
            ...this.docDefinition.styles,
            objet: {
                italics: true,
                bold: true,
                fontSize: this.chart.xs,
                alignment: 'right',
                lineHeight: 1 // 👈 au lieu de 1.35 (gros impact)
            },
            destinataire:{
                italics: true,
                fontSize: this.chart.xs,
                alignment: 'left',
            },
            content: {
                
            }
        }
    }

    parseData(){

    }

    async generate(payload: string){
        await this.background();
        await this.buildFooter(payload);
        await this.adminLayout()
    }
}

export default DocumentStage