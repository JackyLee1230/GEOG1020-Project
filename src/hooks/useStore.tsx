import create from 'zustand';
import { devtools } from 'zustand/middleware';
import { EarthquakeSort } from '../types/earthquake';

interface Store {
  periodDays: number;
  searchQuery: string;
  selectedRegion: string;
  minMagnitude: number;
  tsunamiOnly: boolean;
  sortBy: EarthquakeSort;
  showLegend: boolean;
  selectedEarthquakeId: string | null;
  insightsOpen: boolean;
  setPeriodDays: (days: number) => void;
  setSearchQuery: (query: string) => void;
  setSelectedRegion: (region: string) => void;
  setMinMagnitude: (magnitude: number) => void;
  setTsunamiOnly: (enabled: boolean) => void;
  setSortBy: (sort: EarthquakeSort) => void;
  setShowLegend: (show: boolean) => void;
  setSelectedEarthquakeId: (id: string | null) => void;
  setInsightsOpen: (open: boolean) => void;
}

const useStore = create<Store>()(
  devtools((set) => ({
    periodDays: 7,
    searchQuery: '',
    selectedRegion: 'all',
    minMagnitude: 0,
    tsunamiOnly: false,
    sortBy: 'latest',
    showLegend: true,
    selectedEarthquakeId: null,
    insightsOpen: true,
    setPeriodDays: (periodDays) => set((state) => ({ ...state, periodDays })),
    setSearchQuery: (searchQuery) =>
      set((state) => ({ ...state, searchQuery })),
    setSelectedRegion: (selectedRegion) =>
      set((state) => ({ ...state, selectedRegion })),
    setMinMagnitude: (minMagnitude) =>
      set((state) => ({ ...state, minMagnitude })),
    setTsunamiOnly: (tsunamiOnly) =>
      set((state) => ({ ...state, tsunamiOnly })),
    setSortBy: (sortBy) => set((state) => ({ ...state, sortBy })),
    setShowLegend: (showLegend) => set((state) => ({ ...state, showLegend })),
    setSelectedEarthquakeId: (selectedEarthquakeId) =>
      set((state) => ({ ...state, selectedEarthquakeId })),
    setInsightsOpen: (insightsOpen) =>
      set((state) => ({ ...state, insightsOpen }))
  }))
);

export default useStore;
