
import fs from 'fs';

const filePath = 'c:/Projetos/GUEPARDO-ENTREGADOR/App.tsx';
let content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

function auditBrackets(startLine, endLine) {
    let divs = 0;
    let braces = 0;
    let parens = 0;
    
    for (let i = startLine; i <= endLine; i++) {
        const line = lines[i];
        if (!line) continue;
        
        // Divs
        const divOpens = (line.match(/<div(?!.*\/>)/gi) || []).length;
        const divCloses = (line.match(/<\/div>/gi) || []).length;
        divs += (divOpens - divCloses);
        
        // Braces
        const braceOpens = (line.match(/\{/g) || []).length;
        const braceCloses = (line.match(/\}/g) || []).length;
        braces += (braceOpens - braceCloses);
        
        // Parens
        const parenOpens = (line.match(/\(/g) || []).length;
        const parenCloses = (line.match(/\)/g) || []).length;
        parens += (parenOpens - parenCloses);
    }
    
    return { divs, braces, parens };
}

console.log('HOME block (2712-3323):', auditBrackets(2712, 3323));
console.log('MISSION block (2911-3260):', auditBrackets(2911, 3260));
console.log('LAYERS block (3262-3320):', auditBrackets(3262, 3320));
