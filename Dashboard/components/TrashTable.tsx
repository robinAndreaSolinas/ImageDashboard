import React from 'react';
import { DataItem } from '../types';
import { AlertTriangle, ExternalLink } from 'lucide-react';

interface Props {
  data: DataItem[];
}

export const TrashTable: React.FC<Props> = ({ data }) => {
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
            {data.map((item: any) => (
              <tr key={item.id} className="hover:bg-slate-800/30 transition-colors group">
                <td className="px-6 py-4 text-slate-300">
                   <a href={item.url} target="_blank" rel="noreferrer" className="block w-64 md:w-96 truncate hover:text-indigo-400 transition-colors" title={item.url}>
                     {item.url}
                   </a>
                </td>
                <td className="px-6 py-4 text-slate-400">
                  {item.source || '-'}
                </td>
                <td className={`px-6 py-4 font-mono ${item.image_width < 1100 ? 'text-red-500 font-bold' : ''}`}>
                  {item.image_width} x {item.image_height}
                  {item.image_width < 1100 && <span className="ml-2 text-xs opacity-75">⚠️</span>}
                </td>
                <td className="px-6 py-4 text-rose-400 font-medium">{item.image_weight} KB</td>
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
            ))}
            {data.length === 0 && (
                <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-600">Nessun dato critico trovato</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};