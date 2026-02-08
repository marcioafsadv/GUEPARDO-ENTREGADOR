import React, { useState } from 'react';

interface CitySelectionProps {
    onCitySelect: (city: string) => void;
    onBack: () => void;
    theme?: 'dark' | 'light';
}

// Lista de cidades disponíveis (pode ser expandida ou vir de uma API)
const AVAILABLE_CITIES = [
    { name: 'Itu', state: 'SP' },
    { name: 'Salto', state: 'SP' },
    { name: 'Indaiatuba', state: 'SP' },
    { name: 'Sorocaba', state: 'SP' },
    { name: 'Campinas', state: 'SP' },
    { name: 'São Paulo', state: 'SP' },
];

const CitySelection: React.FC<CitySelectionProps> = ({ onCitySelect, onBack, theme = 'dark' }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCity, setSelectedCity] = useState<string | null>(null);

    const filteredCities = AVAILABLE_CITIES.filter(city =>
        city.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        city.state.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCityClick = (cityName: string, state: string) => {
        const fullCityName = `${cityName} - ${state}`;
        setSelectedCity(fullCityName);
    };

    const handleContinue = () => {
        if (selectedCity) {
            onCitySelect(selectedCity);
        }
    };

    const cardBg = theme === 'dark' ? 'bg-zinc-900 border-white/5' : 'bg-white border-zinc-200';
    const innerBg = theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100';
    const textPrimary = theme === 'dark' ? 'text-white' : 'text-zinc-900';
    const textMuted = theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400';

    return (
        <div className={`h-screen w-screen flex flex-col items-center justify-center p-6 ${theme === 'dark' ? 'bg-black' : 'bg-zinc-50'}`}>
            <div className={`w-full max-w-md rounded-3xl border p-8 ${cardBg} space-y-6`}>
                {/* Header */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={onBack}
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${innerBg} ${textMuted} hover:scale-105 transition-transform`}
                    >
                        <i className="fas fa-chevron-left"></i>
                    </button>
                    <h2 className={`text-xl font-black italic ${textPrimary}`}>Selecione sua Praça</h2>
                    <div className="w-10"></div>
                </div>

                {/* Description */}
                <div className={`p-4 rounded-xl ${innerBg}`}>
                    <p className={`text-sm ${textMuted} text-center`}>
                        <i className="fas fa-map-marker-alt text-[#FF6B00] mr-2"></i>
                        Escolha a cidade onde você irá trabalhar como entregador
                    </p>
                </div>

                {/* Search input */}
                <div>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar cidade..."
                        className={`w-full h-12 rounded-xl px-4 ${innerBg} ${textPrimary} outline-none border border-white/5 focus:border-[#FF6B00] font-bold placeholder:text-zinc-600`}
                    />
                </div>

                {/* City list */}
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                    {filteredCities.length === 0 ? (
                        <div className={`p-4 text-center ${textMuted}`}>
                            <i className="fas fa-search mb-2 text-2xl"></i>
                            <p className="text-sm">Nenhuma cidade encontrada</p>
                        </div>
                    ) : (
                        filteredCities.map((city) => {
                            const fullCityName = `${city.name} - ${city.state}`;
                            const isSelected = selectedCity === fullCityName;

                            return (
                                <button
                                    key={fullCityName}
                                    onClick={() => handleCityClick(city.name, city.state)}
                                    className={`w-full p-4 rounded-xl flex items-center justify-between transition-all ${isSelected
                                            ? 'bg-[#FF6B00] text-white'
                                            : `${innerBg} ${textPrimary} hover:border-[#FF6B00]`
                                        } border ${isSelected ? 'border-[#FF6B00]' : 'border-transparent'}`}
                                >
                                    <div className="flex items-center space-x-3">
                                        <i className={`fas fa-map-marker-alt ${isSelected ? 'text-white' : 'text-[#FF6B00]'}`}></i>
                                        <div className="text-left">
                                            <p className="font-black">{city.name}</p>
                                            <p className={`text-xs ${isSelected ? 'text-white/70' : textMuted}`}>{city.state}</p>
                                        </div>
                                    </div>
                                    {isSelected && (
                                        <i className="fas fa-check-circle text-white"></i>
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Continue button */}
                <button
                    onClick={handleContinue}
                    disabled={!selectedCity}
                    className="w-full h-14 bg-[#FF6B00] rounded-2xl font-black text-white uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                    Continuar
                </button>
            </div>
        </div>
    );
};

export default CitySelection;
