import React, { useState, useEffect } from 'react';
import { FilterState, QualityClass, Orientation, ContentType } from '../types';
import { X, Filter, RefreshCw, Calendar, ChevronLeft } from 'lucide-react';
import { subDays, subMonths, startOfDay, format, parse, isValid } from 'date-fns';
import { it } from 'date-fns/locale';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface Props {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  availableDomains: string[];
  availableSources: string[];
  availableExtensions: string[];
  isOpen: boolean;
  toggleSidebar: () => void;
}

export const FilterPanel: React.FC<Props> = ({
  filters,
  setFilters,
  availableDomains,
  availableSources,
  availableExtensions,
  toggleSidebar
}) => {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Sync date picker state when filters change
  useEffect(() => {
    const { start, end } = filters.dateRange;
    setStartDate(start ? new Date(start) : null);
    setEndDate(end ? new Date(end) : null);
  }, [filters.dateRange]);

  const toggleSelection = <T extends string>(
    current: T[],
    val: T,
    setter: (list: T[]) => void
  ) => {
    if (current.includes(val)) {
      setter(current.filter(item => item !== val));
    } else {
      setter([...current, val]);
    }
  };

  const handleStartDateChange = (date: Date | null) => {
    setStartDate(date);
    if (date) {
      const iso = format(date, "yyyy-MM-dd'T'00:00:00");
      setFilters(prev => ({
        ...prev,
        dateRange: { ...prev.dateRange, start: iso }
      }));
    }
  };

  const handleEndDateChange = (date: Date | null) => {
    setEndDate(date);
    if (date) {
      const iso = format(date, "yyyy-MM-dd'T'23:59:59");
      setFilters(prev => ({
        ...prev,
        dateRange: { ...prev.dateRange, end: iso }
      }));
    }
  };

  const applyDatePreset = (preset: 'today' | 'week' | 'month') => {
    const end = new Date();
    let start = new Date();
    
    if (preset === 'today') start = startOfDay(new Date());
    if (preset === 'week') start = subDays(new Date(), 7);
    if (preset === 'month') start = subMonths(new Date(), 1);

    setFilters(prev => ({
      ...prev,
      dateRange: {
        start: format(start, "yyyy-MM-dd'T'HH:mm:ss"),
        end: format(end, "yyyy-MM-dd'T'HH:mm:ss")
      }
    }));
  };

  return (
    <div className="w-full bg-slate-900 h-full overflow-y-auto flex flex-col z-20">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Filter className="w-5 h-5 text-indigo-400" />
          Filtri
        </h2>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => window.location.reload()} 
            className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-slate-800 rounded transition-colors"
            title="Reset & Reload Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button 
            onClick={toggleSidebar}
            className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        
        {/* Published At Date Range */}
        <div className="space-y-3 p-3 bg-slate-800/50 rounded-lg border border-slate-800">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
            <Calendar className="w-3 h-3" />
            Intervallo (Pubblicazione)
          </label>
          
          <div className="flex gap-1 mb-2">
            <button onClick={() => applyDatePreset('today')} className="flex-1 py-1 px-2 text-[10px] bg-slate-800 hover:bg-indigo-600 border border-slate-700 hover:border-indigo-500 rounded text-slate-300 hover:text-white transition-colors">Oggi</button>
            <button onClick={() => applyDatePreset('week')} className="flex-1 py-1 px-2 text-[10px] bg-slate-800 hover:bg-indigo-600 border border-slate-700 hover:border-indigo-500 rounded text-slate-300 hover:text-white transition-colors">7gg</button>
            <button onClick={() => applyDatePreset('month')} className="flex-1 py-1 px-2 text-[10px] bg-slate-800 hover:bg-indigo-600 border border-slate-700 hover:border-indigo-500 rounded text-slate-300 hover:text-white transition-colors">30gg</button>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <div className="relative">
              <DatePicker
                selected={startDate}
                onChange={handleStartDateChange}
                selectsStart
                startDate={startDate}
                endDate={endDate}
                dateFormat="dd/MM/yyyy"
                locale={it}
                placeholderText="Data inizio"
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
                calendarClassName="dark-calendar"
                wrapperClassName="w-full"
                maxDate={endDate || new Date()}
              />
            </div>
            <div className="relative">
              <DatePicker
                selected={endDate}
                onChange={handleEndDateChange}
                selectsEnd
                startDate={startDate}
                endDate={endDate}
                minDate={startDate}
                dateFormat="dd/MM/yyyy"
                locale={it}
                placeholderText="Data fine"
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
                calendarClassName="dark-calendar"
                wrapperClassName="w-full"
                maxDate={new Date()}
              />
            </div>
          </div>
        </div>

        {/* Quality */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Qualità Immagine</label>
          <div className="flex flex-col gap-1.5">
            {Object.values(QualityClass).map(q => (
               <label key={q} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer group hover:text-white transition-colors">
               <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                 filters.qualities.includes(q) ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600 group-hover:border-slate-500'
               }`}>
                 {filters.qualities.includes(q) && <div className="w-1.5 h-1.5 bg-white rounded-[1px]" />}
               </div>
               <input 
                 type="checkbox" 
                 className="hidden"
                 checked={filters.qualities.includes(q)}
                 onChange={() => toggleSelection(filters.qualities, q, (l) => setFilters(prev => ({...prev, qualities: l})))}
               />
               <span className="text-xs">{q}</span>
             </label>
            ))}
          </div>
        </div>

        {/* Extensions */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Estensione</label>
          <div className="flex flex-wrap gap-1.5">
            {availableExtensions.map(ext => (
               <button
               key={ext}
               onClick={() => toggleSelection(filters.extensions, ext, (l) => setFilters(prev => ({...prev, extensions: l})))}
               className={`px-2 py-1 text-[10px] font-mono uppercase rounded border transition-all ${
                 filters.extensions.includes(ext)
                   ? 'bg-sky-600 border-sky-500 text-white'
                   : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
               }`}
             >
               {ext}
             </button>
            ))}
          </div>
        </div>

        {/* Has Video */}
         <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Video Presente</label>
          <div className="flex bg-slate-800 p-0.5 rounded border border-slate-700">
             <button 
              onClick={() => setFilters(p => ({...p, hasVideo: null}))}
              className={`flex-1 py-1 text-xs rounded-sm transition-colors ${filters.hasVideo === null ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
             >Tutti</button>
             <button 
              onClick={() => setFilters(p => ({...p, hasVideo: true}))}
              className={`flex-1 py-1 text-xs rounded-sm transition-colors ${filters.hasVideo === true ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
             >Sì</button>
             <button 
              onClick={() => setFilters(p => ({...p, hasVideo: false}))}
              className={`flex-1 py-1 text-xs rounded-sm transition-colors ${filters.hasVideo === false ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
             >No</button>
          </div>
        </div>

        {/* Orientation */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Orientamento</label>
          <div className="flex flex-col gap-1.5">
             {Object.values(Orientation).map(o => (
                <label key={o} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer group hover:text-white">
                   <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors ${
                    filters.orientations.includes(o) ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600 group-hover:border-slate-500'
                  }`}>
                    {filters.orientations.includes(o) && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                  <input 
                    type="checkbox" 
                    className="hidden"
                    checked={filters.orientations.includes(o)}
                    onChange={() => toggleSelection(filters.orientations, o, (l) => setFilters(prev => ({...prev, orientations: l})))}
                  />
                  {o}
                </label>
             ))}
          </div>
        </div>

        {/* Type */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tipologia Contenuto</label>
          <div className="flex flex-wrap gap-1.5">
            {Object.values(ContentType).map(t => (
               <button
               key={t}
               onClick={() => toggleSelection(filters.types, t, (l) => setFilters(prev => ({...prev, types: l})))}
               className={`px-2 py-1 text-[10px] rounded border transition-all ${
                 filters.types.includes(t)
                   ? 'bg-purple-600 border-purple-500 text-white'
                   : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
               }`}
             >
               {t}
             </button>
            ))}
          </div>
        </div>

         {/* Domains */}
         <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Domini</label>
          <div className="flex flex-wrap gap-1.5">
            {availableDomains.map(d => (
              <button
                key={d}
                onClick={() => toggleSelection(filters.selectedDomains, d, (l) => setFilters(prev => ({...prev, selectedDomains: l})))}
                className={`px-2 py-1 text-[10px] rounded-full border transition-all ${
                  filters.selectedDomains.includes(d)
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/50'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Source */}
        <div className="space-y-2 pb-6">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Redazione</label>
          <select 
            multiple
            value={filters.sources}
            onChange={(e) => {
              const options = Array.from(e.target.selectedOptions, option => option.value);
              setFilters(prev => ({...prev, sources: options}));
            }}
            className="w-full h-24 bg-slate-800 border border-slate-700 rounded p-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 scrollbar-thin"
          >
            {availableSources.map(s => (
              <option key={s} value={s} className="py-1 px-1">{s}</option>
            ))}
          </select>
          <p className="text-[9px] text-slate-600">Cmd/Ctrl + Click per selezione multipla</p>
        </div>

      </div>
    </div>
  );
};