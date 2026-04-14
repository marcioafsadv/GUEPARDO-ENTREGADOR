
import fs from 'fs';

const filePath = 'c:/Projetos/GUEPARDO-ENTREGADOR/App.tsx';
let content = fs.readFileSync(filePath, 'utf8');
let lines = content.split('\n');

// 1. Identify the block to replace
// Start: After HoldToFillButton (around 3256)
// End: Case transition (around 3323)

const part1 = lines.slice(0, 3256);
const part2 = lines.slice(3322);

const rootBg = 'bg-[#0f0502]/95 backdrop-blur-xl';
const innerBg = 'bg-[#1a0c06]';
const cardBg = 'bg-[#0f0502]/95 backdrop-blur-xl';
const textPrimary = 'text-white';
const textMuted = 'text-chocolate-muted';


const middle = [
'                  </div>',
'                </div>',
'              </div>',
'            )}',
'',
'            {showLayersModal && (',
'              <div className="absolute inset-0 bg-black/80 z-[6000] flex items-end sm:items-center justify-center p-0 sm:p-6 backdrop-blur-sm animate-in fade-in duration-300">',
'                <div className={`w-full max-w-sm rounded-t-[40px] sm:rounded-[40px] p-8 border-t border-white/10 shadow-2xl animate-in slide-in-from-bottom duration-300 pb-12 ${cardBg}`}>',
'                  <div className="flex justify-between items-center mb-8">',
'                    <h2 className={`text-2xl font-black italic ${textPrimary}`}>Camadas do Mapa</h2>',
'                    <button onClick={() => setShowLayersModal(false)} className={`w-10 h-10 rounded-full flex items-center justify-center ${innerBg} ${textMuted} active:scale-90 transition-transform`}>',
'                      <i className="fas fa-times text-lg"></i>',
'                    </button>',
'                  </div>',
'',
'                  <div className="space-y-4">',
'                    <div className={`p-5 rounded-[28px] border border-white/5 flex items-center justify-between cursor-pointer transition-colors ${showHeatMap ? "bg-[#FF6B00]/10 border-[#FF6B00]/30" : innerBg}`} onClick={() => setShowHeatMap(!showHeatMap)}>',
'                      <div className="flex items-center space-x-4">',
'                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${showHeatMap ? "bg-[#FF6B00] text-white" : "bg-zinc-700/50 text-zinc-500"}`}>',
'                          <i className="fas fa-fire"></i>',
'                        </div>',
'                        <div>',
'                          <h3 className={`text-sm font-black uppercase tracking-wide ${textPrimary}`}>Zonas de Alta Demanda</h3>',
'                          <p className={`text-[9px] font-bold ${textMuted}`}>Visualizar Heatmap</p>',
'                        </div>',
'                      </div>',
'                      <div className={`w-11 h-6 rounded-full relative transition-colors ${showHeatMap ? "bg-[#FF6B00]" : "bg-zinc-700"}`}>',
'                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${showHeatMap ? "translate-x-5" : ""}`}></div>',
'                      </div>',
'                    </div>',
'',
'                    <div className={`p-5 rounded-[28px] border border-white/5 flex items-center justify-between cursor-pointer transition-colors ${showTraffic ? "bg-red-500/10 border-red-500/30" : innerBg}`} onClick={() => setShowTraffic(!showTraffic)}>',
'                      <div className="flex items-center space-x-4">',
'                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${showTraffic ? "bg-red-500 text-white" : "bg-zinc-700/50 text-zinc-500"}`}>',
'                          <i className="fas fa-traffic-light"></i>',
'                        </div>',
'                        <div>',
'                          <h3 className={`text-sm font-black uppercase tracking-wide ${textPrimary}`}>Trânsito em Tempo Real</h3>',
'                          <p className={`text-[9px] font-bold ${textMuted}`}>Camada de Tráfego</p>',
'                        </div>',
'                      </div>',
'                      <div className={`w-11 h-6 rounded-full relative transition-colors ${showTraffic ? "bg-red-500" : "bg-zinc-700"}`}>',
'                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${showTraffic ? "translate-x-5" : ""}`}></div>',
'                      </div>',
'                    </div>',
'',
'                    <div className={`p-5 rounded-[28px] border border-white/5 flex items-center justify-between cursor-pointer transition-colors ${mapMode === "satellite" ? "bg-[#33CCFF]/10 border-[#33CCFF]/30" : innerBg}`} onClick={() => setMapMode(prev => prev === "standard" ? "satellite" : "standard")}>',
'                      <div className="flex items-center space-x-4">',
'                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${mapMode === "satellite" ? "bg-[#33CCFF] text-white" : "bg-zinc-700/50 text-zinc-500"}`}>',
'                          <i className="fas fa-satellite"></i>',
'                        </div>',
'                        <div>',
'                          <h3 className={`text-sm font-black uppercase tracking-wide ${textPrimary}`}>Modo Satélite</h3>',
'                          <p className={`text-[9px] font-bold ${textMuted}`}>Visão Aérea</p>',
'                        </div>',
'                      </div>',
'                      <div className={`w-11 h-6 rounded-full relative transition-colors ${mapMode === "satellite" ? "bg-[#33CCFF]" : "bg-zinc-700"}`}>',
'                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${mapMode === "satellite" ? "translate-x-5" : ""}`}></div>',
'                      </div>',
'                    </div>',
'                  </div>',
'                </div>',
'              </div>',
'            )}',
'          </div>',
'        );',
'      }'
];

fs.writeFileSync(filePath, part1.concat(middle, part2).join('\n'));
console.log('Atomic reconstruction of HOME case achieved.');
