import React from 'react';
import { FilterState } from '../types';
import { X, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

interface Props {
  filters: FilterState;
  onRemoveFilter: (type: keyof FilterState, value?: any) => void;
  onClearAll: () => void;
}

export const ActiveFilters: React.FC<Props> = ({ filters, onRemoveFilter, onClearAll }) => {
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
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
          <h3 className="text-sm font-semibold text-slate-200">
            Filtri Attivi ({activeFiltersCount})
          </h3>
          <span className="text-xs text-slate-500">Clicca sulla X per rimuovere un filtro</span>
        </div>
        <button
          onClick={onClearAll}
          className="text-xs text-slate-400 hover:text-indigo-400 transition-colors px-2 py-1 rounded hover:bg-slate-700 font-medium"
          title="Rimuovi tutti i filtri (eccetto il periodo)"
        >
          Rimuovi tutti
        </button>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {filters.selectedDomains.map(domain => (
          <span
            key={domain}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-900/40 border border-indigo-500/30 rounded-md text-xs text-indigo-200"
          >
            Dominio: {domain}
            <button
              onClick={() => onRemoveFilter('selectedDomains', domain)}
              className="hover:text-indigo-400 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        {filters.qualities.map(quality => (
          <span
            key={quality}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-900/40 border border-purple-500/30 rounded-md text-xs text-purple-200"
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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-900/40 border border-emerald-500/30 rounded-md text-xs text-emerald-200">
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
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-900/40 border border-green-500/30 rounded-md text-xs text-green-200"
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
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-900/40 border border-amber-500/30 rounded-md text-xs text-amber-200"
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
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-900/40 border border-rose-500/30 rounded-md text-xs text-rose-200"
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

