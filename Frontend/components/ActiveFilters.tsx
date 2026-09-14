import React from 'react';
import { FilterState } from '../types';
import { X, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

interface Props {
  filters: FilterState;
  onRemoveFilter: (type: keyof FilterState, value?: any) => void;
  onClearAll: () => void;
  theme?: 'light' | 'dark';
}

export const ActiveFilters: React.FC<Props> = ({ filters, onRemoveFilter, onClearAll, theme = 'dark' }) => {
  const isDark = theme === 'dark';
  const activeFiltersCount = 
    (filters.selectedDomains.length > 0 ? 1 : 0) +
    (filters.qualities.length > 0 ? 1 : 0) +
    (filters.hasVideo !== null ? 1 : 0) +
    (filters.sources.length > 0 ? 1 : 0) +
    (filters.orientations.length > 0 ? 1 : 0) +
    (filters.types.length > 0 ? 1 : 0);

  const hasAnyFilters = activeFiltersCount > 0;

  if (!hasAnyFilters) return null;

  const formatDate = (iso: string) => {
    try {
      return format(parseISO(iso), 'dd MMM yyyy', { locale: it });
    } catch {
      return iso.split('T')[0];
    }
  };

  return (
    <div className={`${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-100 border-slate-300'} border rounded-lg p-4 mb-6`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
          <h3 className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            Filtri Attivi ({activeFiltersCount})
          </h3>
          <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Clicca sulla X per rimuovere un filtro</span>
        </div>
        <button
          onClick={onClearAll}
          className={`text-xs ${isDark ? 'text-slate-300 hover:text-indigo-300 hover:bg-slate-700' : 'text-slate-800 hover:text-indigo-700 hover:bg-slate-200'} transition-colors px-2 py-1 rounded font-semibold`}
          title="Rimuovi tutti i filtri (eccetto il periodo)"
        >
          Rimuovi tutti
        </button>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {filters.selectedDomains.map(domain => (
          <span
            key={domain}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${isDark ? 'bg-indigo-900/50 border-indigo-500/40 text-indigo-100' : 'bg-indigo-100 border-indigo-300 text-indigo-800'} border rounded-md text-xs font-medium`}
          >
            Dominio: {domain}
            <button
              onClick={() => onRemoveFilter('selectedDomains', domain)}
              className={`${isDark ? 'hover:text-indigo-300' : 'hover:text-indigo-700'} transition-colors`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        {filters.qualities.map(quality => (
          <span
            key={quality}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${isDark ? 'bg-purple-900/50 border-purple-500/40 text-purple-100' : 'bg-purple-100 border-purple-300 text-purple-800'} border rounded-md text-xs font-medium`}
          >
            Qualità: {quality}
            <button
              onClick={() => onRemoveFilter('qualities', quality)}
              className="hover:text-purple-400 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        {filters.hasVideo !== null && (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${isDark ? 'bg-emerald-900/50 border-emerald-500/40 text-emerald-100' : 'bg-emerald-100 border-emerald-300 text-emerald-800'} border rounded-md text-xs font-medium`}>
            Video: {filters.hasVideo ? 'Sì' : 'No'}
            <button
              onClick={() => onRemoveFilter('hasVideo')}
              className="hover:text-emerald-400 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        {filters.sources.map(source => (
          <span
            key={source}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${isDark ? 'bg-green-900/50 border-green-500/40 text-green-100' : 'bg-green-100 border-green-300 text-green-800'} border rounded-md text-xs font-medium`}
          >
            Redazione: {source}
            <button
              onClick={() => onRemoveFilter('sources', source)}
              className="hover:text-green-400 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        {filters.orientations.map(orientation => (
          <span
            key={orientation}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${isDark ? 'bg-amber-900/50 border-amber-500/40 text-amber-100' : 'bg-amber-100 border-amber-300 text-amber-800'} border rounded-md text-xs font-medium`}
          >
            Orientamento: {orientation}
            <button
              onClick={() => onRemoveFilter('orientations', orientation)}
              className="hover:text-amber-400 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        {filters.types.map(type => (
          <span
            key={type}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${isDark ? 'bg-rose-900/50 border-rose-500/40 text-rose-100' : 'bg-rose-100 border-rose-300 text-rose-800'} border rounded-md text-xs font-medium`}
          >
            Tipo: {type}
            <button
              onClick={() => onRemoveFilter('types', type)}
              className="hover:text-rose-400 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
};

