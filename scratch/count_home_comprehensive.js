import fs from 'fs';
const content = fs.readFileSync('c:/Projetos/GUEPARDO-ENTREGADOR/App.tsx', 'utf8');
const lines = content.split('\n');
const subContent = lines.slice(2709, 3334).join('\n');
const openDiv = (subContent.match(/<div/g) || []).length;
const closeDiv = (subContent.match(/<\/div>/g) || []).length;
console.log(`Open Div: ${openDiv}, Close Div: ${closeDiv}`);
function count(s, c) { return (s.match(new RegExp('\\'+c, 'g')) || []).length; }
console.log(`Braces: {:${count(subContent, '{')} }:${count(subContent, '}')}`);
console.log(`Parens: (:${count(subContent, '(')} ):${count(subContent, ')')}`);
