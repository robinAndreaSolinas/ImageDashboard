import React from 'react';
import { DataItem, QualityClass } from '../types';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { getQuality } from '../utils/analytics';

interface Props {
  data: DataItem[];
  theme?: 'light' | 'dark';
}

export const TrashTable: React.FC<Props> = React.memo(({ data, theme = 'dark' }) => {
  const isDark = theme === 'dark';
  
  // Quality color mapping based on theme
  const getQualityColor = (q: QualityClass, hasZeroWidth: boolean) => {
    if (hasZeroWidth || q === QualityClass.LOW) {
      return isDark 
        ? 'bg-red-500/20 border-red-500/50 text-red-300' 
        : 'bg-red-100 border-red-400 text-red-800';
    }
    if (q === QualityClass.MEDIUM) {
      return isDark 
        ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300' 
        : 'bg-yellow-100 border-yellow-400 text-yellow-800';
    }
    return isDark 
      ? 'bg-green-500/20 border-green-500/50 text-green-300' 
      : 'bg-green-100 border-green-400 text-green-800';
  };
  
  return (
    <div className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300'} border rounded-xl overflow-hidden shadow-lg mb-8`}>
      <div className={`p-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-300'} flex items-center gap-2`}>
        <AlertTriangle className="text-amber-500 w-5 h-5" />
        <h3 className={`${isDark ? 'text-slate-200' : 'text-slate-900'} font-bold text-lg`}>Top 10 Trash Images</h3>
        <span className={`${isDark ? 'text-slate-500' : 'text-slate-700'} text-sm ml-2 font-normal hidden sm:inline`}>(Alta compressione / Bassa risoluzione / Anomalie)</span>
      </div>
      <div className="overflow-x-auto">
        <table className={`w-full text-left text-sm ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
          <thead className={`${isDark ? 'bg-slate-950/80 text-slate-300' : 'bg-slate-200 text-slate-800'} uppercase text-xs font-bold tracking-wider`}>
            <tr>
              <th className="px-6 py-3 w-1/3">URL</th>
              <th className="px-6 py-3">Redazione</th>
              <th className="px-6 py-3">Dimensioni</th>
              <th className="px-6 py-3">Peso</th>
              <th className="px-6 py-3 text-center">Preview</th>
              <th className="px-6 py-3 text-right">Azione</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-300'}`}>
            {data.map((item: any) => {
              const quality = getQuality(item);
              const hasZeroWidth = item.image_width === 0;
              
              // Border color based on quality and theme
              const borderColor = hasZeroWidth || quality === QualityClass.LOW
                ? isDark ? 'border-red-500/50' : 'border-red-400'
                : quality === QualityClass.MEDIUM
                ? isDark ? 'border-yellow-500/50' : 'border-yellow-400'
                : isDark ? 'border-green-500/50' : 'border-green-400';
              
              return (
              <tr key={item.id} className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-100'} transition-colors group border-l-4 ${borderColor}`}>
                <td className={`px-6 py-4 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                   <a href={item.url} target="_blank" rel="noreferrer" className={`block w-64 md:w-96 truncate hover:text-indigo-300 transition-colors font-medium ${isDark ? 'text-slate-100' : 'text-slate-900'}`} title={item.url}>
                     {item.url}
                   </a>
                </td>
                <td className={`px-6 py-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {item.source || '-'}
                </td>
                <td className={`px-6 py-4 font-mono ${getQualityColor(quality, hasZeroWidth)} px-2 py-1 rounded text-xs font-semibold inline-flex items-center gap-1.5`}>
                  {hasZeroWidth && <AlertTriangle className="w-3 h-3" />}
                  {item.image_width} x {item.image_height}
                </td>
                <td className={`px-6 py-4 ${isDark ? 'text-slate-200' : 'text-slate-900'} font-semibold`}>{item.image_weight} KB</td>
                <td className="px-6 py-4 text-center">
                  <a href={item.image_url} target="_blank" rel="noreferrer" className={`block w-16 h-10 ${isDark ? 'bg-slate-800' : 'bg-slate-200'} rounded mx-auto overflow-hidden relative cursor-pointer border border-transparent hover:border-indigo-500 transition-all`}>
                    <img src={item.image_url} alt="trash" className="w-full h-full object-cover" />
                  </a>
                </td>
                <td className="px-6 py-4 text-right">
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
            {data.length === 0 && (
                <tr>
                    <td colSpan={6} className="px-6 py-8 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <p className={`${isDark ? 'text-slate-400' : 'text-slate-700'} text-sm`}>✅ Nessun dato critico trovato</p>
                        <p className={`${isDark ? 'text-slate-500' : 'text-slate-700'} text-xs`}>Tutte le immagini rispettano i parametri di qualità nel periodo selezionato.</p>
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

TrashTable.displayName = 'TrashTable';