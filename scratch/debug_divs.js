
import fs from 'fs';

const content = fs.readFileSync('c:/Projetos/GUEPARDO-ENTREGADOR/App.tsx', 'utf8');
const lines = content.split('\n');

const cases = [
    'HOME',
    'FACIAL_VERIFICATION',
    'WALLET',
    'WITHDRAWAL_REQUEST',
    'ORDERS',
    'NOTIFICATIONS',
    'SETTINGS'
];

let currentCase = null;
let divCount = 0;

for (let i = 2700; i < lines.length; i++) { // Skip to renderScreen
    const line = lines[i];
    
    for (let c of cases) {
        if (line.includes(`case '${c}':`)) {
            if (currentCase) {
                console.log(`Case ${currentCase} (ending at line ${i}): Div Balance = ${divCount}`);
            }
            currentCase = c;
            divCount = 0;
            console.log(`DEBUG: Found Case ${c} at line ${i+1}`);
        }
    }

    const opens = (line.match(/<div/gi) || []).length;
    const closes = (line.match(/<\/div>/gi) || []).length;
    const selfCloses = (line.match(/<div[^>]*\/>/gi) || []).length;
    
    divCount += (opens - closes - selfCloses);

    if (line.includes('default:')) {
         if (currentCase) {
            console.log(`Case ${currentCase}: Div Balance = ${divCount}`);
        }
        break;
    }
}
console.log("Audit complete.");
