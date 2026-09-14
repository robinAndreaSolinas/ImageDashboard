import React, { useMemo, useState, useEffect, UIEvent } from 'react';
import { DataItem, QualityClass } from '../types';
import { ExternalLink, ArrowLeft, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { getQuality } from '../utils/analytics';

interface Props {
  data: DataItem[];
  totalDayCount?: number;
  onBack?: () => void;
  theme?: 'light' | 'dark';
}

export const UrlTable: React.FC<Props> = React.memo(({ data, totalDayCount, onBack, theme = 'dark' }) => {
  const isDark = theme === 'dark';
  
  // Quality color mapping based on theme
  const getQualityColor = (quality: QualityClass, hasZeroWidth: boolean) => {
    if (hasZeroWidth || quality === QualityClass.LOW) {
      return isDark 
        ? 'bg-red-500/20 border-red-500/50 text-red-300' 
        : 'bg-red-100 border-red-400 text-red-800';
    }
    if (quality === QualityClass.MEDIUM) {
      return isDark 
        ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300' 
        : 'bg-yellow-100 border-yellow-400 text-yellow-800';
    }
    if (quality === QualityClass.HIGH || quality === QualityClass.VERY_HIGH) {
      return isDark 
        ? 'bg-green-500/20 border-green-500/50 text-green-300' 
        : 'bg-green-100 border-green-400 text-green-800';
    }
    return isDark 
      ? 'bg-slate-500/20 border-slate-500/50 text-slate-300' 
      : 'bg-slate-100 border-slate-400 text-slate-800';
  };
  const sortedData = useMemo(
    () => [...data].sort((a, b) => a.domain.localeCompare(b.domain)),
    [data]
  );

  const [visibleCount, setVisibleCount] = useState(200);

  // Reset visible rows when dataset changes
  useEffect(() => {
    setVisibleCount(200);
  }, [sortedData.length]);

  const visibleData = useMemo(
    () => sortedData.slice(0, visibleCount),
    [sortedData, visibleCount]
  );

  const handleScroll = React.useCallback((e: UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const threshold = 100; // px dal fondo

    if (target.scrollTop + target.clientHeight >= target.scrollHeight - threshold) {
      setVisibleCount((prev) =>
        prev < sortedData.length ? Math.min(prev + 200, sortedData.length) : prev
      );
    }
  }, [sortedData.length]);

  // Memoize formatDateTime to avoid recreating on every render
  const formatDateTime = React.useCallback((iso: string) => {
    try {
      const d = parseISO(iso);
      return format(d, 'dd/MM/yyyy HH:mm');
    } catch {
      return iso;
    }
  }, []);

  return (
    <div className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300'} border rounded-xl overflow-hidden shadow-lg`}>
      <div className={`p-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-300'} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className={`mr-2 p-1.5 rounded ${isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-100' : 'hover:bg-slate-200 text-slate-700 hover:text-slate-900'} transition-colors`}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h3 className={`${isDark ? 'text-slate-200' : 'text-slate-900'} font-bold text-lg`}>
              Tabella completa URL
            </h3>
            <div className="flex items-center gap-4 mt-2">
              <div className={`flex items-center gap-2 px-3 py-1.5 ${isDark ? 'bg-indigo-900/30 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200'} border rounded-md`}>
                <span className={`${isDark ? 'text-slate-300' : 'text-slate-700'} text-xs`}>Filtrate:</span>
                <span className="text-indigo-400 font-bold text-sm">{sortedData.length}</span>
              </div>
              {totalDayCount !== undefined && (
                <div className={`flex items-center gap-2 px-3 py-1.5 ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-100 border-slate-300'} border rounded-md`}>
                  <span className={`${isDark ? 'text-slate-400' : 'text-slate-700'} text-xs`}>Totali (solo data):</span>
                  <span className={`${isDark ? 'text-slate-200' : 'text-slate-900'} font-bold text-sm`}>{totalDayCount}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div
        className="overflow-auto max-h-[calc(100vh-200px)]"
        onScroll={handleScroll}
      >
        <table className={`w-full text-left text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
          <thead className={`${isDark ? 'bg-slate-950/80 text-slate-300' : 'bg-slate-200 text-slate-800'} uppercase text-[10px] font-bold tracking-wider`}>
            <tr>
              <th className="px-4 py-2">Dominio</th>
              <th className="px-4 py-2 w-1/3">URL</th>
              <th className="px-4 py-2">Source</th>
              <th className="px-4 py-2">Pubblicato</th>
              <th className="px-4 py-2">Dimensioni</th>
              <th className="px-4 py-2">Fetched</th>
              <th className="px-4 py-2">Peso</th>
              <th className="px-4 py-2">Video</th>
              <th className="px-4 py-2 text-right">Azione</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-300'}`}>
            {visibleData.map((item) => {
              const hasZeroWidth = item.image_width === 0;
              // Pre-calculate quality only if needed
              const quality = hasZeroWidth ? QualityClass.LOW : getQuality(item);
              const qualityColor = getQualityColor(quality, hasZeroWidth);
              
              // Border color based on quality and theme
              const borderColor = hasZeroWidth || quality === QualityClass.LOW
                ? isDark ? 'border-red-500/50' : 'border-red-400'
                : quality === QualityClass.MEDIUM
                ? isDark ? 'border-yellow-500/50' : 'border-yellow-400'
                : isDark ? 'border-green-500/50' : 'border-green-400';
              
              return (
              <tr key={item.id} className={`${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-100'} transition-colors border-l-4 ${borderColor}`}>
                <td className={`px-4 py-2 font-mono text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-800'} font-medium`}>
                  {item.domain}
                </td>
                <td className="px-4 py-2">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className={`block max-w-xs md:max-w-md truncate ${isDark ? 'text-slate-100 hover:text-indigo-300' : 'text-slate-900 hover:text-indigo-700'} transition-colors font-semibold`}
                    title={item.url}
                  >
                    {item.url}
                  </a>
                </td>
                <td className={`px-4 py-2 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                  {item.source}
                </td>
                <td className={`px-4 py-2 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                  {formatDateTime(item.published_at)}
                </td>
                <td className="px-4 py-2">
                  <span className={`font-mono text-[11px] px-2 py-0.5 rounded border inline-flex items-center gap-1 ${qualityColor}`}>
                    {hasZeroWidth && <AlertTriangle className="w-3 h-3" />}
                    {item.image_width}×{item.image_height}
                  </span>
                </td>
                <td className={`px-4 py-2 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                  {formatDateTime(item.fetched_at)}
                </td>
                <td className={`px-4 py-2 ${isDark ? 'text-slate-200' : 'text-slate-900'} font-semibold`}>
                  {item.image_weight} KB
                </td>
                <td className="px-4 py-2 text-center">
                  {item.has_video ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-300 text-[10px]">
                      Sì
                    </span>
                  ) : (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-700'} text-[10px]`}>
                      No
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className={`inline-flex items-center gap-1 ${isDark ? 'text-slate-400 hover:text-indigo-300' : 'text-slate-800 hover:text-indigo-700'} transition-colors`}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </td>
              </tr>
            );
            })}
            {sortedData.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-8 text-center"
                >
                  <div className="flex flex-col items-center gap-2">
                    <p className={`${isDark ? 'text-slate-300' : 'text-slate-800'} text-sm font-medium`}>🔍 Nessun articolo trovato</p>
                    <p className={`${isDark ? 'text-slate-400' : 'text-slate-700'} text-xs`}>Prova a modificare i filtri o selezionare un periodo diverso.</p>
                  </div>
                </td>
              </tr>
            )}
            {visibleData.length < sortedData.length && (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-4 text-center"
                >
                  <div className="flex flex-col items-center gap-1">
                    <p className={`${isDark ? 'text-slate-300' : 'text-slate-800'} text-xs font-semibold`}>⬇️ Scorri per caricare altre righe</p>
                    <p className={`${isDark ? 'text-slate-400' : 'text-slate-700'} text-[10px]`}>Visualizzate {visibleData.length} di {sortedData.length} articoli</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});

UrlTable.displayName = 'UrlTable';


