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
  theme?: 'light' | 'dark';
}

export const QuickFilters: React.FC<Props> = ({
  filters,
  onDatePreset,
  onDomainToggle,
  onQualityToggle,
  availableDomains,
  topDomains,
  theme = 'dark',
}) => {
  const isDark = theme === 'dark';
  const datePresets = [
    { key: 'today' as const, label: 'Oggi' },
    { key: 'yesterday' as const, label: 'Ieri' },
    { key: 'week' as const, label: '7 giorni' },
    { key: 'month' as const, label: '30 giorni' },
  ];

  const qualityOptions = [
    { value: QualityClass.LOW, label: 'Bassa', title: 'Bassa (≤799px)', color: 'red' },
    { value: QualityClass.MEDIUM, label: 'Media', title: 'Media (800-1199px)', color: 'yellow' },
    { value: QualityClass.HIGH, label: 'Alta', title: 'Alta (1200-1999px)', color: 'green' },
    { value: QualityClass.VERY_HIGH, label: 'Molto Alta', title: 'Molto Alta (≥2000px)', color: 'cyan' },
  ];

  return (
    <div className={`${isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-white border-slate-300'} backdrop-blur-sm border rounded-xl p-4 mb-6 shadow-lg`}>
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-4 h-4 text-indigo-400" />
        <h3 className={`text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Filtri Rapidi</h3>
        <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Clicca per applicare • I filtri attivi sono evidenziati</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Date Presets */}
        <div className="space-y-2">
          <div className={`flex items-center gap-2 text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-800'} uppercase tracking-wider`}>
            <Calendar className="w-3.5 h-3.5" />
            Periodo
          </div>
          <div className="flex flex-wrap gap-1.5">
            {datePresets.map(preset => (
              <button
                key={preset.key}
                onClick={() => onDatePreset(preset.key)}
                className={`px-3 py-1.5 text-xs rounded-lg border ${isDark ? 'border-slate-700 hover:border-indigo-500 hover:bg-indigo-500/10 text-slate-200 hover:text-indigo-300' : 'border-slate-400 hover:border-indigo-500 hover:bg-indigo-500/10 text-slate-900 hover:text-indigo-700'} transition-all font-semibold`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Top Domains */}
        <div className="space-y-2">
          <div className={`flex items-center gap-2 text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-800'} uppercase tracking-wider`}>
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
                        : isDark ? 'border-slate-700 hover:border-slate-600 text-slate-200' : 'border-slate-400 hover:border-slate-500 text-slate-900'
                    }`}
                    title={isActive ? 'Clicca per rimuovere il filtro' : 'Clicca per filtrare questo dominio'}
                  >
                    {domain}
                  </button>
                );
              })
            ) : (
              <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-700'}`}>Nessun dominio disponibile</span>
            )}
          </div>
        </div>

        {/* Quality Filters */}
        <div className="space-y-2">
          <div className={`flex items-center gap-2 text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-800'} uppercase tracking-wider`}>
            <Image className="w-3.5 h-3.5" />
            Qualità
          </div>
          <div className="flex flex-wrap gap-1.5">
            {qualityOptions.map(option => {
              const isActive = filters.qualities.includes(option.value);
              let colorClass = '';
              if (option.color === 'red') {
                colorClass = isActive 
                  ? isDark ? 'border-red-500 bg-red-500/20 text-red-300' : 'border-red-500 bg-red-100 text-red-800'
                  : isDark ? 'border-red-500/30 hover:border-red-500 text-red-400/70' : 'border-red-300 hover:border-red-400 text-red-700';
              } else if (option.color === 'yellow') {
                colorClass = isActive 
                  ? isDark ? 'border-yellow-500 bg-yellow-500/20 text-yellow-300' : 'border-yellow-500 bg-yellow-100 text-yellow-800'
                  : isDark ? 'border-yellow-500/30 hover:border-yellow-500 text-yellow-400/70' : 'border-yellow-300 hover:border-yellow-400 text-yellow-700';
              } else if (option.color === 'cyan') {
                colorClass = isActive 
                  ? isDark ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300' : 'border-cyan-500 bg-cyan-100 text-cyan-800'
                  : isDark ? 'border-cyan-500/30 hover:border-cyan-500 text-cyan-400/70' : 'border-cyan-300 hover:border-cyan-400 text-cyan-700';
              } else {
                colorClass = isActive 
                  ? isDark ? 'border-green-500 bg-green-500/20 text-green-300' : 'border-green-500 bg-green-100 text-green-800'
                  : isDark ? 'border-green-500/30 hover:border-green-500 text-green-400/70' : 'border-green-300 hover:border-green-400 text-green-700';
              }
              
              return (
                <button
                  key={option.value}
                  onClick={() => onQualityToggle(option.value)}
                  title={option.title}
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

