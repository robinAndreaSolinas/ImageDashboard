import React from 'react';
import { Filter, Calendar, Globe, Image } from 'lucide-react';
import { QualityClass } from '../types';

interface Props {
  filters: {
    dateRange: { start: string; end: string };
    selectedDomains: string[];
    qualities: QualityClass[];
  };
  onDatePreset: (preset: 'today' | 'yesterday' | 'week' | 'month') => void;
  onDomainToggle: (domain: string) => void;
  onQualityToggle: (quality: QualityClass) => void;
  availableDomains: string[];
  topDomains: string[];
}

export const QuickFilters: React.FC<Props> = ({
  filters,
  onDatePreset,
  onDomainToggle,
  onQualityToggle,
  availableDomains,
  topDomains,
}) => {
  const datePresets = [
    { key: 'today' as const, label: 'Oggi' },
    { key: 'yesterday' as const, label: 'Ieri' },
    { key: 'week' as const, label: '7 giorni' },
    { key: 'month' as const, label: '30 giorni' },
  ];

  const qualityOptions = [
    { value: QualityClass.LOW, label: 'Bassa', color: 'red' },
    { value: QualityClass.MEDIUM, label: 'Media', color: 'yellow' },
    { value: QualityClass.HIGH, label: 'Alta', color: 'green' },
    { value: QualityClass.VERY_HIGH, label: 'Molto Alta', color: 'green' },
  ];

  return (
    <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-800 rounded-xl p-4 mb-6 shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-4 h-4 text-indigo-400" />
        <h3 className="text-sm font-bold text-slate-200">Filtri Rapidi</h3>
        <span className="text-xs text-slate-500">Clicca per applicare • I filtri attivi sono evidenziati</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Date Presets */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5" />
            Periodo
          </div>
          <div className="flex flex-wrap gap-1.5">
            {datePresets.map(preset => (
              <button
                key={preset.key}
                onClick={() => onDatePreset(preset.key)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-700 hover:border-indigo-500 hover:bg-indigo-500/10 text-slate-300 hover:text-indigo-300 transition-all font-medium"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Top Domains */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <Globe className="w-3.5 h-3.5" />
            Domini ({topDomains.length})
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
            {topDomains.length > 0 ? (
              topDomains.slice(0, 6).map(domain => {
                const isActive = filters.selectedDomains.includes(domain);
                return (
                  <button
                    key={domain}
                    onClick={() => onDomainToggle(domain)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-all font-medium ${
                      isActive
                        ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                        : 'border-slate-700 hover:border-slate-600 text-slate-300'
                    }`}
                    title={isActive ? 'Clicca per rimuovere il filtro' : 'Clicca per filtrare questo dominio'}
                  >
                    {domain}
                  </button>
                );
              })
            ) : (
              <span className="text-xs text-slate-500">Nessun dominio disponibile</span>
            )}
          </div>
        </div>

        {/* Quality Filters */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <Image className="w-3.5 h-3.5" />
            Qualità
          </div>
          <div className="flex flex-wrap gap-1.5">
            {qualityOptions.map(option => {
              const isActive = filters.qualities.includes(option.value);
              const colorClass = option.color === 'red' 
                ? isActive ? 'border-red-500 bg-red-500/20 text-red-300' : 'border-red-500/30 hover:border-red-500 text-red-400/70'
                : option.color === 'yellow'
                ? isActive ? 'border-yellow-500 bg-yellow-500/20 text-yellow-300' : 'border-yellow-500/30 hover:border-yellow-500 text-yellow-400/70'
                : isActive ? 'border-green-500 bg-green-500/20 text-green-300' : 'border-green-500/30 hover:border-green-500 text-green-400/70';
              
              return (
                <button
                  key={option.value}
                  onClick={() => onQualityToggle(option.value)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-all font-medium ${colorClass}`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

