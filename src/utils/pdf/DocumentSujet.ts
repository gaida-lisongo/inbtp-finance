class DocumentSujet extends Document {
    projet : {
        titre: string,
        directeur: string,
        co_directeur: string,
        thematique: string[],
        justification: 
    } = {

    }

    student : {

    } = {

    }

    constructor(){
        super();
    }

    async generate(verifyUrl: string, signature: {
        type: 'Protocle' | 'Couverture',
        nom: string,
        titre: string
    }) {

    }
}