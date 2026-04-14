import fs from 'fs';

const filePath = 'c:/Projetos/GUEPARDO-ENTREGADOR/App.tsx';
let content = fs.readFileSync(filePath, 'utf8');
let lines = content.split('\n');

const HOME_START = lines.findIndex(l => l.includes("case 'HOME':"));
const IDENTITY_START = lines.findIndex(l => l.includes("case 'IDENTITY_VERIFICATION':"));
const WALLET_START = lines.findIndex(l => l.includes("case 'WALLET':"));

// 1. Fix HOME case (between HOME_START and IDENTITY_START)
// It should end with three closing divs before ); } 
// (2912 closes at 3318, 2715 closes at 3320, 2714 closes at 3321)
// Wait, my previous count said 2714 and 2715 are the outer ones.

const IDENTITY_CODE = `      case 'IDENTITY_VERIFICATION': {
        return (
          <div className="flex flex-col items-center justify-center h-full p-8 bg-[#0f0502]">
            <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mb-8 border border-emerald-500/30">
              <i className="fas fa-face-viewfinder text-4xl text-emerald-500"></i>
            </div>
            <h2 className="text-2xl font-black text-white italic mb-4">Verificação de Identidade</h2>
            <p className="text-zinc-400 text-sm mb-10 max-w-xs text-center">Precisamos confirmar que você é o titular desta conta para garantir sua segurança.</p>
            <div className="w-full aspect-square max-w-sm rounded-[40px] border-4 border-[#FF6B00] bg-zinc-900 mb-10 relative overflow-hidden shadow-[0_0_50px_rgba(255,107,0,0.15)]">
               <div className="absolute inset-x-0 h-0.5 bg-[#FF6B00] animate-[scan_3s_ease-in-out_infinite] shadow-[0_0_15px_#FF6B00]"></div>
            </div>
            <button 
              onClick={() => {
                setStatus(DriverStatus.ONLINE);
                setCurrentScreen('HOME');
              }}
              className="w-full h-16 bg-[#FF6B00] rounded-[24px] font-black text-white hover:brightness-110 active:scale-95 transition-all shadow-xl uppercase tracking-widest"
            >
              INICIAR CAPTURA
            </button>
            <button onClick={() => setCurrentScreen('HOME')} className="mt-6 text-zinc-500 font-bold text-xs uppercase tracking-widest active:scale-95 transition-transform">Pular por enquanto</button>
          </div>
        );
      }`;

// Holistic reconstruction of the switch area from HOME to WALLET
if (HOME_START !== -1 && WALLET_START !== -1) {
    const head = lines.slice(0, HOME_START);
    const mid = [
        "      case 'HOME': {",
        "        return (",
        "          <div className=\"flex flex-col h-full relative overflow-hidden\">",
        "            <div className=\"flex-1 relative\">",
        "              <MapComponent",
        "                status={status}",
        "                mission={mission}",
        "                currentLocation={currentLocation}",
        "                mapMode={mapMode}",
        "                theme={theme}",
        "              />",
        "              <MapControls",
        "                onRecenter={() => {}}",
        "                onToggleLayers={() => setShowLayersModal(true)}",
        "              />",
        ...lines.slice(HOME_START + 12, lines.findIndex(l => l.includes('3319:             )}'))).filter(l => !l.startsWith('XXXXX')), // Heuristic
        "            </div>",
        "          </div>",
        "        );",
        "      }",
        IDENTITY_CODE
    ];
    // This is too complex for a one-off script. I'll just use precise line replacement.
}

// SIMPLER SCRIPT:
// Replace line 3319 to 3333 with the fixed closures and IDENTITY_VERIFICATION case.

const fixLines = (start, end, newLines) => {
    lines.splice(start - 1, end - start + 1, ...newLines);
};

// FIX HOME CLOSURE (line 3319 area)
// lines[3318] is line 3319 in view_file
// Let's find ")}""
const layerCloseIndex = lines.findIndex(l => l.includes(')}')) + 1; // 3320
console.log('Found layers close at', layerCloseIndex);

// I'll just write the whole thing from 3318 to 3335
const REPAIR_BLOCK = [
    '              </div>',
    '            )}',
    '          </div>',
    '        </div>',
    '        );',
    '      }',
    IDENTITY_CODE
];

// Based on latest view:
// 3319: )}
// 3320: </div>
// 3321: </div>
// 3322: );
// 3323: }
// 3324: case 'IDENTITY_VERIFICATION' ...
// 3332: );
// 3333: }

// I'll replace 3318 to 3333 (view lines)
// lines are 0-indexed, so 3317 to 3332

lines.splice(3318, 3333 - 3318 + 1, ...REPAIR_BLOCK);

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('Successfully applied structural repair.');
