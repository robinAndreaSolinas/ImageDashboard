import React, { useMemo } from 'react';
import { DataItem, QualityClass, FilterState } from '../types';
import { getQuality, getOrientation, calculateGaussian } from '../utils/analytics';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line, AreaChart, Area
} from 'recharts';
import { format, getHours, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

interface Props {
  data: DataItem[];
  onFilter: (type: keyof FilterState, value: any) => void;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const RADIAN = Math.PI / 180;

// Custom Label for Pie Charts
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return percent > 0.05 ? (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={10} fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  ) : null;
};

export const DashboardCharts: React.FC<Props> = ({ data, onFilter }) => {
  
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
    return Object.entries(counts).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);
  }, [distinctData]);

  // 2. Pie: Orientation Distribution
  const orientationData = useMemo(() => {
    const counts: Record<string, number> = {};
    distinctData.forEach(d => {
      const o = getOrientation(d);
      counts[o] = (counts[o] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [distinctData]);

  // 3. Pie: Video Presence
  const videoData = useMemo(() => {
    let yes = 0, no = 0;
    distinctData.forEach(d => d.has_video ? yes++ : no++);
    return [
      { name: 'Con Video', value: yes },
      { name: 'Senza Video', value: no }
    ];
  }, [distinctData]);

  // 4. Bar: Weight Classes
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

  // 6. Gaussian: Image Width Distribution (Excluding 'No Image')
  const gaussianData = useMemo(() => {
    const validWidths = distinctData
      .filter(d => !d.image_url.includes('/og/') && d.image_width > 0)
      .map(d => d.image_width);
    
    return calculateGaussian(validWidths);
  }, [distinctData]);

  // 7. Line: Hourly Average Publication by Domain
  const hourlyData = useMemo(() => {
    const result: any[] = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00` }));

    // Group counts per day and hour
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

    // Build hourly averages
    result.forEach((r, hourIndex) => {
      const accum: Record<string, number> = {};

      Object.values(perDay).forEach(hoursMap => {
        const domainsAtHour = hoursMap[hourIndex];
        if (domainsAtHour) {
          Object.entries(domainsAtHour).forEach(([domain, count]) => {
            accum[domain] = (accum[domain] || 0) + count;
          });
        }
      });

      Object.entries(accum).forEach(([domain, sum]) => {
        // Average per day for that hour
        r[domain] = sum / totalDays;
      });
    });

    return result;
  }, [distinctData]);

  // 8. Line: Monthly Trend by Domain
  const monthlyData = useMemo(() => {
    const counts: Record<string, Record<string, number>> = {}; // 'YYYY-MM' -> domain -> count
    
    distinctData.forEach(d => {
      const date = parseISO(d.published_at);
      const key = format(date, 'MMM yy', { locale: it }); 
      if (!counts[key]) counts[key] = {};
      counts[key][d.domain] = (counts[key][d.domain] || 0) + 1;
    });

    return Object.entries(counts).map(([month, domains]) => ({
      month,
      ...domains
    }));
  }, [distinctData]);
  
  const uniqueDomains = Array.from(new Set(distinctData.map(d => d.domain)));


  // --- Components ---

  const Card = ({ title, children, full = false }: { title: string, children: React.ReactNode, full?: boolean }) => (
    <div className={`bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col shadow-lg transition-transform hover:border-slate-700 ${full ? 'col-span-full' : ''}`}>
      <h3 className="text-slate-300 font-semibold mb-4 text-xs uppercase tracking-wide border-b border-slate-800 pb-2 flex justify-between">
        {title}
        <span className="text-[10px] text-slate-500 normal-case font-normal">(Clicca per filtrare)</span>
      </h3>
      <div className="flex-1 w-full min-h-[250px] relative">
        {children}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      
      <Card title="Distribuzione Qualità">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={qualityData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              onClick={(data) => onFilter('qualities', data.name)}
              className="cursor-pointer"
            >
              {qualityData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
              ))}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9', borderRadius: '8px' }} itemStyle={{color: '#fff'}} />
            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Orientamento">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={orientationData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              onClick={(data) => onFilter('orientations', data.name)}
              className="cursor-pointer"
            >
              {orientationData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#64748b'][index % 4]} stroke="rgba(0,0,0,0)" />
              ))}
            </Pie>
             <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9', borderRadius: '8px' }} itemStyle={{color: '#fff'}} />
            <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Presenza Video">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
             <Pie
              data={videoData}
              cx="50%"
              cy="50%"
              startAngle={180}
              endAngle={0}
              innerRadius={60}
              outerRadius={80}
              dataKey="value"
              onClick={(data) => onFilter('hasVideo', data.name)}
              className="cursor-pointer"
            >
              <Cell fill="#ef4444" stroke="rgba(0,0,0,0)" />
              <Cell fill="#334155" stroke="rgba(0,0,0,0)" />
            </Pie>
            <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
             <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9', borderRadius: '8px' }} itemStyle={{color: '#fff'}} />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Classi di Peso (KB)">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weightData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
            <XAxis type="number" stroke="#64748b" fontSize={11} />
            <YAxis dataKey="name" type="category" width={80} stroke="#64748b" fontSize={11} />
            <Tooltip cursor={{fill: '#334155', opacity: 0.2}} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9', borderRadius: '8px' }} />
            <Bar 
                dataKey="count" 
                fill="#6366f1" 
                radius={[0, 4, 4, 0]} 
                barSize={20} 
                className="cursor-pointer opacity-90 hover:opacity-100"
            />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Top Redazioni">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sourceData} onClick={(data) => data && data.activePayload && onFilter('sources', data.activePayload[0].payload.name)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="name" stroke="#64748b" fontSize={10} angle={-20} textAnchor="end" height={60} interval={0} />
            <YAxis stroke="#64748b" fontSize={11} />
            <Tooltip cursor={{fill: '#334155', opacity: 0.2}} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9', borderRadius: '8px' }} />
            <Bar 
                dataKey="count" 
                fill="#10b981" 
                radius={[4, 4, 0, 0]} 
                className="cursor-pointer opacity-90 hover:opacity-100"
            />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Analisi Gaussiana Larghezza Immagini (No Missing)">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={gaussianData}>
            <defs>
              <linearGradient id="colorDensity" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="x" stroke="#64748b" fontSize={11} label={{ value: 'Width (px)', position: 'insideBottomRight', offset: -5, fill: '#64748b', fontSize: 10 }} />
            <YAxis stroke="#64748b" fontSize={11} tickFormatter={(val) => val.toFixed(4)} width={50} />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9', borderRadius: '8px' }} />
            <Area type="monotone" dataKey="density" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorDensity)" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Distribuzione Oraria per Dominio" full>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={hourlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="hour" stroke="#64748b" fontSize={12} />
            <YAxis stroke="#64748b" fontSize={12} />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9', borderRadius: '8px' }} />
            <Legend onClick={(e) => onFilter('selectedDomains', e.value)} wrapperStyle={{ paddingTop: '20px', cursor: 'pointer' }} iconType="circle" />
            {uniqueDomains.map((domain, i) => (
              <Line 
                key={domain} 
                type="monotone" 
                dataKey={domain} 
                stroke={COLORS[i % COLORS.length]} 
                dot={false}
                strokeWidth={3}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Trend Mensile per Dominio" full>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
            <YAxis stroke="#64748b" fontSize={12} />
            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9', borderRadius: '8px' }} />
            <Legend onClick={(e) => onFilter('selectedDomains', e.value)} wrapperStyle={{ paddingTop: '20px', cursor: 'pointer' }} iconType="circle" />
            {uniqueDomains.map((domain, i) => (
              <Line 
                key={domain} 
                type="basis" 
                dataKey={domain} 
                stroke={COLORS[i % COLORS.length]} 
                dot={{r: 3}}
                strokeWidth={3}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};