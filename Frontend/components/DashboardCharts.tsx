import React, { useMemo } from 'react';
import { DataItem, QualityClass, FilterState } from '../types';
import { getQuality, calculateGaussian } from '../utils/analytics';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  AreaChart, Area, LineChart, Line
} from 'recharts';
import { format, getHours, parseISO } from 'date-fns';

interface Props {
  data: DataItem[];
  onFilter: (type: keyof FilterState, value: any) => void;
  theme?: 'light' | 'dark';
}

// Standard color palette for charts
const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#a855f7', '#e11d48'];

// Quality color mapping (standard colors)
const QUALITY_COLORS: Record<QualityClass, string> = {
  [QualityClass.LOW]: '#ef4444',        // Red - Bassa
  [QualityClass.MEDIUM]: '#f59e0b',     // Yellow/Orange - Media
  [QualityClass.HIGH]: '#10b981',       // Green - Alta
  [QualityClass.VERY_HIGH]: '#06b6d4',  // Cyan/Azzurro - Altissima
  [QualityClass.NO_IMAGE]: '#64748b',   // Gray - Senza Immagine
};

// Domain color mapping function (assigns consistent colors to domains)
const getDomainColor = (domain: string, index: number): string => {
  // Use a hash-like function to assign consistent colors to domains
  const hash = domain.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return CHART_COLORS[(hash + index) % CHART_COLORS.length];
};

const RADIAN = Math.PI / 180;

// Custom Label for Pie Charts
const renderCustomizedLabel = (theme: 'light' | 'dark' = 'dark') => ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return percent > 0.05 ? (
    <text x={x} y={y} fill={theme === 'dark' ? 'white' : '#1e293b'} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={10} fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  ) : null;
};

export const DashboardCharts: React.FC<Props> = React.memo(({ data, onFilter, theme = 'dark' }) => {
  const isDark = theme === 'dark';
  const textColor = isDark ? '#f1f5f9' : '#0f172a'; // Più scuro per migliore contrasto
  const gridColor = isDark ? '#334155' : '#cbd5e1'; // Più scuro per migliore visibilità
  const axisColor = isDark ? '#94a3b8' : '#475569'; // Più scuro per migliore leggibilità
  const bgColor = isDark ? '#0f172a' : '#ffffff';
  const borderColor = isDark ? '#334155' : '#cbd5e1';
  const legendColor = isDark ? '#cbd5e1' : '#475569'; // Migliore contrasto per legenda
  
  // --- Data Preparation ---

  // Use distinct articles (by URL) to avoid counting duplicates
  const distinctData = useMemo(() => {
    const byUrl = new Map<string, DataItem>();
    data.forEach(d => {
      if (!byUrl.has(d.url)) {
        byUrl.set(d.url, d);
      }
    });
    return Array.from(byUrl.values());
  }, [data]);
  
  // 1. Pie: Quality Distribution
  const qualityData = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(QualityClass).forEach(k => counts[k] = 0);
    distinctData.forEach(d => {
      const q = getQuality(d);
      counts[q] = (counts[q] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value, color: QUALITY_COLORS[name as QualityClass] }))
      .filter(d => d.value > 0);
  }, [distinctData]);

  // 2. Bar: Weight Classes
  const weightData = useMemo(() => {
    const ranges = ['0-100kb', '101-300kb', '301-500kb', '500kb+'];
    const counts = [0, 0, 0, 0];
    distinctData.forEach(d => {
      const w = d.image_weight;
      if (w <= 100) counts[0]++;
      else if (w <= 300) counts[1]++;
      else if (w <= 500) counts[2]++;
      else counts[3]++;
    });
    return ranges.map((name, i) => ({ name, count: counts[i] }));
  }, [distinctData]);

  // 5. Bar: Source (Redazione)
  const sourceData = useMemo(() => {
    const counts: Record<string, number> = {};
    distinctData.forEach(d => {
      counts[d.source] = (counts[d.source] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [distinctData]);

  // 4. Gaussian: Image Width Distribution (Excluding 'No Image')
  const gaussianData = useMemo(() => {
    const validWidths = distinctData
      .filter(d => !d.image_url.includes('/og/') && d.image_width > 0)
      .map(d => d.image_width);
    
    return calculateGaussian(validWidths);
  }, [distinctData]);

  // 5. Line: Hourly Average Publication by Domain
  const hourlyData = useMemo(() => {
    const result: any[] = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00` }));

    // Group counts per day and hour per domain
    // structure: dayKey -> hour -> domain -> count
    const perDay: Record<string, Record<number, Record<string, number>>> = {};

    distinctData.forEach(d => {
      const date = parseISO(d.published_at);
      const dayKey = format(date, 'yyyy-MM-dd');
      const h = getHours(date);

      if (!perDay[dayKey]) perDay[dayKey] = {};
      if (!perDay[dayKey][h]) perDay[dayKey][h] = {};
      perDay[dayKey][h][d.domain] = (perDay[dayKey][h][d.domain] || 0) + 1;
    });

    const totalDays = Object.keys(perDay).length || 1;
    const uniqueDomains = Array.from(new Set(distinctData.map(d => d.domain)));

    // Build hourly averages per domain with color mapping
    result.forEach((r: any, hourIndex) => {
      uniqueDomains.forEach((domain: string) => {
        let total = 0;
        Object.values(perDay).forEach((hoursMap: Record<number, Record<string, number>>) => {
          const domainsAtHour = hoursMap[hourIndex];
          if (domainsAtHour) {
            total += domainsAtHour[domain] || 0;
          }
        });
        r[domain] = total / totalDays;
      });
    });

    // Create domain color mapping
    const domainColors = uniqueDomains.reduce((acc, domain, index) => {
      acc[domain] = getDomainColor(domain, index);
      return acc;
    }, {} as Record<string, string>);

    return { data: result, domains: uniqueDomains, domainColors };
  }, [distinctData]);


  // --- Components ---

  const Card = ({ 
    title, 
    description, 
    explanation,
    children, 
    full = false,
    interactive = true 
  }: { 
    title: string; 
    description?: string;
    explanation?: string;
    children: React.ReactNode; 
    full?: boolean;
    interactive?: boolean;
  }) => (
    <div className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300'} border rounded-xl p-5 flex flex-col shadow-lg transition-all hover:border-indigo-500/50 hover:shadow-xl group ${full ? 'col-span-full' : ''} ${interactive ? 'cursor-pointer' : ''}`}>
      <div className="mb-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className={`${isDark ? 'text-slate-100' : 'text-slate-900'} font-bold text-sm flex-1`}>
            {title}
          </h3>
          {interactive && (
            <span className="text-[9px] text-indigo-400 normal-case font-medium px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse"></span>
              Clicca per filtrare
            </span>
          )}
        </div>
        {description && (
          <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-800'} mb-1 font-medium`}>{description}</p>
        )}
        {explanation && (
          <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-700'} italic mt-1 leading-relaxed`}>
            {explanation}
          </p>
        )}
      </div>
      <div className="flex-1 w-full min-h-[250px] relative">
        {children}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      
      <Card 
        title="Distribuzione Qualità" 
        description="Percentuale di immagini per classe di qualità"
        explanation="Mostra come sono distribuite le immagini in base alla loro larghezza. Le classi sono: Bassa (≤799px), Media (800-1199px), Alta (1200-1999px), Molto Alta (≥2000px). Clicca su una fetta per filtrare."
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={qualityData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel(theme)}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              onClick={(data) => {
                if (data && data.name) {
                  onFilter('qualities', data.name);
                }
              }}
              className="cursor-pointer transition-opacity hover:opacity-90"
            >
              {qualityData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} 
                  stroke="rgba(0,0,0,0)"
                  className="hover:opacity-80 transition-opacity"
                />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: bgColor, borderColor: borderColor, color: textColor, borderRadius: '8px' }} 
              itemStyle={{color: textColor}}
              formatter={(value: any) => [`${value} articoli`, '']}
            />
            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', color: legendColor, fontWeight: '500' }} />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      <Card 
        title="Classi di Peso Immagini" 
        description="Distribuzione del peso file in kilobyte"
        explanation="Mostra quanti articoli hanno immagini in diverse fasce di peso. Utile per identificare problemi di ottimizzazione."
        interactive={false}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weightData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
            <XAxis type="number" stroke={axisColor} fontSize={11} />
            <YAxis dataKey="name" type="category" width={80} stroke={axisColor} fontSize={11} />
            <Tooltip 
              cursor={{fill: gridColor, opacity: 0.2}} 
              contentStyle={{ backgroundColor: bgColor, borderColor: borderColor, color: textColor, borderRadius: '8px' }}
              formatter={(value: any) => [`${value} articoli`, '']}
            />
            <Bar 
                dataKey="count" 
                fill={CHART_COLORS[0]} 
                radius={[0, 4, 4, 0]} 
                barSize={20} 
            />
          </BarChart>
        </ResponsiveContainer>
      </Card>

              <Card 
                title="Top Redazioni" 
                description="Le 10 redazioni con più articoli pubblicati"
                explanation="Visualizza le redazioni più attive nel periodo selezionato. Clicca su una barra per filtrare solo quella redazione."
                interactive={true}
              >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={sourceData} 
                      onClick={(data) => {
                        if (data && data.activePayload && data.activePayload[0]) {
                          const sourceName = data.activePayload[0].payload.name;
                          onFilter('sources', sourceName);
                        }
                      }}
                      className="cursor-pointer"
                    >
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="name" stroke={axisColor} fontSize={10} angle={-20} textAnchor="end" height={60} interval={0} />
              <YAxis stroke={axisColor} fontSize={11} />
              <Tooltip 
                cursor={{fill: gridColor, opacity: 0.2}} 
                contentStyle={{ backgroundColor: bgColor, borderColor: borderColor, color: textColor, borderRadius: '8px' }}
                formatter={(value: any) => [`${value} articoli`, '']}
              />
              <Bar 
                  dataKey="count" 
                  fill={CHART_COLORS[1]} 
                  radius={[4, 4, 0, 0]} 
                  onClick={(data) => {
                    if (data && data.payload) {
                      onFilter('sources', data.payload.name);
                    }
                  }}
                  className="cursor-pointer opacity-90 hover:opacity-100 transition-opacity"
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>

      <Card 
        title="Distribuzione Larghezza Immagini" 
        description="Curva gaussiana della distribuzione delle larghezze"
        explanation="Mostra la distribuzione statistica delle larghezze delle immagini. Clicca su un punto della curva per filtrare per quella fascia di qualità."
        interactive={false}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={gaussianData} onClick={(data) => {
            if (data && data.activePayload && data.activePayload[0]) {
                const width = data.activePayload[0].payload.x;
                // Map width to quality class (updated ranges)
                if (width <= 799) onFilter('qualities', QualityClass.LOW);
                else if (width <= 1199) onFilter('qualities', QualityClass.MEDIUM);
                else if (width <= 1999) onFilter('qualities', QualityClass.HIGH);
                else onFilter('qualities', QualityClass.VERY_HIGH);
            }
          }} className="cursor-pointer">
            <defs>
              <linearGradient id="colorDensity" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS[4]} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={CHART_COLORS[4]} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="x" stroke={axisColor} fontSize={11} fontWeight="500" label={{ value: 'Width (px)', position: 'insideBottomRight', offset: -5, fill: axisColor, fontSize: 10, fontWeight: '600' }} />
            <YAxis stroke={axisColor} fontSize={11} tickFormatter={(val) => val.toFixed(4)} width={50} />
            <Tooltip 
              contentStyle={{ backgroundColor: bgColor, borderColor: borderColor, color: textColor, borderRadius: '8px' }}
              formatter={(value: any) => [`Densità: ${value?.toFixed(4) || 0}`, '']}
            />
            <Area type="monotone" dataKey="density" stroke={CHART_COLORS[4]} fillOpacity={1} fill="url(#colorDensity)" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <Card 
        title="Distribuzione Oraria Media per Dominio" 
        description="Media giornaliera di pubblicazioni per ora del giorno per dominio"
        explanation="Mostra quando vengono pubblicati più articoli durante la giornata per ogni dominio, calcolando la media per ogni ora. Clicca su una linea o sulla legenda per filtrare per dominio."
        full
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart 
            data={hourlyData.data}
            onClick={(data) => {
              if (data && data.activePayload && data.activePayload[0]) {
                const domain = data.activePayload[0].dataKey;
                if (domain && domain !== 'hour') {
                  onFilter('selectedDomains', domain);
                }
              }
            }}
            className="cursor-pointer"
          >
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis 
              dataKey="hour" 
              stroke={axisColor} 
              fontSize={11}
              interval={1}
            />
            <YAxis 
              stroke={axisColor} 
              fontSize={11}
              fontWeight="500"
              label={{ value: 'Articoli/ora', angle: -90, position: 'insideLeft', fill: axisColor, fontSize: 10, fontWeight: '600' }}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: bgColor, borderColor: borderColor, color: textColor, borderRadius: '8px' }}
              formatter={(value: any) => [`${value?.toFixed(1) || 0} articoli/ora`, '']}
              labelFormatter={(label) => `Ora: ${label}`}
            />
            <Legend 
              onClick={(e) => {
                if (e && e.value) {
                  onFilter('selectedDomains', e.value);
                }
              }} 
              wrapperStyle={{ paddingTop: '20px', cursor: 'pointer', color: legendColor, fontWeight: '500' }} 
              iconType="circle"
            />
            {hourlyData.domains.map((domain, i) => {
              const domainColor = hourlyData.domainColors[domain] || CHART_COLORS[i % CHART_COLORS.length];
              return (
                <Line 
                  key={domain} 
                  type="monotone" 
                  dataKey={domain} 
                  stroke={domainColor} 
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6, fill: domainColor }}
                  className="hover:opacity-80 transition-opacity"
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
});

DashboardCharts.displayName = 'DashboardCharts';