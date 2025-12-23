import React, { useMemo, useState, useEffect, UIEvent } from 'react';
import { DataItem } from '../types';
import { ExternalLink, ArrowLeft } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface Props {
  data: DataItem[];
  totalDayCount?: number;
  onBack?: () => void;
}

export const UrlTable: React.FC<Props> = ({ data, totalDayCount, onBack }) => {
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

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const threshold = 100; // px dal fondo

    if (target.scrollTop + target.clientHeight >= target.scrollHeight - threshold) {
      setVisibleCount((prev) =>
        prev < sortedData.length ? Math.min(prev + 200, sortedData.length) : prev
      );
    }
  };

  const formatDateTime = (iso: string) => {
    try {
      const d = parseISO(iso);
      return format(d, 'dd/MM/yyyy HH:mm');
    } catch {
      return iso;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="mr-2 p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h3 className="text-slate-200 font-bold text-lg">
              Tabella completa URL
            </h3>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-900/30 border border-indigo-500/30 rounded-md">
                <span className="text-slate-300 text-xs">Filtrate:</span>
                <span className="text-indigo-400 font-bold text-sm">{sortedData.length}</span>
              </div>
              {totalDayCount !== undefined && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 border border-slate-700 rounded-md">
                  <span className="text-slate-400 text-xs">Totali (solo data):</span>
                  <span className="text-slate-200 font-bold text-sm">{totalDayCount}</span>
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
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950/60 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
            <tr>
              <th className="px-4 py-2">Dominio</th>
              <th className="px-4 py-2 w-1/3">URL</th>
              <th className="px-4 py-2">Source</th>
              <th className="px-4 py-2">Pubblicato</th>
              <th className="px-4 py-2">Fetched</th>
              <th className="px-4 py-2">Img (px)</th>
              <th className="px-4 py-2">Peso</th>
              <th className="px-4 py-2">Video</th>
              <th className="px-4 py-2 text-right">Azione</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {visibleData.map((item) => (
              <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                <td className="px-4 py-2 font-mono text-[11px] text-slate-400">
                  {item.domain}
                </td>
                <td className="px-4 py-2">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block max-w-xs md:max-w-md truncate text-slate-200 hover:text-indigo-400 transition-colors"
                    title={item.url}
                  >
                    {item.url}
                  </a>
                </td>
                <td className="px-4 py-2 text-slate-400">
                  {item.source}
                </td>
                <td className="px-4 py-2 text-slate-400">
                  {formatDateTime(item.published_at)}
                </td>
                <td className="px-4 py-2 text-slate-400">
                  {formatDateTime(item.fetched_at)}
                </td>
                <td className="px-4 py-2 font-mono text-[11px]">
                  {item.image_width}×{item.image_height}
                </td>
                <td className="px-4 py-2 text-rose-400 font-semibold">
                  {item.image_weight} KB
                </td>
                <td className="px-4 py-2 text-center">
                  {item.has_video ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-300 text-[10px]">
                      Sì
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px]">
                      No
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-slate-500 hover:text-indigo-400 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </td>
              </tr>
            ))}
            {sortedData.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-8 text-center text-slate-600"
                >
                  Nessun dato disponibile
                </td>
              </tr>
            )}
            {visibleData.length < sortedData.length && (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-4 text-center text-slate-500 text-[11px]"
                >
                  Scorri per caricare altre righe ({visibleData.length}/{sortedData.length})
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


