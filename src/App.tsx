import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Component, ErrorInfo, ReactNode, useEffect, useMemo } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

import { getEarthquakes } from './api/earthquakes';
import { LatestEarthquakes, Map, Navbar } from './components';
import {
  createEarthquakeAnalytics,
  extractRegion,
  filterAndSortEarthquakes,
  toISODateNDaysAgo,
  toISODateNow
} from './lib/earthquake';
import { useStore } from './hooks';
import queryClient from './queryClient';
import { EarthquakeFeature, EarthquakeFilters } from './types/earthquake';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppErrorBoundary>
        <AppContent />
      </AppErrorBoundary>
    </QueryClientProvider>
  );
}

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'Unknown runtime error'
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Keep this for debugging in browser console when runtime crashes happen.
    // eslint-disable-next-line no-console
    console.error('Runtime render error:', error, errorInfo);
  }

  render() {
    const { hasError, message } = this.state;
    const { children } = this.props;

    if (hasError) {
      return (
        <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900">
          <h1 className="font-heading text-2xl font-semibold">
            App Runtime Error
          </h1>
          <p className="mt-2 text-sm">
            A component crashed during rendering. Reload the page after this
            fix, and if this persists, share this message:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-md bg-red-100 p-3 text-xs">
            {message}
          </pre>
        </div>
      );
    }

    return children;
  }
}

function AppContent() {
  const periodDays = useStore((state) => state.periodDays);
  const searchQuery = useStore((state) => state.searchQuery);
  const selectedRegion = useStore((state) => state.selectedRegion);
  const minMagnitude = useStore((state) => state.minMagnitude);
  const tsunamiOnly = useStore((state) => state.tsunamiOnly);
  const sortBy = useStore((state) => state.sortBy);
  const showLegend = useStore((state) => state.showLegend);
  const selectedEarthquakeId = useStore((state) => state.selectedEarthquakeId);
  const insightsOpen = useStore((state) => state.insightsOpen);

  const setPeriodDays = useStore((state) => state.setPeriodDays);
  const setSearchQuery = useStore((state) => state.setSearchQuery);
  const setSelectedRegion = useStore((state) => state.setSelectedRegion);
  const setMinMagnitude = useStore((state) => state.setMinMagnitude);
  const setSortBy = useStore((state) => state.setSortBy);
  const setShowLegend = useStore((state) => state.setShowLegend);
  const setTsunamiOnly = useStore((state) => state.setTsunamiOnly);
  const setSelectedEarthquakeId = useStore(
    (state) => state.setSelectedEarthquakeId
  );
  const setInsightsOpen = useStore((state) => state.setInsightsOpen);

  const filters: EarthquakeFilters = {
    searchQuery,
    selectedRegion,
    minMagnitude,
    tsunamiOnly,
    sortBy
  };

  const {
    data: feed,
    isLoading,
    isError,
    error,
    isFetching
  } = useQuery({
    queryKey: ['earthquakes', periodDays],
    queryFn: () =>
      getEarthquakes({
        startTime: toISODateNDaysAgo(periodDays),
        endTime: toISODateNow(),
        minMagnitude: 0
      })
  });

  const allEvents = useMemo(() => feed?.features ?? [], [feed]);

  const regionOptions = useMemo(() => {
    const regions = new Set<string>();
    allEvents.forEach((feature) =>
      regions.add(extractRegion(feature.properties.place))
    );
    return Array.from(regions).sort((a, b) => a.localeCompare(b));
  }, [allEvents]);

  const filteredEvents = useMemo(
    () => filterAndSortEarthquakes(allEvents, filters),
    [allEvents, filters]
  );

  const analytics = useMemo(
    () => createEarthquakeAnalytics(filteredEvents),
    [filteredEvents]
  );

  useEffect(() => {
    if (!filteredEvents.length) {
      if (selectedEarthquakeId !== null) setSelectedEarthquakeId(null);
      return;
    }

    const hasSelected = filteredEvents.some(
      (item) => item.id === selectedEarthquakeId
    );

    if (!selectedEarthquakeId || !hasSelected) {
      setSelectedEarthquakeId(filteredEvents[0].id);
    }
  }, [filteredEvents, selectedEarthquakeId, setSelectedEarthquakeId]);

  const handleSelectEarthquake = (feature: EarthquakeFeature) => {
    setSelectedEarthquakeId(feature.id);
  };

  return (
    <div className="min-h-screen pb-6">
      <Navbar
        periodDays={periodDays}
        filters={filters}
        regionOptions={regionOptions}
        onPeriodChange={setPeriodDays}
        onSearchChange={setSearchQuery}
        onRegionChange={setSelectedRegion}
        onMinMagnitudeChange={setMinMagnitude}
        onSortChange={setSortBy}
        onTsunamiToggle={() => setTsunamiOnly(!tsunamiOnly)}
        onLegendToggle={() => setShowLegend(!showLegend)}
        onPanelToggle={() => setInsightsOpen(!insightsOpen)}
        totalEvents={allEvents.length}
        filteredEvents={filteredEvents.length}
      />

      <main className="mx-auto mt-4 grid w-full max-w-[2200px] grid-cols-1 gap-4 px-3 md:px-5 lg:h-[calc(100vh-12.5rem)] lg:grid-cols-[minmax(0,1.7fr)_minmax(430px,1fr)] lg:gap-5 xl:px-6">
        <section className="flex min-h-0 flex-col gap-3">
          {isFetching && !isLoading ? (
            <div className="inline-flex items-center gap-2 rounded-md border border-cyan-200 bg-cyan-50 px-3 py-1 text-sm text-cyan-700">
              <Loader2 className="h-4 w-4 animate-spin" /> Updating feed...
            </div>
          ) : null}

          {isLoading ? (
            <div className="flex h-[56vh] items-center justify-center rounded-2xl border border-slate-200 bg-white/80">
              <p className="inline-flex items-center gap-2 text-slate-700">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading
                earthquakes...
              </p>
            </div>
          ) : null}

          {isError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
              <p className="inline-flex items-center gap-2 font-medium">
                <AlertTriangle className="h-5 w-5" /> Failed to load data from
                earthquake providers
              </p>
              <p className="mt-2 text-sm">{(error as Error).message}</p>
            </div>
          ) : null}

          {!isLoading && !isError ? (
            <AppErrorBoundary>
              <Map
                events={filteredEvents}
                selectedEarthquakeId={selectedEarthquakeId}
                onSelectEarthquake={handleSelectEarthquake}
                showLegend={showLegend}
              />
            </AppErrorBoundary>
          ) : null}
        </section>

        <AppErrorBoundary>
          <LatestEarthquakes
            isOpen={insightsOpen}
            metadata={feed?.metadata ?? null}
            events={filteredEvents}
            allEventsCount={allEvents.length}
            analytics={analytics}
            selectedEarthquakeId={selectedEarthquakeId}
            onSelectEarthquake={handleSelectEarthquake}
          />
        </AppErrorBoundary>
      </main>
    </div>
  );
}
