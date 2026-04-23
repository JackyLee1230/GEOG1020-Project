import { useMemo, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Download,
  ExternalLink,
  MapPinned,
  Radar,
  Siren,
  TrendingUp,
  Waves,
  Zap
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  extractRegion,
  formatHKT,
  getDepthCategory,
  getDepthKm,
  getMagnitude,
  toEarthquakeCSV
} from '../../lib/earthquake';
import {
  EarthquakeAnalytics,
  EarthquakeFeature,
  EarthquakeMetadata,
  EarthquakeSource
} from '../../types/earthquake';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '../ui';

Chart.register(...registerables);

type InsightTab = 'overview' | 'trends' | 'events';

interface SourceInsight {
  source: EarthquakeSource;
  count: number;
  averageMagnitude: number;
  averageDepthKm: number;
  averageConfidence: number;
  tsunamiEvents: number;
  significantEvents: number;
}

interface LatestEarthquakesProps {
  isOpen: boolean;
  metadata: EarthquakeMetadata | null;
  events: EarthquakeFeature[];
  allEventsCount: number;
  analytics: EarthquakeAnalytics;
  selectedEarthquakeId: string | null;
  onSelectEarthquake: (feature: EarthquakeFeature) => void;
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: '#1e293b',
        boxWidth: 12
      }
    }
  },
  scales: {
    x: {
      ticks: { color: '#334155', maxRotation: 0, autoSkip: true },
      grid: { color: 'rgba(148, 163, 184, 0.16)' }
    },
    y: {
      ticks: { color: '#334155' },
      grid: { color: 'rgba(148, 163, 184, 0.16)' }
    }
  }
};

const formatCount = (value: unknown): string => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toLocaleString() : '0';
};

const formatSourceLabel = (value: string): string => value.toUpperCase();

const sourcePalette = ['#0ea5e9', '#14b8a6', '#f97316', '#8b5cf6', '#eab308'];

const percentile = (values: number[], rank: number): number => {
  if (!values.length) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * rank;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) return sorted[lower];

  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
};

const standardDeviation = (values: number[], mean: number): number => {
  if (!values.length) return 0;

  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;

  return Math.sqrt(variance);
};

const correlation = (xValues: number[], yValues: number[]): number => {
  if (!xValues.length || xValues.length !== yValues.length) return 0;

  const xMean = xValues.reduce((sum, value) => sum + value, 0) / xValues.length;
  const yMean = yValues.reduce((sum, value) => sum + value, 0) / yValues.length;

  let numerator = 0;
  let xSquared = 0;
  let ySquared = 0;

  for (let index = 0; index < xValues.length; index += 1) {
    const xDiff = xValues[index] - xMean;
    const yDiff = yValues[index] - yMean;
    numerator += xDiff * yDiff;
    xSquared += xDiff ** 2;
    ySquared += yDiff ** 2;
  }

  const denominator = Math.sqrt(xSquared * ySquared);
  if (!Number.isFinite(denominator) || denominator === 0) return 0;

  return numerator / denominator;
};

const downloadFilteredCSV = (events: EarthquakeFeature[]) => {
  const csvContent = toEarthquakeCSV(events);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute(
    'download',
    `earthquakes_filtered_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const metadataRows = (metadata: EarthquakeMetadata | null) => {
  if (!metadata) return [];

  const providerSummary = Object.entries(metadata.providerCounts ?? {})
    .filter(([, count]) => Number.isFinite(Number(count)) && Number(count) > 0)
    .map(
      ([source, count]) => `${formatSourceLabel(source)}: ${formatCount(count)}`
    )
    .join(', ');

  const rows: Array<[string, string]> = [
    ['Feed title', metadata.title],
    ['API version', metadata.api],
    ['Server status', String(metadata.status)],
    ['Feed event count', formatCount(metadata.count)],
    ['Generated (HKT)', formatHKT(metadata.generated)]
  ];

  if (providerSummary) rows.push(['Provider events', providerSummary]);
  if (metadata.dedupedFrom) {
    rows.push(['Deduped from', formatCount(metadata.dedupedFrom)]);
  }

  return rows;
};

const getTabClassName = (activeTab: InsightTab, tab: InsightTab) => {
  return cn(
    'rounded-md border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors',
    activeTab === tab
      ? 'border-cyan-300 bg-cyan-50 text-cyan-700'
      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
  );
};

export default function LatestEarthquakes({
  isOpen,
  metadata,
  events,
  allEventsCount,
  analytics,
  selectedEarthquakeId,
  onSelectEarthquake
}: LatestEarthquakesProps) {
  const [activeTab, setActiveTab] = useState<InsightTab>('overview');

  const selectedEarthquake = useMemo(
    () => events.find((event) => event.id === selectedEarthquakeId) ?? null,
    [events, selectedEarthquakeId]
  );

  const dayChartData = useMemo(() => {
    const windowed = analytics.byDay.slice(-14);
    return {
      labels: windowed.map((item) => item.label.slice(5)),
      datasets: [
        {
          label: 'Events / day',
          data: windowed.map((item) => item.count),
          backgroundColor: 'rgba(14, 165, 233, 0.75)',
          borderColor: 'rgba(14, 165, 233, 1)',
          borderWidth: 1
        }
      ]
    };
  }, [analytics.byDay]);

  const magnitudeTrendData = useMemo(() => {
    const byDayMagnitude = new Map<string, number[]>();

    events.forEach((event) => {
      const dayLabel = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'UTC'
      }).format(new Date(event.properties.time));
      const current = byDayMagnitude.get(dayLabel) ?? [];
      current.push(getMagnitude(event));
      byDayMagnitude.set(dayLabel, current);
    });

    const windowed: Array<[string, number[]]> = Array.from(
      byDayMagnitude.entries()
    )
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14);

    return {
      labels: windowed.map(([label]) => label.slice(5)),
      avg: windowed.map(([, magnitudes]) => {
        return (
          magnitudes.reduce((sum: number, value: number) => sum + value, 0) /
          magnitudes.length
        );
      }),
      min: windowed.map(([, magnitudes]) => Math.min(...magnitudes)),
      max: windowed.map(([, magnitudes]) => Math.max(...magnitudes))
    };
  }, [events]);

  const magnitudeLineChartData = useMemo(
    () => ({
      labels: magnitudeTrendData.labels,
      datasets: [
        {
          label: 'Daily avg mag',
          data: magnitudeTrendData.avg,
          borderColor: '#0ea5e9',
          backgroundColor: 'rgba(14, 165, 233, 0.2)',
          borderWidth: 2,
          tension: 0.32,
          pointRadius: 2,
          pointHoverRadius: 4
        },
        {
          label: 'Daily min mag',
          data: magnitudeTrendData.min,
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34, 197, 94, 0.15)',
          borderWidth: 1.8,
          tension: 0.28,
          pointRadius: 1.8,
          pointHoverRadius: 3
        },
        {
          label: 'Daily max mag',
          data: magnitudeTrendData.max,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          borderWidth: 1.8,
          tension: 0.28,
          pointRadius: 1.8,
          pointHoverRadius: 3
        }
      ]
    }),
    [magnitudeTrendData]
  );

  const statistics = useMemo(() => {
    const magnitudes = events.map((event) => getMagnitude(event));
    const depths = events.map((event) => getDepthKm(event));

    if (!magnitudes.length || !depths.length) {
      return {
        meanMagnitude: 0,
        medianMagnitude: 0,
        p90Magnitude: 0,
        stdMagnitude: 0,
        strongEventRate: 0,
        meanDepth: 0,
        depthIqr: 0,
        shallowRate: 0,
        depthMagCorrelation: 0
      };
    }

    const meanMagnitude =
      magnitudes.reduce((sum, value) => sum + value, 0) / magnitudes.length;
    const meanDepth =
      depths.reduce((sum, value) => sum + value, 0) / depths.length;
    const p75Depth = percentile(depths, 0.75);
    const p25Depth = percentile(depths, 0.25);

    return {
      meanMagnitude,
      medianMagnitude: percentile(magnitudes, 0.5),
      p90Magnitude: percentile(magnitudes, 0.9),
      stdMagnitude: standardDeviation(magnitudes, meanMagnitude),
      strongEventRate:
        (magnitudes.filter((magnitude) => magnitude >= 5).length /
          magnitudes.length) *
        100,
      meanDepth,
      depthIqr: p75Depth - p25Depth,
      shallowRate:
        (depths.filter((depth) => depth <= 70).length / depths.length) * 100,
      depthMagCorrelation: correlation(depths, magnitudes)
    };
  }, [events]);

  const sourceInsights = useMemo((): SourceInsight[] => {
    const sourceMetrics = new Map<
      EarthquakeSource,
      {
        count: number;
        magnitudeSum: number;
        depthSum: number;
        confidenceSum: number;
        tsunamiEvents: number;
        significantEvents: number;
      }
    >();

    events.forEach((event) => {
      const source = event.properties.source ?? 'usgs';
      const existing = sourceMetrics.get(source) ?? {
        count: 0,
        magnitudeSum: 0,
        depthSum: 0,
        confidenceSum: 0,
        tsunamiEvents: 0,
        significantEvents: 0
      };

      existing.count += 1;
      existing.magnitudeSum += getMagnitude(event);
      existing.depthSum += getDepthKm(event);
      existing.confidenceSum += event.properties.confidenceScore ?? 0;
      if (event.properties.tsunami === 1) existing.tsunamiEvents += 1;
      if (event.properties.sig >= 600) existing.significantEvents += 1;

      sourceMetrics.set(source, existing);
    });

    return Array.from(sourceMetrics.entries())
      .map(([source, metrics]) => ({
        source,
        count: metrics.count,
        averageMagnitude: metrics.magnitudeSum / metrics.count,
        averageDepthKm: metrics.depthSum / metrics.count,
        averageConfidence: metrics.confidenceSum / metrics.count,
        tsunamiEvents: metrics.tsunamiEvents,
        significantEvents: metrics.significantEvents
      }))
      .sort((left, right) => right.count - left.count);
  }, [events]);

  const sourceCountChartData = useMemo(
    () => ({
      labels: sourceInsights.map((item) => formatSourceLabel(item.source)),
      datasets: [
        {
          label: 'Events / source',
          data: sourceInsights.map((item) => item.count),
          backgroundColor: sourceInsights.map(
            (_, index) => sourcePalette[index % sourcePalette.length]
          )
        }
      ]
    }),
    [sourceInsights]
  );

  const magChartData = useMemo(
    () => ({
      labels: analytics.byMagnitude.map((item) => item.label),
      datasets: [
        {
          label: 'Magnitude bins',
          data: analytics.byMagnitude.map((item) => item.count),
          backgroundColor: [
            '#69d7c6',
            '#66d67d',
            '#96cf51',
            '#c1c949',
            '#d5b34f',
            '#d38f45',
            '#d06633',
            '#ce3f21',
            '#c70f15',
            '#9f0010'
          ]
        }
      ]
    }),
    [analytics.byMagnitude]
  );

  const depthChartData = useMemo(
    () => ({
      labels: analytics.byDepth.map((item) => item.label),
      datasets: [
        {
          label: 'Depth classes',
          data: analytics.byDepth.map((item) => item.count),
          backgroundColor: ['#22c55e', '#f59e0b', '#ef4444']
        }
      ]
    }),
    [analytics.byDepth]
  );

  return (
    <aside
      className={cn(
        'flex h-[60vh] min-h-[440px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/92 shadow-lg backdrop-blur-sm transition-all duration-300 md:h-[68vh] lg:h-full',
        isOpen ? 'opacity-100' : 'pointer-events-none hidden opacity-0 lg:flex'
      )}>
      <div className="flex items-start justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <p className="font-heading text-lg font-semibold text-slate-900">
            Seismic Insights
          </p>
          <p className="text-xs text-slate-600">
            {formatCount(events.length)} filtered /{' '}
            {formatCount(allEventsCount)} total
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => downloadFilteredCSV(events)}
          disabled={!events.length}>
          <Download className="mr-1 h-4 w-4" /> CSV
        </Button>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2">
        <button
          type="button"
          className={getTabClassName(activeTab, 'overview')}
          onClick={() => setActiveTab('overview')}>
          Overview
        </button>
        <button
          type="button"
          className={getTabClassName(activeTab, 'trends')}
          onClick={() => setActiveTab('trends')}>
          Trends
        </button>
        <button
          type="button"
          className={getTabClassName(activeTab, 'events')}
          onClick={() => setActiveTab('events')}>
          Events
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden p-2.5">
        {activeTab === 'overview' ? (
          <div className="grid h-full min-h-0 grid-cols-1 gap-2 overflow-y-auto pr-1">
            <div className="grid grid-cols-3 gap-2">
              <Card>
                <CardContent className="p-2.5">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">
                    Avg Mag
                  </p>
                  <p className="mt-0.5 text-lg font-semibold text-slate-900">
                    {analytics.averageMagnitude.toFixed(2)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-2.5">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">
                    Min Mag
                  </p>
                  <p className="mt-0.5 text-lg font-semibold text-slate-900">
                    {analytics.minMagnitude.toFixed(2)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-2.5">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">
                    Max Mag
                  </p>
                  <p className="mt-0.5 text-lg font-semibold text-slate-900">
                    {analytics.maxMagnitude.toFixed(2)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Card>
                <CardContent className="p-2.5">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">
                    Deepest
                  </p>
                  <p className="mt-0.5 text-lg font-semibold text-slate-900">
                    {analytics.deepestKm.toFixed(1)}km
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-2.5">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">
                    Shallowest
                  </p>
                  <p className="mt-0.5 text-lg font-semibold text-slate-900">
                    {analytics.shallowestKm.toFixed(1)}km
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Card>
                <CardContent className="flex items-center gap-2 p-2.5">
                  <Waves className="h-4 w-4 text-cyan-700" />
                  <div>
                    <p className="text-xs text-slate-500">Tsunami</p>
                    <p className="font-semibold text-slate-900">
                      {analytics.tsunamiEvents}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-2 p-2.5">
                  <Radar className="h-4 w-4 text-emerald-700" />
                  <div>
                    <p className="text-xs text-slate-500">Significant</p>
                    <p className="font-semibold text-slate-900">
                      {analytics.significantEvents}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-2 p-2.5">
                  <Siren className="h-4 w-4 text-amber-700" />
                  <div>
                    <p className="text-xs text-slate-500">Alerts</p>
                    <p className="font-semibold text-slate-900">
                      {analytics.alertEvents}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-2 p-2.5">
                  <Zap className="h-4 w-4 text-purple-700" />
                  <div>
                    <p className="text-xs text-slate-500">Felt reports</p>
                    <p className="font-semibold text-slate-900">
                      {analytics.feltReportsTotal}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
              <Card>
                <CardHeader className="p-3 pb-1.5">
                  <CardTitle className="text-sm">Statistical profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 p-3 pt-0 text-xs text-slate-700">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">Median magnitude</span>
                    <span className="font-medium text-slate-900">
                      {statistics.medianMagnitude.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">Std. deviation</span>
                    <span className="font-medium text-slate-900">
                      {statistics.stdMagnitude.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">P90 magnitude</span>
                    <span className="font-medium text-slate-900">
                      {statistics.p90Magnitude.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">M≥5 event rate</span>
                    <span className="font-medium text-slate-900">
                      {statistics.strongEventRate.toFixed(1)}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-3 pb-1.5">
                  <CardTitle className="text-sm">Depth profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 p-3 pt-0 text-xs text-slate-700">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">Mean depth</span>
                    <span className="font-medium text-slate-900">
                      {statistics.meanDepth.toFixed(1)}km
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">Depth IQR</span>
                    <span className="font-medium text-slate-900">
                      {statistics.depthIqr.toFixed(1)}km
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">
                      Shallow share (&le;70km)
                    </span>
                    <span className="font-medium text-slate-900">
                      {statistics.shallowRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">
                      Depth-mag correlation
                    </span>
                    <span className="font-medium text-slate-900">
                      {statistics.depthMagCorrelation.toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-3 pb-1.5">
                  <CardTitle className="text-sm">Top regions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 p-3 pt-0">
                  {analytics.topRegions.slice(0, 6).map((region) => (
                    <div
                      key={region.region}
                      className="flex items-center justify-between rounded-md border border-slate-200 px-2 py-1.5 text-xs">
                      <span className="max-w-[72%] truncate text-slate-700">
                        {region.region}
                      </span>
                      <Badge variant="secondary">{region.count}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-3 pb-1.5">
                  <CardTitle className="text-sm">Feed metadata</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-xs text-slate-700 p-3 pt-0">
                  {metadataRows(metadata).map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">{label}</span>
                      <span className="text-right text-slate-900">{value}</span>
                    </div>
                  ))}
                  {metadata ? (
                    <a
                      href={metadata.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 pt-1 text-cyan-700 underline">
                      Open feed source <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-3 pb-1.5">
                  <CardTitle className="text-sm">Source analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 p-3 pt-0">
                  {sourceInsights.length ? (
                    sourceInsights.slice(0, 6).map((item) => (
                      <div
                        key={item.source}
                        className="rounded-md border border-slate-200 px-2 py-1.5 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-slate-900">
                            {formatSourceLabel(item.source)}
                          </span>
                          <Badge variant="secondary">{item.count}</Badge>
                        </div>
                        <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
                          <span>Avg M {item.averageMagnitude.toFixed(2)}</span>
                          <span>Avg depth {item.averageDepthKm.toFixed(1)}km</span>
                          <span>
                            Confidence {Math.round(item.averageConfidence)}/100
                          </span>
                          <span>
                            Tsunami {item.tsunamiEvents} | Sig{' '}
                            {item.significantEvents}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500">
                      No source-level analytics available for this filtered
                      view.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null}

        {activeTab === 'trends' ? (
          <div className="grid h-full min-h-0 grid-cols-1 gap-2 overflow-y-auto pr-1">
            {sourceInsights.length ? (
              <Card>
                <CardHeader className="p-3 pb-1.5">
                  <CardTitle className="inline-flex items-center gap-1.5 text-sm">
                    <TrendingUp className="h-4 w-4" /> Source contribution
                    (filtered)
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-44 pb-2.5 pt-0">
                  <Bar
                    data={sourceCountChartData}
                    options={{
                      ...chartOptions,
                      scales: {
                        ...chartOptions.scales,
                        y: {
                          ...chartOptions.scales.y,
                          beginAtZero: true
                        }
                      }
                    }}
                  />
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader className="p-3 pb-1.5">
                <CardTitle className="inline-flex items-center gap-1.5 text-sm">
                  <TrendingUp className="h-4 w-4" /> Daily magnitude profile
                  (avg/min/max)
                </CardTitle>
              </CardHeader>
              <CardContent className="h-48 pb-2.5 pt-0">
                <Line
                  data={magnitudeLineChartData}
                  options={{
                    ...chartOptions,
                    scales: {
                      ...chartOptions.scales,
                      y: {
                        ...chartOptions.scales.y,
                        suggestedMin: 0,
                        suggestedMax: 8
                      }
                    }
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-3 pb-1.5">
                <CardTitle className="inline-flex items-center gap-1.5 text-sm">
                  <TrendingUp className="h-4 w-4" /> Daily activity trend
                </CardTitle>
              </CardHeader>
              <CardContent className="h-44 pb-2.5 pt-0">
                <Bar data={dayChartData} options={chartOptions} />
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
              <Card>
                <CardHeader className="p-3 pb-1.5">
                  <CardTitle className="text-sm">Magnitude spread</CardTitle>
                </CardHeader>
                <CardContent className="h-52 pb-2.5 pt-0">
                  <Doughnut
                    data={magChartData}
                    options={{ responsive: true, maintainAspectRatio: false }}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="p-3 pb-1.5">
                  <CardTitle className="text-sm">Depth distribution</CardTitle>
                </CardHeader>
                <CardContent className="h-52 pb-2.5 pt-0">
                  <Doughnut
                    data={depthChartData}
                    options={{ responsive: true, maintainAspectRatio: false }}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null}

        {activeTab === 'events' ? (
          <div className="grid h-full min-h-0 grid-cols-1 gap-2 xl:grid-cols-[1.1fr_0.9fr]">
            <Card className="min-h-0">
              <CardHeader className="p-3 pb-1.5">
                <CardTitle className="text-sm">
                  Recent event navigator
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[calc(100%-3rem)] space-y-1.5 overflow-y-auto pb-2.5 pt-0">
                {events.slice(0, 50).map((event) => {
                  const depth = getDepthKm(event);
                  const isSelected = selectedEarthquakeId === event.id;

                  return (
                    <button
                      type="button"
                      key={event.id}
                      onClick={() => onSelectEarthquake(event)}
                      className={cn(
                        'w-full rounded-lg border px-2.5 py-1.5 text-left transition-colors',
                        isSelected
                          ? 'border-cyan-400 bg-cyan-50'
                          : 'border-slate-200 hover:bg-slate-50'
                      )}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="line-clamp-1 text-sm font-medium text-slate-900">
                          {event.properties.place}
                        </p>
                        <Badge
                          variant={
                            event.properties.tsunami === 1
                              ? 'warning'
                              : 'outline'
                          }>
                          M{getMagnitude(event).toFixed(1)}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                        <span>{extractRegion(event.properties.place)}</span>
                        <span>{formatHKT(event.properties.time)}</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Depth {depth.toFixed(1)}km | {getDepthCategory(depth)}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Source{' '}
                        {(event.properties.source ?? 'usgs').toUpperCase()} |
                        Confidence{' '}
                        {Math.round(event.properties.confidenceScore ?? 0)}/100
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="min-h-0">
              <CardHeader className="p-3 pb-1.5">
                <CardTitle className="text-sm">
                  Selected event details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 overflow-y-auto pb-2.5 pt-0 text-sm text-slate-700">
                {selectedEarthquake ? (
                  <>
                    <p className="font-medium text-slate-900">
                      {selectedEarthquake.properties.title}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <span>
                        Source:{' '}
                        {formatSourceLabel(
                          selectedEarthquake.properties.source ?? 'usgs'
                        )}
                      </span>
                      <span>
                        Confidence:{' '}
                        {Math.round(
                          selectedEarthquake.properties.confidenceScore ?? 0
                        )}
                        /100
                      </span>
                      <span>
                        Magnitude type: {selectedEarthquake.properties.magType}
                      </span>
                      <span>
                        Network: {selectedEarthquake.properties.net || 'N/A'}
                      </span>
                      <span>
                        Code: {selectedEarthquake.properties.code || 'N/A'}
                      </span>
                      <span>
                        Status: {selectedEarthquake.properties.status || 'N/A'}
                      </span>
                      <span>Sig: {selectedEarthquake.properties.sig}</span>
                      <span>
                        NST: {selectedEarthquake.properties.nst ?? 'N/A'}
                      </span>
                      <span>
                        CDI: {selectedEarthquake.properties.cdi ?? 'N/A'}
                      </span>
                      <span>
                        MMI: {selectedEarthquake.properties.mmi ?? 'N/A'}
                      </span>
                      <span>
                        RMS: {selectedEarthquake.properties.rms ?? 'N/A'}
                      </span>
                      <span>
                        Gap: {selectedEarthquake.properties.gap ?? 'N/A'}
                      </span>
                      <span>
                        DMin: {selectedEarthquake.properties.dmin ?? 'N/A'}
                      </span>
                      <span>
                        Updated:{' '}
                        {formatHKT(selectedEarthquake.properties.updated)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          window.open(
                            selectedEarthquake.properties.url,
                            '_blank'
                          )
                        }>
                        <ExternalLink className="mr-1 h-4 w-4" /> Source Page
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          const [longitude, latitude] =
                            selectedEarthquake.geometry.coordinates;
                          window.open(
                            `https://maps.google.com/maps?z=6&t=m&q=loc:${latitude}+${longitude}`,
                            '_blank'
                          );
                        }}>
                        <MapPinned className="mr-1 h-4 w-4" /> Google Maps
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-500">
                    Select an event from the left list to inspect full details.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
