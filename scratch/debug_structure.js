
import fs from 'fs';

const content = fs.readFileSync('c:/Projetos/GUEPARDO-ENTREGADOR/App.tsx', 'utf8');
const lines = content.split('\n');

let braceLevel = 0;
let parenLevel = 0;
let angleLevel = 0;
let inString = false;
let stringChar = '';
let inComment = false;
let inMultiComment = false;
let inJSX = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
        const char = line[j];
        const next = line[j + 1];

        if (inString) {
            if (char === stringChar && line[j - 1] !== '\\') inString = false;
            continue;
        }

        if (inComment) {
            if (char === '\n') inComment = false;
            continue;
        }

        if (inMultiComment) {
            if (char === '*' && next === '/') {
                inMultiComment = false;
                j++;
            }
            continue;
        }

        if (char === '/' && next === '/') {
            inComment = true;
            j++;
            continue;
        }

        if (char === '/' && next === '*') {
            inMultiComment = true;
            j++;
            continue;
        }

        if (char === '"' || char === "'" || char === '`') {
            inString = true;
            stringChar = char;
            continue;
        }

        if (char === '{') braceLevel++;
        if (char === '}') braceLevel--;
        if (char === '(') parenLevel++;
        if (char === ')') parenLevel--;

        if (braceLevel < 0 || parenLevel < 0) {
            console.log(`BREAK at Line ${i + 1}, Col ${j + 1}: Brace=${braceLevel}, Paren=${parenLevel}`);
            process.exit(1);
        }
    }
}

console.log(`FINAL BALANCE: Brace=${braceLevel}, Paren=${parenLevel}`);
