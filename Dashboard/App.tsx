import React, { useEffect, useState, useMemo } from 'react';
import { fetchDataFromAPI } from './services/dataService';
import { DataItem, FilterState, QualityClass, Orientation, ContentType } from './types';
import { FilterPanel } from './components/FilterPanel';
import { DashboardCharts } from './components/DashboardCharts';
import { TrashTable } from './components/TrashTable';
import { UrlTable } from './components/UrlTable';
import { getQuality, getOrientation, getType, getTopTrash } from './utils/analytics';
import { LayoutDashboard, Menu, Info } from 'lucide-react';
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

    const loadData = async () => {
      try {
        const data = await fetchDataFromAPI();
    setRawData(data);
    
    // Set default date range to yesterday
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
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
    setLoading(false);
      }
    };
    
    loadData();
  }, []);

  const navigate = (target: 'dashboard' | 'urls') => {
    setView(target);
    if (typeof window !== 'undefined') {
      const path = target === 'dashboard' ? '/' : '/urls';
      window.history.pushState({}, '', path);
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

  // Filter Logic - All filters applied
  const filteredData = useMemo(() => {
    return rawData.filter(item => {
      const itemDate = new Date(item.published_at).getTime();
      const startDate = new Date(filters.dateRange.start).getTime();
      const endDate = new Date(filters.dateRange.end).getTime();

      if (itemDate < startDate || itemDate > endDate) return false;
      if (filters.selectedDomains.length > 0 && !filters.selectedDomains.includes(item.domain)) return false;
      if (filters.qualities.length > 0 && !filters.qualities.includes(getQuality(item))) return false;
      if (filters.extensions.length > 0 && !filters.extensions.includes(item.image_extension)) return false;
      if (filters.hasVideo !== null && item.has_video !== filters.hasVideo) return false;
      if (filters.sources.length > 0 && !filters.sources.includes(item.source)) return false;
      if (filters.orientations.length > 0 && !filters.orientations.includes(getOrientation(item))) return false;
      if (filters.types.length > 0 && !filters.types.includes(getType(item.url))) return false;

      return true;
    });
  }, [rawData, filters]);

  // Derived lists for Filter UI
  const availableDomains = useMemo(() => Array.from(new Set(rawData.map(d => d.domain))), [rawData]);
  const availableSources = useMemo(() => Array.from(new Set(rawData.map(d => d.source))), [rawData]);
  const availableExtensions = useMemo(() => Array.from(new Set(rawData.map(d => d.image_extension))), [rawData]);

  const trashItems = useMemo(() => getTopTrash(filteredData), [filteredData]);

  // Handle Chart Clicks for Filtering
  const handleChartFilter = (type: keyof FilterState, value: any) => {
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
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-950 text-indigo-500">
        <div className="animate-spin text-4xl">
           <LayoutDashboard />
        </div>
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
          availableExtensions={availableExtensions}
          isOpen={isSidebarOpen}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative min-w-0">
        
        {/* Header & Disclaimer */}
        <header className="bg-slate-950/90 backdrop-blur-sm z-10 border-b border-slate-800 flex-shrink-0">
          {/* Disclaimer */}
          <div className="bg-indigo-900/30 border-b border-indigo-500/30 px-4 py-2 text-xs text-indigo-200 flex items-center justify-center gap-2">
            <Info className="w-3 h-3" />
            <span>Le immagini visualizzate provengono dagli <strong>og_image</strong> scaricate con la query string e analizzate in locale.</span>
          </div>

          <div className="px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              {!isSidebarOpen && (
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 rounded-md text-slate-300 transition-colors"
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}
              <div>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                  DataScope Analytics
                </h1>
                <p className="text-slate-500 text-xs mt-1">
                  Visualizzazione {filteredData.length} di {rawData.length} risorse
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:block text-right">
                <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                  Ultimo aggiornamento: {new Date().toLocaleTimeString()}
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => navigate('dashboard')}
                  className={`px-3 py-1.5 rounded-full text-[11px] border transition-colors ${
                    view === 'dashboard'
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => navigate('urls')}
                  className={`px-3 py-1.5 rounded-full text-[11px] border transition-colors ${
                    view === 'urls'
                      ? 'bg-sky-600 border-sky-500 text-white shadow'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  Tabella URL
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto scroll-smooth p-6">
           <div className="max-w-7xl mx-auto space-y-8">
             {view === 'dashboard' ? (
               <>
                 {/* Visualization Grid */}
                 <DashboardCharts 
                    data={filteredData} 
                    onFilter={handleChartFilter}
                 />

                 {/* Trash Table */}
                 <TrashTable data={trashItems} />
               </>
             ) : (
               <UrlTable 
                 data={filteredData}
                 totalDayCount={dataFilteredByDateOnly.length}
                 onBack={() => navigate('dashboard')}
               />
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