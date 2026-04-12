import { EarthquakeFilters } from '../../types/earthquake';
import { Badge, Button, Input, Select } from '../ui';

interface NavbarProps {
  periodDays: number;
  filters: EarthquakeFilters;
  regionOptions: string[];
  onPeriodChange: (value: number) => void;
  onSearchChange: (value: string) => void;
  onRegionChange: (value: string) => void;
  onMinMagnitudeChange: (value: number) => void;
  onSortChange: (value: EarthquakeFilters['sortBy']) => void;
  onTsunamiToggle: () => void;
  onLegendToggle: () => void;
  onPanelToggle: () => void;
  totalEvents: number;
  filteredEvents: number;
}

const periods = [1, 3, 7, 14, 30, 45];

const formatCount = (value: unknown): string => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toLocaleString() : '0';
};

export default function Navbar({
  periodDays,
  filters,
  regionOptions,
  onPeriodChange,
  onSearchChange,
  onRegionChange,
  onMinMagnitudeChange,
  onSortChange,
  onTsunamiToggle,
  onLegendToggle,
  onPanelToggle,
  totalEvents,
  filteredEvents
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-[1000] border-b border-cyan-100/80 bg-white/92 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[2200px] flex-col gap-3 px-3 py-3 md:px-5 xl:px-6">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
          <div className="space-y-1">
            <p className="font-heading text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              Global Seismic Analysis Dashboard
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Total: {formatCount(totalEvents)}</Badge>
            <Badge variant="default">
              Visible: {formatCount(filteredEvents)}
            </Badge>
            {filters.tsunamiOnly && (
              <Badge variant="warning">Tsunami-only mode</Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          <Select
            aria-label="Time window"
            value={String(periodDays)}
            onChange={(event) => onPeriodChange(Number(event.target.value))}>
            {periods.map((day) => (
              <option key={day} value={day}>
                Last {day} {day === 1 ? 'day' : 'days'}
              </option>
            ))}
          </Select>

          <Input
            aria-label="Search by place"
            placeholder="Search location or title"
            value={filters.searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            className="xl:col-span-2"
          />

          <Select
            aria-label="Filter by region"
            value={filters.selectedRegion}
            onChange={(event) => onRegionChange(event.target.value)}>
            <option value="all">All regions</option>
            {regionOptions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </Select>

          <Select
            aria-label="Minimum magnitude"
            value={String(filters.minMagnitude)}
            onChange={(event) =>
              onMinMagnitudeChange(Number(event.target.value))
            }>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((value) => (
              <option key={value} value={value}>
                Min magnitude {value.toFixed(1)}
              </option>
            ))}
          </Select>

          <Select
            aria-label="Sort earthquakes"
            value={filters.sortBy}
            onChange={(event) =>
              onSortChange(event.target.value as EarthquakeFilters['sortBy'])
            }>
            <option value="latest">Sort: latest first</option>
            <option value="oldest">Sort: oldest first</option>
            <option value="strongest">Sort: strongest first</option>
            <option value="weakest">Sort: weakest first</option>
            <option value="deepest">Sort: deepest first</option>
            <option value="shallowest">Sort: shallowest first</option>
          </Select>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={filters.tsunamiOnly ? 'default' : 'secondary'}
            size="sm"
            onClick={onTsunamiToggle}>
            {filters.tsunamiOnly
              ? 'Disable Tsunami Filter'
              : 'Tsunami Events Only'}
          </Button>
          <Button variant="outline" size="sm" onClick={onLegendToggle}>
            Toggle Map Legend
          </Button>
          <Button variant="outline" size="sm" onClick={onPanelToggle}>
            Toggle Insights Panel
          </Button>
        </div>
      </div>
    </header>
  );
}
