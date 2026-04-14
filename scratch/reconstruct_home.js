import fs from 'fs';

const filePath = 'c:/Projetos/GUEPARDO-ENTREGADOR/App.tsx';
let content = fs.readFileSync(filePath, 'utf8');
let lines = content.split(/\r?\n/);

// 1. Find the end of the mission block ()} at 3260 area)
const missionEndIndex = lines.findIndex(l => l.includes('            )}') && l.includes(')}')); 

// 2. Find the end of the HOME case (around 3323)
const homeCaseEndIndex = lines.findIndex(l => l.includes(');') && lines[lines.indexOf(l)+1].includes('      }') && lines[lines.indexOf(l)+2].includes('case \'IDENTITY_VERIFICATION\''));

if (missionEndIndex !== -1 && homeCaseEndIndex !== -1) {
    console.log('Moving layers modal block inside return...');
    
    // The layers modal block starts at 3262 (missionEndIndex + 2)
    // and ends at 3320 (homeCaseEndIndex - 3)
    
    // Let's just reconstruct the whole HOME case closure.
    // We want:
    // ... mission block ...
    //             )}
    //
    //             {showLayersModal && (
    //               ... modal ...
    //             )}
    //           </div>
    //         </div>
    //       );
    //     }

    const head = lines.slice(0, missionEndIndex + 1);
    const layersBlock = lines.slice(missionEndIndex + 2, lines.findIndex(l => l.includes('3320:             )}')) || homeCaseEndIndex - 3); // Heuristic
    // Actually I'll use a safer approach: read the backup and just fix it.
}

// I'll just use a powerful string replacement for the WHOLE HOME case closure.
const SEARCH_STR = `            )}
          </div>
        </div>
        );
      }
      case 'IDENTITY_VERIFICATION': {
        return (
          <div className="flex flex-col items-center justify-center h-full p-8 bg-[#0f0502]">`; 

// Wait, the layers modal is BETWEEN the mission block and the end of HOME.
// Let's see the current file state around 3260.
const currentView = lines.slice(3255, 3270).join('\n');
console.log('Current context at 3260:\n', currentView);

// I will rewrite the whole section from mission closure to IDENTITY_VERIFICATION start.
const RECONSTRUCTED_SECTION = `            )}

            {showLayersModal && (
              <div className="absolute inset-0 bg-black/80 z-[6000] flex items-end sm:items-center justify-center p-0 sm:p-6 backdrop-blur-sm animate-in fade-in duration-300">
                <div className={\`w-full max-w-sm rounded-t-[40px] sm:rounded-[40px] p-8 border-t border-white/10 shadow-2xl animate-in slide-in-from-bottom duration-300 pb-12 \${cardBg}\`}>
                  <div className="flex justify-between items-center mb-8">
                    <h2 className={\`text-2xl font-black italic \${textPrimary}\`}>Camadas do Mapa</h2>
                    <button onClick={() => setShowLayersModal(false)} className={\`w-10 h-10 rounded-full flex items-center justify-center \${innerBg} \${textMuted} active:scale-90 transition-transform\`}>
                      <i className="fas fa-times text-lg"></i>
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div onClick={() => { setMapMode(mapMode === 'satellite' ? 'standard' : 'satellite'); }} className={\`p-5 rounded-3xl border transition-all active:scale-95 cursor-pointer \${mapMode === 'satellite' ? 'border-[#33CCFF] bg-[#33CCFF]/10' : 'border-white/5 bg-black/40'}\`}>
                      <div className="flex items-center justify-between pointer-events-none">
                        <div className="flex items-center space-x-4">
                          <div className={\`w-12 h-12 rounded-2xl flex items-center justify-center \${mapMode === 'satellite' ? 'bg-[#33CCFF] text-white' : 'bg-zinc-800 text-zinc-500'}\`}>
                            <i className="fas fa-globe"></i>
                          </div>
                          <div>
                            <h3 className={\`font-black text-sm \${mapMode === 'satellite' ? 'text-[#33CCFF]' : 'text-white'}\`}>Satélite</h3>
                            <p className={\`text-[9px] font-bold \${textMuted}\`}>Visão Aérea</p>
                          </div>
                        </div>
                        <div className={\`w-11 h-6 rounded-full relative transition-colors \${mapMode === 'satellite' ? 'bg-[#33CCFF]' : 'bg-zinc-700'}\`}>
                          <div className={\`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform \${mapMode === 'satellite' ? 'translate-x-5' : ''}\`}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        );
      }`;

const startIndex = lines.findIndex(l => l.includes('            )}'));
const endIndex = lines.findIndex(l => l.includes('case \'IDENTITY_VERIFICATION\':'));

if (startIndex !== -1 && endIndex !== -1) {
    const head = lines.slice(0, startIndex);
    const tail = lines.slice(endIndex);
    fs.writeFileSync(filePath, head.join('\n') + '\n' + RECONSTRUCTED_SECTION + '\n' + tail.join('\n'), 'utf8');
    console.log('Successfully reconstructed HOME case closure.');
}
