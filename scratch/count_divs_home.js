import fs from 'fs';
const content = fs.readFileSync('c:/Projetos/GUEPARDO-ENTREGADOR/App.tsx', 'utf8');
const lines = content.split('\n');
const subContent = lines.slice(2714, 3335).join('\n');
const openDiv = (subContent.match(/<div/g) || []).length;
const closeDiv = (subContent.match(/<\/div>/g) || []).length;
console.log(`Open Div: ${openDiv}, Close Div: ${closeDiv}`);
