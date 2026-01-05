import React from 'react';
import { DataItem, QualityClass } from '../types';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { getQuality } from '../utils/analytics';

interface Props {
  data: DataItem[];
}

export const TrashTable: React.FC<Props> = React.memo(({ data }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg mb-8">
      <div className="p-4 border-b border-slate-800 flex items-center gap-2">
        <AlertTriangle className="text-amber-500 w-5 h-5" />
        <h3 className="text-slate-200 font-bold text-lg">Top 10 Trash Images</h3>
        <span className="text-slate-500 text-sm ml-2 font-normal hidden sm:inline">(Alta compressione / Bassa risoluzione / Anomalie)</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-400">
          <thead className="bg-slate-950/50 text-slate-500 uppercase text-xs font-bold tracking-wider">
            <tr>
              <th className="px-6 py-3 w-1/3">URL</th>
              <th className="px-6 py-3">Redazione</th>
              <th className="px-6 py-3">Dimensioni</th>
              <th className="px-6 py-3">Peso</th>
              <th className="px-6 py-3 text-center">Preview</th>
              <th className="px-6 py-3 text-right">Azione</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {data.map((item: any) => {
              const quality = getQuality(item);
              const hasZeroWidth = item.image_width === 0;
              const getQualityColor = (q: QualityClass) => {
                if (q === QualityClass.LOW) return 'bg-red-500/20 border-red-500/50 text-red-300';
                if (q === QualityClass.MEDIUM) return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300';
                return 'bg-green-500/20 border-green-500/50 text-green-300';
              };
              
              return (
              <tr key={item.id} className={`hover:bg-slate-800/30 transition-colors group border-l-4 ${quality === QualityClass.LOW ? 'border-red-500/50' : quality === QualityClass.MEDIUM ? 'border-yellow-500/50' : 'border-green-500/50'}`}>
                <td className="px-6 py-4 text-slate-300">
                   <a href={item.url} target="_blank" rel="noreferrer" className="block w-64 md:w-96 truncate hover:text-indigo-400 transition-colors" title={item.url}>
                     {item.url}
                   </a>
                </td>
                <td className="px-6 py-4 text-slate-400">
                  {item.source || '-'}
                </td>
                <td className={`px-6 py-4 font-mono ${hasZeroWidth ? 'bg-red-500/20 border-red-500/50 text-red-300' : getQualityColor(quality)} px-2 py-1 rounded text-xs font-semibold inline-flex items-center gap-1.5`}>
                  {hasZeroWidth && <AlertTriangle className="w-3 h-3" />}
                  {item.image_width} x {item.image_height}
                </td>
                <td className="px-6 py-4 text-slate-300 font-medium">{item.image_weight} KB</td>
                <td className="px-6 py-4 text-center">
                  <a href={item.image_url} target="_blank" rel="noreferrer" className="block w-16 h-10 bg-slate-800 rounded mx-auto overflow-hidden relative cursor-pointer border border-transparent hover:border-indigo-500 transition-all">
                    <img src={item.image_url} alt="trash" className="w-full h-full object-cover" />
                  </a>
                </td>
                <td className="px-6 py-4 text-right">
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
            );
            })}
            {data.length === 0 && (
                <tr>
                    <td colSpan={6} className="px-6 py-8 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <p className="text-slate-400 text-sm">✅ Nessun dato critico trovato</p>
                        <p className="text-slate-500 text-xs">Tutte le immagini rispettano i parametri di qualità nel periodo selezionato.</p>
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