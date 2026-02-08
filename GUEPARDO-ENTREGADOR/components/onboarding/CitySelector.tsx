import React, { useState } from 'react';
import { City } from '../../types';
import { AVAILABLE_CITIES } from '../../constants-onboarding';

interface CitySelectorProps {
    theme: 'dark' | 'light';
    onCitySelected: (city: City) => void;
    onBack: () => void;
}

export const CitySelector: React.FC<CitySelectorProps> = ({ theme, onCitySelected, onBack }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCity, setSelectedCity] = useState<City | null>(null);

    const filteredCities = AVAILABLE_CITIES.filter(city =>
        city.displayName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCityClick = (city: City) => {
        setSelectedCity(city);
    };

    const handleContinue = () => {
        if (selectedCity) {
            onCitySelected(selectedCity);
        }
    };

    const cardBg = theme === 'dark' ? 'bg-zinc-900' : 'bg-white';
    const textPrimary = theme === 'dark' ? 'text-white' : 'text-zinc-900';
    const textMuted = theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600';
    const borderColor = theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200';
    const inputBg = theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100';

    return (
        <div className={`min-h-screen ${theme === 'dark' ? 'bg-zinc-950' : 'bg-zinc-50'} flex flex-col`}>
            {/* Header */}
            <div className={`${cardBg} border-b ${borderColor} px-4 py-4 flex items-center gap-3`}>
                <button onClick={onBack} className={`${textMuted} hover:${textPrimary}`}>
                    <i className="fas fa-arrow-left text-xl"></i>
                </button>
                <div>
                    <h1 className={`text-xl font-bold ${textPrimary}`}>Selecione sua Praça</h1>
                    <p className={`text-sm ${textMuted}`}>Onde você irá trabalhar?</p>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 px-4 py-6">
                {/* Search Input */}
                <div className="mb-6">
                    <div className={`relative ${inputBg} rounded-xl overflow-hidden`}>
                        <i className={`fas fa-search absolute left-4 top-1/2 -translate-y-1/2 ${textMuted}`}></i>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar cidade..."
                            className={`w-full pl-12 pr-4 py-4 ${inputBg} ${textPrimary} outline-none`}
                        />
                    </div>
                </div>

                {/* City List */}
                <div className="space-y-3">
                    {filteredCities.length > 0 ? (
                        filteredCities.map((city) => (
                            <button
                                key={city.id}
                                onClick={() => handleCityClick(city)}
                                className={`w-full p-4 rounded-xl border-2 transition-all ${selectedCity?.id === city.id
                                        ? 'border-yellow-500 bg-yellow-500/10'
                                        : `${borderColor} ${cardBg} hover:border-yellow-500/50`
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-full ${selectedCity?.id === city.id
                                                ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
                                                : inputBg
                                            } flex items-center justify-center`}>
                                            <i className={`fas fa-map-marker-alt text-xl ${selectedCity?.id === city.id ? 'text-zinc-900' : textMuted
                                                }`}></i>
                                        </div>
                                        <div className="text-left">
                                            <p className={`font-bold ${textPrimary}`}>{city.name}</p>
                                            <p className={`text-sm ${textMuted}`}>{city.state}</p>
                                        </div>
                                    </div>
                                    {selectedCity?.id === city.id && (
                                        <i className="fas fa-check-circle text-2xl text-yellow-500"></i>
                                    )}
                                </div>
                            </button>
                        ))
                    ) : (
                        <div className={`text-center py-12 ${cardBg} rounded-xl border ${borderColor}`}>
                            <i className={`fas fa-search text-4xl ${textMuted} mb-3`}></i>
                            <p className={`${textMuted}`}>Nenhuma cidade encontrada</p>
                        </div>
                    )}
                </div>

                {/* Info Box */}
                <div className={`mt-6 ${inputBg} rounded-xl p-4`}>
                    <p className={`text-sm ${textMuted} flex items-start gap-2`}>
                        <i className="fas fa-info-circle mt-0.5"></i>
                        <span>
                            Você receberá entregas apenas na cidade selecionada.
                            Você poderá alterar sua praça posteriormente nas configurações.
                        </span>
                    </p>
                </div>
            </div>

            {/* Footer */}
            <div className={`${cardBg} border-t ${borderColor} px-4 py-4`}>
                <button
                    onClick={handleContinue}
                    disabled={!selectedCity}
                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${selectedCity
                            ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-zinc-900 hover:shadow-lg hover:scale-[1.02]'
                            : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                        }`}
                >
                    {selectedCity ? (
                        <>
                            <i className="fas fa-arrow-right mr-2"></i>
                            Continuar para {selectedCity.name}
                        </>
                    ) : (
                        <>
                            <i className="fas fa-map-marker-alt mr-2"></i>
                            Selecione uma cidade
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
