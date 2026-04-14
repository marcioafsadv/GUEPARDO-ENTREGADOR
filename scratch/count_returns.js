import fs from 'fs';
const content = fs.readFileSync('c:/Projetos/GUEPARDO-ENTREGADOR/App.tsx', 'utf8');
const openR = (content.match(/return \(/g) || []).length;
const closeR = (content.match(/\);/g) || []).length;
console.log(`Return Open: ${openR}, Return Close: ${closeR}`);
