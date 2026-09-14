import React, { useState, useEffect } from 'react';
import { FilterState, QualityClass, Orientation, ContentType } from '../types';
import { X, Filter, RefreshCw, Calendar, ChevronLeft, ChevronDown, ChevronUp, Globe, Image, Video, Layout, FileText, Building2 } from 'lucide-react';
import { subDays, subMonths, startOfDay, format } from 'date-fns';
import { it } from 'date-fns/locale';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface Props {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  availableDomains: string[];
  availableSources: string[];
  isOpen: boolean;
  toggleSidebar: () => void;
  onRefreshData?: () => void;
  theme?: 'light' | 'dark';
}

interface FilterSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  isDark?: boolean;
}

const FilterSection: React.FC<FilterSectionProps> = ({ title, icon, children, defaultOpen = false, isDark = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-100 border-slate-300'} border rounded-lg overflow-hidden`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 flex items-center justify-between ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-200'} transition-colors`}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-700'}`} />
        ) : (
          <ChevronDown className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-700'}`} />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-2">
          {children}
        </div>
      )}
    </div>
  );
};

const CheckboxGroup: React.FC<{
  options: { value: string; label: string; color?: string }[];
  selected: string[];
  onChange: (value: string) => void;
  maxVisible?: number;
  isDark?: boolean;
}> = ({ options, selected, onChange, maxVisible = 10, isDark = true }) => {
  const [showAll, setShowAll] = useState(false);
  const visibleOptions = showAll ? options : options.slice(0, maxVisible);
  const hasMore = options.length > maxVisible;

  const getColorClass = (color?: string, isSelected?: boolean) => {
    if (!color) return '';
    if (color === 'red') {
      return isSelected 
        ? isDark ? 'border-red-500 bg-red-500/20 text-red-300' : 'border-red-500 bg-red-100 text-red-800'
        : isDark ? 'border-red-500/30 text-red-400/70' : 'border-red-300 text-red-700';
    }
    if (color === 'yellow') {
      return isSelected 
        ? isDark ? 'border-yellow-500 bg-yellow-500/20 text-yellow-300' : 'border-yellow-500 bg-yellow-100 text-yellow-800'
        : isDark ? 'border-yellow-500/30 text-yellow-400/70' : 'border-yellow-300 text-yellow-700';
    }
    if (color === 'green') {
      return isSelected 
        ? isDark ? 'border-green-500 bg-green-500/20 text-green-300' : 'border-green-500 bg-green-100 text-green-800'
        : isDark ? 'border-green-500/30 text-green-400/70' : 'border-green-300 text-green-700';
    }
    if (color === 'cyan') {
      return isSelected 
        ? isDark ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300' : 'border-cyan-500 bg-cyan-100 text-cyan-800'
        : isDark ? 'border-cyan-500/30 text-cyan-400/70' : 'border-cyan-300 text-cyan-700';
    }
    return '';
  };

  return (
    <div className="space-y-2">
      {visibleOptions.map(option => {
        const isSelected = selected.includes(option.value);
        const colorClass = getColorClass(option.color, isSelected);
        
        return (
          <label
            key={option.value}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${isDark ? 'hover:bg-slate-700/30' : 'hover:bg-slate-200'} ${
              isSelected
                ? colorClass || 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                : colorClass || (isDark ? 'border-slate-700 text-slate-300 hover:border-slate-600' : 'border-slate-400 text-slate-800 hover:border-slate-500')
            }`}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onChange(option.value)}
              className={`w-4 h-4 rounded ${isDark ? 'border-slate-600 bg-slate-900' : 'border-slate-400 bg-white'} text-indigo-600 focus:ring-indigo-500 focus:ring-1 cursor-pointer`}
            />
            <span className="text-xs flex-1">{option.label}</span>
          </label>
        );
      })}
      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className={`w-full text-xs ${isDark ? 'text-slate-400 hover:text-indigo-400' : 'text-slate-700 hover:text-indigo-700'} py-1 transition-colors`}
        >
          {showAll ? 'Mostra meno' : `Mostra altri ${options.length - maxVisible}...`}
        </button>
      )}
    </div>
  );
};

export const FilterPanel: React.FC<Props> = ({
  filters,
  setFilters,
  availableDomains,
  availableSources,
  toggleSidebar,
  onRefreshData,
  theme = 'dark'
}) => {
  const isDark = theme === 'dark';
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Sync date picker state when filters change
  useEffect(() => {
    const { start, end } = filters.dateRange;
    setStartDate(start ? new Date(start) : null);
    setEndDate(end ? new Date(end) : null);
  }, [filters.dateRange]);

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

  const applyDatePreset = (preset: 'today' | 'yesterday' | 'week' | 'month') => {
    const end = new Date();
    let start = new Date();
    
    if (preset === 'today') {
      start = startOfDay(end);
    } else if (preset === 'yesterday') {
      const yesterday = subDays(end, 1);
      start = startOfDay(yesterday);
      end.setTime(start.getTime());
      end.setHours(23, 59, 59, 999);
    } else if (preset === 'week') {
      start = startOfDay(subDays(end, 7));
    } else if (preset === 'month') {
      start = startOfDay(subMonths(end, 1));
    }

    setFilters(prev => ({
      ...prev,
      dateRange: {
        start: format(start, "yyyy-MM-dd'T'HH:mm:ss"),
        end: format(end, "yyyy-MM-dd'T'HH:mm:ss")
      }
    }));
  };

  const toggleFilter = (type: keyof FilterState, value: string) => {
    setFilters(prev => {
      const current = prev[type] as string[];
      if (Array.isArray(current)) {
        const newArray = current.includes(value)
          ? current.filter(item => item !== value)
          : [...current, value];
        return { ...prev, [type]: newArray };
      }
      return prev;
    });
  };

  const clearSection = (type: keyof FilterState) => {
    setFilters(prev => ({
      ...prev,
      [type]: Array.isArray(prev[type]) ? [] : (type === 'hasVideo' ? null : prev[type])
    }));
  };

  const getActiveCount = (type: keyof FilterState) => {
    const value = filters[type];
    if (type === 'hasVideo') return value !== null ? 1 : 0;
    if (Array.isArray(value)) return value.length;
    return 0;
  };

  return (
    <div className={`w-full ${isDark ? 'bg-slate-900' : 'bg-white'} h-full overflow-y-auto flex flex-col z-20`}>
      <div className={`p-4 border-b ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-300 bg-white'} flex items-center justify-between sticky top-0 z-10`}>
        <div>
          <h2 className={`text-lg font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'} flex items-center gap-2`}>
            <Filter className="w-5 h-5 text-indigo-400" />
            Filtri Avanzati
          </h2>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-700'} mt-0.5`}>Personalizza la visualizzazione</p>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => onRefreshData?.()} 
            className={`p-1.5 ${isDark ? 'text-slate-500 hover:text-indigo-400 hover:bg-slate-800' : 'text-slate-700 hover:text-indigo-700 hover:bg-slate-200'} rounded transition-colors`}
            title="Ricarica i dati (aggiorna cache)"
            aria-label="Ricarica"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button 
            onClick={toggleSidebar}
            className={`p-1.5 ${isDark ? 'text-slate-500 hover:text-white hover:bg-slate-800' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'} rounded transition-colors`}
            title="Chiudi filtri"
            aria-label="Chiudi"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        
        {/* Date Range */}
        <FilterSection 
          title="Periodo di Pubblicazione" 
          icon={<Calendar className="w-4 h-4 text-indigo-400" />}
          defaultOpen={false}
          isDark={isDark}
        >
          <div className="space-y-3">
            <div className="flex gap-1.5">
              <button 
                onClick={() => applyDatePreset('today')} 
                className={`flex-1 py-1.5 px-2 text-[11px] ${isDark ? 'bg-slate-900 hover:bg-indigo-600 border-slate-700 text-slate-300 hover:text-white' : 'bg-slate-50 hover:bg-indigo-600 border-slate-400 text-slate-800 hover:text-white'} border hover:border-indigo-500 rounded transition-all font-medium`}
              >
                Oggi
              </button>
              <button 
                onClick={() => applyDatePreset('yesterday')} 
                className={`flex-1 py-1.5 px-2 text-[11px] ${isDark ? 'bg-slate-900 hover:bg-indigo-600 border-slate-700 text-slate-300 hover:text-white' : 'bg-slate-50 hover:bg-indigo-600 border-slate-400 text-slate-800 hover:text-white'} border hover:border-indigo-500 rounded transition-all font-medium`}
              >
                Ieri
              </button>
              <button 
                onClick={() => applyDatePreset('week')} 
                className={`flex-1 py-1.5 px-2 text-[11px] ${isDark ? 'bg-slate-900 hover:bg-indigo-600 border-slate-700 text-slate-300 hover:text-white' : 'bg-slate-50 hover:bg-indigo-600 border-slate-400 text-slate-800 hover:text-white'} border hover:border-indigo-500 rounded transition-all font-medium`}
              >
                7gg
              </button>
              <button 
                onClick={() => applyDatePreset('month')} 
                className={`flex-1 py-1.5 px-2 text-[11px] ${isDark ? 'bg-slate-900 hover:bg-indigo-600 border-slate-700 text-slate-300 hover:text-white' : 'bg-slate-50 hover:bg-indigo-600 border-slate-400 text-slate-800 hover:text-white'} border hover:border-indigo-500 rounded transition-all font-medium`}
              >
                30gg
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <div className="relative">
                <label className={`block text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'} mb-1 font-medium`}>Data inizio</label>
                <DatePicker
                  selected={startDate}
                  onChange={handleStartDateChange}
                  selectsStart
                  startDate={startDate}
                  endDate={endDate}
                  dateFormat="dd/MM/yyyy"
                  locale={it}
                  placeholderText="Seleziona data inizio"
                  className={`w-full ${isDark ? 'bg-slate-900 border-slate-700 text-slate-300 placeholder:text-slate-600' : 'bg-white border-slate-400 text-slate-900 placeholder:text-slate-500'} border rounded px-3 py-2 text-xs focus:outline-none focus:border-indigo-500`}
                  calendarClassName={isDark ? "dark-calendar" : ""}
                  wrapperClassName="w-full"
                  maxDate={endDate || new Date()}
                />
              </div>
              <div className="relative">
                <label className={`block text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'} mb-1 font-medium`}>Data fine</label>
                <DatePicker
                  selected={endDate}
                  onChange={handleEndDateChange}
                  selectsEnd
                  startDate={startDate}
                  endDate={endDate}
                  minDate={startDate}
                  dateFormat="dd/MM/yyyy"
                  locale={it}
                  placeholderText="Seleziona data fine"
                  className={`w-full ${isDark ? 'bg-slate-900 border-slate-700 text-slate-300 placeholder:text-slate-600' : 'bg-white border-slate-400 text-slate-900 placeholder:text-slate-500'} border rounded px-3 py-2 text-xs focus:outline-none focus:border-indigo-500`}
                  calendarClassName={isDark ? "dark-calendar" : ""}
                  wrapperClassName="w-full"
                  maxDate={new Date()}
                />
              </div>
            </div>
          </div>
        </FilterSection>

        {/* Domains */}
        <FilterSection 
          title={`Domini ${getActiveCount('selectedDomains') > 0 ? `(${getActiveCount('selectedDomains')})` : ''}`}
          icon={<Globe className="w-4 h-4 text-blue-400" />}
          isDark={isDark}
        >
          <div className="space-y-2">
            {getActiveCount('selectedDomains') > 0 && (
              <button
                onClick={() => clearSection('selectedDomains')}
                className={`text-xs ${isDark ? 'text-slate-300 hover:text-blue-300' : 'text-slate-800 hover:text-blue-700'} transition-colors flex items-center gap-1 font-medium`}
              >
                <X className="w-3 h-3" />
                Rimuovi tutti
              </button>
            )}
            <CheckboxGroup
              options={availableDomains.map(d => ({ value: d, label: d }))}
              selected={filters.selectedDomains}
              onChange={(value) => toggleFilter('selectedDomains', value)}
              maxVisible={8}
              isDark={isDark}
            />
          </div>
        </FilterSection>

        {/* Quality */}
        <FilterSection 
          title={`Qualità Immagine ${getActiveCount('qualities') > 0 ? `(${getActiveCount('qualities')})` : ''}`}
          icon={<Image className="w-4 h-4 text-purple-400" />}
          isDark={isDark}
        >
          <div className="space-y-2">
            {getActiveCount('qualities') > 0 && (
              <button
                onClick={() => clearSection('qualities')}
                className={`text-xs ${isDark ? 'text-slate-400 hover:text-purple-400' : 'text-slate-700 hover:text-purple-700'} transition-colors flex items-center gap-1`}
              >
                <X className="w-3 h-3" />
                Rimuovi tutti
              </button>
            )}
            <CheckboxGroup
              options={[
                { value: QualityClass.LOW, label: 'Bassa (≤799px)', color: 'red' },
                { value: QualityClass.MEDIUM, label: 'Media (800-1199px)', color: 'yellow' },
                { value: QualityClass.HIGH, label: 'Alta (1200-1999px)', color: 'green' },
                { value: QualityClass.VERY_HIGH, label: 'Altissima (≥2000px)', color: 'cyan' },
                { value: QualityClass.NO_IMAGE, label: 'Senza Immagine' },
              ]}
              selected={filters.qualities}
              onChange={(value) => toggleFilter('qualities', value)}
              isDark={isDark}
            />
          </div>
        </FilterSection>

        {/* Sources */}
        <FilterSection 
          title={`Redazione ${getActiveCount('sources') > 0 ? `(${getActiveCount('sources')})` : ''}`}
          icon={<Building2 className="w-4 h-4 text-green-400" />}
          isDark={isDark}
        >
          <div className="space-y-2">
            {getActiveCount('sources') > 0 && (
              <button
                onClick={() => clearSection('sources')}
                className={`text-xs ${isDark ? 'text-slate-400 hover:text-green-400' : 'text-slate-700 hover:text-green-700'} transition-colors flex items-center gap-1`}
              >
                <X className="w-3 h-3" />
                Rimuovi tutti
              </button>
            )}
            <CheckboxGroup
              options={availableSources.map(s => ({ value: s, label: s }))}
              selected={filters.sources}
              onChange={(value) => toggleFilter('sources', value)}
              maxVisible={8}
              isDark={isDark}
            />
          </div>
        </FilterSection>

        {/* Video */}
        <FilterSection 
          title="Presenza Video"
          icon={<Video className="w-4 h-4 text-emerald-400" />}
          isDark={isDark}
        >
          <div className="space-y-2">
            <select 
              value={filters.hasVideo === null ? 'all' : filters.hasVideo ? 'yes' : 'no'}
              onChange={(e) => {
                const val = e.target.value;
                setFilters(prev => ({
                  ...prev,
                  hasVideo: val === 'all' ? null : val === 'yes' ? true : false
                }));
              }}
              className={`w-full ${isDark ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-400 text-slate-900'} border rounded px-3 py-2 text-xs focus:outline-none focus:border-indigo-500`}
            >
              <option value="all">Tutti gli articoli</option>
              <option value="yes">Solo con video</option>
              <option value="no">Senza video</option>
            </select>
          </div>
        </FilterSection>

        {/* Orientation */}
        <FilterSection 
          title={`Orientamento ${getActiveCount('orientations') > 0 ? `(${getActiveCount('orientations')})` : ''}`}
          icon={<Layout className="w-4 h-4 text-amber-400" />}
          isDark={isDark}
        >
          <div className="space-y-2">
            {getActiveCount('orientations') > 0 && (
              <button
                onClick={() => clearSection('orientations')}
                className={`text-xs ${isDark ? 'text-slate-400 hover:text-amber-400' : 'text-slate-700 hover:text-amber-700'} transition-colors flex items-center gap-1`}
              >
                <X className="w-3 h-3" />
                Rimuovi tutti
              </button>
            )}
            <CheckboxGroup
              options={Object.values(Orientation).map(o => ({ value: o, label: o }))}
              selected={filters.orientations}
              onChange={(value) => toggleFilter('orientations', value)}
              isDark={isDark}
            />
          </div>
        </FilterSection>

        {/* Content Type */}
        <FilterSection 
          title={`Tipologia Contenuto ${getActiveCount('types') > 0 ? `(${getActiveCount('types')})` : ''}`}
          icon={<FileText className="w-4 h-4 text-rose-400" />}
          isDark={isDark}
        >
          <div className="space-y-2">
            {getActiveCount('types') > 0 && (
              <button
                onClick={() => clearSection('types')}
                className={`text-xs ${isDark ? 'text-slate-400 hover:text-rose-400' : 'text-slate-700 hover:text-rose-700'} transition-colors flex items-center gap-1`}
              >
                <X className="w-3 h-3" />
                Rimuovi tutti
              </button>
            )}
            <CheckboxGroup
              options={Object.values(ContentType).map(t => ({ value: t, label: t }))}
              selected={filters.types}
              onChange={(value) => toggleFilter('types', value)}
              isDark={isDark}
            />
          </div>
        </FilterSection>

      </div>
    </div>
  );
};
