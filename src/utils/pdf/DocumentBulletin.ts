import Document, { Note } from "./Document";

type item = {
    text: string;
    style : string
}[]

class DocumentBulletin extends Document {
    items: [item]

    constructor(){
        super();
        this.items
    }

    parseData(data : Note[]) {

        const items = data.flatMap((u: Note) =>{
            const moyenne = [
            {text: `${u.unite}`, style: 'tabUnite', color: u.moyenne < 10 ? testFocument.chart.secondary : testFocument.chart.black, colSpan: 4}, 
            '',
            '',
            '',
            {text: `${u.credit}`, style: 'tabUnite', color: u.moyenne < 10 ? testFocument.chart.secondary : testFocument.chart.black,},
            {text: `${u.moyenne}`, style: 'tabUnite', color: u.moyenne < 10 ? testFocument.chart.secondary : testFocument.chart.black,}
            ]
            const ecues = u.elements.map(ec=>[
            {text: ec.designation, style: 'tabEC'},
            {text: String(ec.cc), style: 'tabEC'},
            {text: String(ec.examen), style: 'tabEC'},
            {text: String(ec.rattrage), style: 'tabEC'},
            {text: String(ec.credit), style: 'tabEC'},
            {text: ec.examen + ec.cc > ec.rattrage ? (ec.examen + ec.cc).toFixed(2) : ec.rattrage, style: 'tabEC'},
            ])

            return [
            ...ecues,
            moyenne
            ]
        });

        this.items = items
    }

    async generate(){
        await this.studentLayout([		
    {
			table: {
				headerRows: 1,
        widths: ['*', 25, 25, 25, 25, 25],
				// dontBreakRows: true,
				// keepWithHeaderRows: 1,
				body: [
					[
            {
              text: 'Matière', 
              style: 'tabHeader',
            },
            {
              text: 'CC', 
              style: 'tabHeader'
            }, 
            {
              text: 'EX', 
              style: 'tabHeader'
            },
            {
              text: 'RT', 
              style: 'tabHeader'
            },
            {
              text: 'CRT', 
              style: 'tabHeader'
            },
            {
              text: 'TOT', 
              style: 'tabHeader'
            } 
          ],
          ...items,
					/* [
						'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
						'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
						'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
					] */
				]
			}
		},
    {
      margin: [0, 5, 0, 0],
      columns: [
        { width: '*', text: '' }, // espace vide à gauche
        {
          width: 'auto',
          table: {
            widths: [60, 40],
            body: [
              [
                { text: 'Synthèse du Semestre', colSpan: 2, style: "tabHeader" },
                ''
              ],
              [{ text: 'NCV', style: 'tabUnite' }, { text: String(syntheses.ncv(data)), style: 'tabUnite' }],
              [{ text: 'NCNV', style: 'tabUnite' }, { text: String(syntheses.ncnv(data)), style: 'tabUnite' }],
              [{ text: 'MOYENNE', style: 'tabUnite' }, { text: `${syntheses.moyenne(data).toFixed(2)}/20`, style: 'tabUnite' }],
              [{ text: 'MENTION', style: 'tabUnite' }, { text: getMentions(syntheses.moyenne(data)), style: 'tabUnite' }],
              [{
                text: 'DECISION',
                style: 'tabUnite'
              }, {
                text: syntheses.moyenne(data) >= 10 ? 'V' : 'NV',
                style: 'tabUnite',
                color: syntheses.moyenne(data) >= 10 ? 'green' : testFocument.chart.secondary
              }]
            ]
          }
        }
      ]
    }
  ])
    }

}