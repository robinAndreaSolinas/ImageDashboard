import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { fetchDataFromAPI } from './services/dataService';
import { DataItem, FilterState, QualityClass, Orientation, ContentType } from './types';
import { FilterPanel } from './components/FilterPanel';
import { DashboardCharts } from './components/DashboardCharts';
import { TrashTable } from './components/TrashTable';
import { UrlTable } from './components/UrlTable';
import { ActiveFilters } from './components/ActiveFilters';
import { QuickFilters } from './components/QuickFilters';
import { getQuality, getOrientation, getType, getTopTrash } from './utils/analytics';
import { LayoutDashboard, Menu, Info, BarChart3, Table2, Calendar, ChevronDown } from 'lucide-react';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';

const App: React.FC = () => {
  const [rawData, setRawData] = useState<DataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [view, setView] = useState<'dashboard' | 'urls'>('dashboard');

  // Initialize filters
  const [filters, setFilters] = useState<FilterState>({
    dateRange: { start: '', end: '' },
    selectedDomains: [],
    qualities: [],
    extensions: [],
    hasVideo: null,
    sources: [],
    orientations: [],
    types: []
  });

  // Load Initial Data
  useEffect(() => {
    // Determine initial view from path
    if (typeof window !== 'undefined') {
      if (window.location.pathname.startsWith('/urls')) {
        setView('urls');
      }
    }

    const loadData = async (forceRefresh: boolean = false) => {
      try {
        const data = await fetchDataFromAPI(forceRefresh);
        setRawData(data);
        
        // Set default date range to yesterday (only if not already set)
        if (!filters.dateRange.start || !filters.dateRange.end) {
          const yesterday = subDays(new Date(), 1);
          const startOfYesterday = startOfDay(yesterday);
          const endOfYesterday = endOfDay(yesterday);
          
          setFilters(prev => ({
            ...prev,
            dateRange: { 
              start: format(startOfYesterday, "yyyy-MM-dd'T'HH:mm:ss"), 
              end: format(endOfYesterday, "yyyy-MM-dd'T'HH:mm:ss")
            }
          }));
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Sync filters with URL on initial load
  useEffect(() => {
    if (typeof window === 'undefined' || rawData.length > 0) return;
    
    const params = new URLSearchParams(window.location.search);
    const urlFilters: Partial<FilterState> = {};
    
    // Date range
    if (params.get('start') && params.get('end')) {
      urlFilters.dateRange = {
        start: params.get('start')!,
        end: params.get('end')!
      };
    }
    
    // Arrays
    const arrayFilters: (keyof FilterState)[] = ['selectedDomains', 'qualities', 'sources', 'orientations', 'types'];
    arrayFilters.forEach(key => {
      const values = params.getAll(key);
      if (values.length > 0) {
        (urlFilters as any)[key] = values;
      }
    });
    
    // Has video
    const hasVideoParam = params.get('hasVideo');
    if (hasVideoParam !== null) {
      urlFilters.hasVideo = hasVideoParam === 'true' ? true : hasVideoParam === 'false' ? false : null;
    }
    
    // Apply URL filters only on initial load
    if (Object.keys(urlFilters).length > 0) {
      setFilters(prev => ({ ...prev, ...urlFilters }));
    }
  }, [rawData.length]);

  // Update URL when filters change (debounced)
  useEffect(() => {
    if (typeof window === 'undefined' || rawData.length === 0) return;
    
    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams();
      
      // Date range
      if (filters.dateRange.start && filters.dateRange.end) {
        params.set('start', filters.dateRange.start);
        params.set('end', filters.dateRange.end);
      }
      
      // Arrays
      const arrayFilters: (keyof FilterState)[] = ['selectedDomains', 'qualities', 'sources', 'orientations', 'types'];
      arrayFilters.forEach(key => {
        const values = filters[key] as string[];
        values.forEach(v => params.append(key, v));
      });
      
      // Has video
      if (filters.hasVideo !== null) {
        params.set('hasVideo', filters.hasVideo.toString());
      }
      
      const queryString = params.toString();
      const newUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }, 300); // Debounce 300ms
    
    return () => clearTimeout(timeoutId);
  }, [filters, rawData.length]);

  const navigate = (target: 'dashboard' | 'urls') => {
    setView(target);
    if (typeof window !== 'undefined') {
      const path = target === 'dashboard' ? '/' : '/urls';
      const params = new URLSearchParams(window.location.search);
      const queryString = params.toString();
      const newUrl = queryString ? `${path}?${queryString}` : path;
      window.history.pushState({}, '', newUrl);
    }
  };

  // Filter Logic - Only by published date (for total count)
  const dataFilteredByDateOnly = useMemo(() => {
    if (!filters.dateRange.start || !filters.dateRange.end) return rawData;
    return rawData.filter(item => {
      const itemDate = new Date(item.published_at).getTime();
      const startDate = new Date(filters.dateRange.start).getTime();
      const endDate = new Date(filters.dateRange.end).getTime();
      return itemDate >= startDate && itemDate <= endDate;
    });
  }, [rawData, filters.dateRange]);

  // Pre-calculate date boundaries once
  const dateBoundaries = useMemo(() => {
    if (!filters.dateRange.start || !filters.dateRange.end) return null;
    return {
      start: new Date(filters.dateRange.start).getTime(),
      end: new Date(filters.dateRange.end).getTime()
    };
  }, [filters.dateRange.start, filters.dateRange.end]);

  // Pre-calculate filter sets for faster lookups
  const filterSets = useMemo(() => ({
    domains: new Set(filters.selectedDomains),
    qualities: new Set(filters.qualities),
    sources: new Set(filters.sources),
    orientations: new Set(filters.orientations),
    types: new Set(filters.types)
  }), [filters.selectedDomains, filters.qualities, filters.sources, filters.orientations, filters.types]);

  // Filter Logic - All filters applied (optimized)
  const filteredData = useMemo(() => {
    if (!dateBoundaries) return rawData;
    
    const { start: startDate, end: endDate } = dateBoundaries;
    const hasDomainFilter = filterSets.domains.size > 0;
    const hasQualityFilter = filterSets.qualities.size > 0;
    const hasSourceFilter = filterSets.sources.size > 0;
    const hasOrientationFilter = filterSets.orientations.size > 0;
    const hasTypeFilter = filterSets.types.size > 0;
    
    return rawData.filter(item => {
      // Fast date check
      const itemDate = new Date(item.published_at).getTime();
      if (itemDate < startDate || itemDate > endDate) return false;
      
      // Fast set lookups
      if (hasDomainFilter && !filterSets.domains.has(item.domain)) return false;
      if (hasSourceFilter && !filterSets.sources.has(item.source)) return false;
      if (filters.hasVideo !== null && item.has_video !== filters.hasVideo) return false;
      
      // Slower checks (only if needed)
      if (hasQualityFilter && !filterSets.qualities.has(getQuality(item))) return false;
      if (hasOrientationFilter && !filterSets.orientations.has(getOrientation(item))) return false;
      if (hasTypeFilter && !filterSets.types.has(getType(item.url))) return false;

      return true;
    });
  }, [rawData, dateBoundaries, filterSets, filters.hasVideo]);

  // Derived lists for Filter UI
  const availableDomains = useMemo(() => Array.from(new Set(rawData.map(d => d.domain))), [rawData]);
  const availableSources = useMemo(() => Array.from(new Set(rawData.map(d => d.source))), [rawData]);

  // Top domains for quick filters
  const topDomains = useMemo(() => {
    const domainCounts = filteredData.reduce((acc, item) => {
      acc[item.domain] = (acc[item.domain] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(domainCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([domain]) => domain);
  }, [filteredData]);

  const trashItems = useMemo(() => getTopTrash(filteredData), [filteredData]);

  // Quick filter handlers
  const handleDatePreset = (preset: 'today' | 'yesterday' | 'week' | 'month') => {
    const now = new Date();
    let start = new Date();
    let end = new Date();
    
    if (preset === 'today') {
      start = startOfDay(now);
      end = endOfDay(now);
    } else if (preset === 'yesterday') {
      const yesterday = subDays(now, 1);
      start = startOfDay(yesterday);
      end = endOfDay(yesterday);
    } else if (preset === 'week') {
      start = startOfDay(subDays(now, 7));
      end = endOfDay(now);
    } else if (preset === 'month') {
      start = startOfDay(subDays(now, 30));
      end = endOfDay(now);
    }
    
    setFilters(prev => ({
      ...prev,
      dateRange: {
        start: format(start, "yyyy-MM-dd'T'HH:mm:ss"),
        end: format(end, "yyyy-MM-dd'T'HH:mm:ss"),
      },
    }));
  };

  const handleQuickDomainToggle = (domain: string) => {
    setFilters(prev => {
      const current = prev.selectedDomains;
      const newDomains = current.includes(domain)
        ? current.filter(d => d !== domain)
        : [...current, domain];
      return { ...prev, selectedDomains: newDomains };
    });
  };

  const handleQuickQualityToggle = (quality: QualityClass) => {
    setFilters(prev => {
      const current = prev.qualities;
      const newQualities = current.includes(quality)
        ? current.filter(q => q !== quality)
        : [...current, quality];
      return { ...prev, qualities: newQualities };
    });
  };

  // Handle Chart Clicks for Filtering (memoized)
  const handleChartFilter = useCallback((type: keyof FilterState, value: any) => {
    setFilters(prev => {
      const current = prev[type];
      // Boolean check
      if (type === 'hasVideo') {
        return { ...prev, hasVideo: value === 'Con Video' ? true : value === 'Senza Video' ? false : null };
      }
      
      // Array toggle check
      if (Array.isArray(current)) {
        const list = current as any[];
        const newArray = list.includes(value) 
          ? list.filter(item => item !== value)
          : [...list, value];
        return { ...prev, [type]: newArray };
      }

      return prev;
    });
  }, []);

  // Handle removing individual filters (memoized)
  const handleRemoveFilter = useCallback((type: keyof FilterState, value?: any) => {
    setFilters(prev => {
      if (type === 'hasVideo') {
        return { ...prev, hasVideo: null };
      }
      
      if (Array.isArray(prev[type]) && value !== undefined) {
        const list = prev[type] as any[];
        return { ...prev, [type]: list.filter(item => item !== value) };
      }

      return prev;
    });
  }, []);

  // Handle clearing all filters (except date range) (memoized)
  const handleClearAllFilters = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      selectedDomains: [],
      qualities: [],
      hasVideo: null,
      sources: [],
      orientations: [],
      types: []
    }));
  }, []);

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-indigo-500 gap-4">
        <div className="animate-spin text-4xl">
           <LayoutDashboard />
        </div>
        <p className="text-slate-400 text-sm">Caricamento dati in corso...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-200 overflow-hidden">
      {/* Sidebar */}
      <div className={`flex-shrink-0 transition-all duration-300 ease-in-out h-full border-r border-slate-800 ${isSidebarOpen ? 'w-80' : 'w-0 overflow-hidden'}`}>
        <FilterPanel 
          filters={filters} 
          setFilters={setFilters}
          availableDomains={availableDomains}
          availableSources={availableSources}
          isOpen={isSidebarOpen}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onRefreshData={() => {
            setLoading(true);
            const refreshData = async () => {
              try {
                const data = await fetchDataFromAPI(true);
                setRawData(data);
              } catch (error) {
                console.error('Error refreshing data:', error);
              } finally {
                setLoading(false);
              }
            };
            refreshData();
          }}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative min-w-0">
        
        {/* Header */}
        <header className="bg-slate-950/90 backdrop-blur-sm z-10 border-b border-slate-800 flex-shrink-0">
          <div className="px-6 py-4">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-4">
                {!isSidebarOpen && (
                  <button 
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 rounded-md text-slate-300 transition-colors"
                    title="Apri filtri"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                )}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                      DataScope Analytics
                    </h1>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      view === 'dashboard' 
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' 
                        : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    }`}>
                      {view === 'dashboard' ? 'Dashboard' : 'Tabella URL'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      <span className="text-indigo-400 font-semibold">{filteredData.length}</span>
                      <span>articoli trovati</span>
                      {filteredData.length !== rawData.length && (
                        <span className="text-slate-500"> su <span className="font-semibold">{rawData.length}</span> totali</span>
                      )}
                    </span>
                    {filters.dateRange.start && filters.dateRange.end && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span className="text-slate-500">Periodo:</span>
                        <span className="text-slate-300 font-medium">
                          {format(new Date(filters.dateRange.start), 'dd/MM/yyyy')} - {format(new Date(filters.dateRange.end), 'dd/MM/yyyy')}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden md:block text-right">
                  <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                    {new Date().toLocaleTimeString('it-IT')}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => navigate('dashboard')}
                    className={`px-3 py-1.5 rounded-lg text-[11px] border transition-all flex items-center gap-1.5 ${
                      view === 'dashboard'
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/50'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                    }`}
                    title="Visualizza dashboard con grafici"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    Dashboard
                  </button>
                  <button
                    onClick={() => navigate('urls')}
                    className={`px-3 py-1.5 rounded-lg text-[11px] border transition-all flex items-center gap-1.5 ${
                      view === 'urls'
                        ? 'bg-sky-600 border-sky-500 text-white shadow-lg shadow-sky-900/50'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                    }`}
                    title="Visualizza tabella completa URL"
                  >
                    <Table2 className="w-3.5 h-3.5" />
                    Tabella URL
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Active Filters Section Below Header */}
          <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/50">
            <ActiveFilters 
              filters={filters}
              onRemoveFilter={handleRemoveFilter}
              onClearAll={handleClearAllFilters}
              compact={true}
            />
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto scroll-smooth p-6">
           <div className="max-w-7xl mx-auto space-y-6">
             {/* Warning Message Toggle */}
             <div className="bg-amber-900/30 border border-amber-500/30 rounded-lg overflow-hidden">
               <details className="group">
                 <summary className="px-4 py-3 cursor-pointer flex items-center justify-between hover:bg-amber-900/20 transition-colors">
                   <div className="flex items-center gap-2">
                     <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />
                     <span className="text-sm font-semibold text-amber-200">
                       Informazioni sulle Immagini
                     </span>
                   </div>
                   <ChevronDown className="w-4 h-4 text-amber-400 transition-transform group-open:rotate-180" />
                 </summary>
                 <div className="px-4 pb-4 pt-2">
                   <p className="text-xs text-amber-200/80 leading-relaxed">
                     Tutte le immagini sono state scaricate e controllate in locale dall'<strong>og:image</strong>. 
                     Il default di tutte le immagini dagli <code className="bg-amber-900/50 px-1 py-0.5 rounded">og:width</code> è <strong>1200px</strong>.
                   </p>
                 </div>
               </details>
             </div>

             {view === 'dashboard' ? (
               <>
                 {/* Quick Filters */}
                 <QuickFilters
                   filters={{
                     dateRange: filters.dateRange,
                     selectedDomains: filters.selectedDomains,
                     qualities: filters.qualities,
                   }}
                   onDatePreset={handleDatePreset}
                   onDomainToggle={handleQuickDomainToggle}
                   onQualityToggle={handleQuickQualityToggle}
                   availableDomains={availableDomains}
                   topDomains={topDomains}
                 />

                 {/* Section Title */}
                 <div className="mb-4">
                   <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                     <BarChart3 className="w-5 h-5 text-indigo-400" />
                     Dashboard Analitico
                   </h2>
                   <p className="text-sm text-slate-400 mt-1">
                     Visualizzazioni interattive dei dati filtrati. <span className="text-indigo-400 font-medium">Clicca sui grafici</span> per applicare filtri rapidi.
                   </p>
                 </div>

                 {/* Visualization Grid */}
                 <DashboardCharts 
                    data={filteredData} 
                    onFilter={handleChartFilter}
                 />

                 {/* Section Title for Trash */}
                 {trashItems.length > 0 && (
                   <div className="mb-4 mt-8">
                     <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                       <span className="text-amber-500">⚠️</span>
                       Immagini da Rivedere
                     </h2>
                     <p className="text-sm text-slate-400 mt-1">
                       Top 10 immagini con problemi di qualità, dimensioni o compressione. <span className="text-amber-400">Priorità: immagini con bordo rosso</span>.
                     </p>
                   </div>
                 )}

                 {/* Trash Table */}
                 {trashItems.length > 0 ? (
                   <TrashTable data={trashItems} />
                 ) : (
                   <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
                     <p className="text-slate-400 text-sm">✅ Nessuna immagine critica trovata nel periodo selezionato.</p>
                     <p className="text-slate-500 text-xs mt-2">Tutte le immagini rispettano i parametri di qualità.</p>
                   </div>
                 )}
               </>
             ) : (
               <>
                 {/* Section Title */}
                 <div className="mb-4">
                   <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                     <Table2 className="w-5 h-5 text-sky-400" />
                     Tabella Completa URL
                   </h2>
                   <p className="text-sm text-slate-400 mt-1">
                     Elenco completo degli articoli con tutti i dettagli. <span className="text-sky-400 font-medium">Scorri verso il basso</span> per caricare automaticamente più risultati.
                   </p>
                 </div>

                 <UrlTable 
                   data={filteredData}
                   totalDayCount={dataFilteredByDateOnly.length}
                   onBack={() => navigate('dashboard')}
                 />
               </>
             )}
           </div>
           
          {/* Footer */}
          <footer className="py-8 text-center text-slate-600 text-xs mt-4 space-y-1">
            <div>
              DataScope Analytics v1.0 &copy; {new Date().getFullYear()}
            </div>
            <div className="text-[11px] text-slate-500">
              DataScope – Scraper{' '}
              <a
                href="https://www.linkedin.com/in/andreasolinas99/"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
              >
                Andrea Solinas
              </a>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
};

export default App;