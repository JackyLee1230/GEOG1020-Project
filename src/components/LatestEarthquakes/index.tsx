import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import { useQuery } from '@tanstack/react-query';
import { getEarthquakes } from '../../api/earthquakes';
import { useStore } from '../../hooks';
import { FeatureProps } from '../Map/Earthquakes';

const Panel = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 64px;
  right: ${({ isOpen }) => (isOpen ? '0' : '-400px')};
  width: 400px;
  max-width: 90vw;
  height: calc(100vh - 64px);
  background: white;
  box-shadow: -2px 0 10px rgba(0, 0, 0, 0.3);
  transition: right 0.3s ease-in-out;
  z-index: 1000;
  overflow-y: auto;

  @media only screen and (max-width: 768px) {
    width: 100%;
    right: ${({ isOpen }) => (isOpen ? '0' : '-100%')};
  }
`;

const ToggleButton = styled.button<{ isOpen: boolean }>`
  position: fixed;
  top: 80px;
  right: ${({ isOpen }) => (isOpen ? '400px' : '10px')};
  z-index: 1001;
  background: #007bff;
  color: white;
  border: none;
  padding: 12px 16px;
  border-radius: 4px;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  font-weight: bold;
  transition: right 0.3s ease-in-out;

  &:hover {
    background: #0056b3;
  }

  @media only screen and (max-width: 768px) {
    right: 10px;
    top: 70px;
    padding: 8px 12px;
    font-size: 12px;
  }
`;

const Header = styled.div`
  padding: 20px;
  background: #007bff;
  color: white;
  font-size: 20px;
  font-weight: bold;
  position: sticky;
  top: 0;
  z-index: 10;

  @media only screen and (max-width: 768px) {
    padding: 15px;
    font-size: 16px;
  }
`;

const EarthquakeItem = styled.div`
  padding: 15px;
  border-bottom: 1px solid #e0e0e0;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #f5f5f5;
  }

  @media only screen and (max-width: 768px) {
    padding: 12px;
  }
`;

const Title = styled.div`
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 8px;
  color: #333;

  @media only screen and (max-width: 768px) {
    font-size: 13px;
  }
`;

const Detail = styled.div`
  font-size: 12px;
  color: #666;
  margin: 4px 0;

  @media only screen and (max-width: 768px) {
    font-size: 11px;
  }
`;

const MagnitudeBadge = styled.span<{ magnitude: number }>`
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: bold;
  font-size: 12px;
  background: ${({ magnitude }) => {
    if (magnitude < 3) return '#6FCCB4';
    if (magnitude < 5) return '#C2CC49';
    if (magnitude < 7) return '#C6652B';
    return '#CC0103';
  }};
  color: white;
  margin-right: 8px;
`;

const NoData = styled.div`
  padding: 40px 20px;
  text-align: center;
  color: #999;
  font-size: 14px;
`;

const FilterContainer = styled.div`
  padding: 15px;
  background: #f8f9fa;
  border-bottom: 2px solid #dee2e6;
  position: sticky;
  top: 84px;
  z-index: 9;

  @media only screen and (max-width: 768px) {
    padding: 12px;
    top: 74px;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
  margin-bottom: 10px;

  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
  }

  @media only screen and (max-width: 768px) {
    padding: 8px 10px;
    font-size: 13px;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
  background: white;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
  }

  @media only screen and (max-width: 768px) {
    padding: 8px 10px;
    font-size: 13px;
  }
`;

const FilterInfo = styled.div`
  font-size: 12px;
  color: #6c757d;
  margin-top: 8px;
  text-align: center;

  @media only screen and (max-width: 768px) {
    font-size: 11px;
  }
`;

const USGSButton = styled.button`
  background: #17a2b8;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: bold;
  cursor: pointer;
  margin-top: 8px;
  transition: background 0.2s;

  &:hover {
    background: #138496;
  }

  @media only screen and (max-width: 768px) {
    padding: 5px 10px;
    font-size: 10px;
  }
`;

const timeConverterToHKT = (time: number): string => {
  const d = new Date(time);
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const nd = new Date(utc + 3600000 * 8);
  return nd.toLocaleString();
};

export default function LatestEarthquakes() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const startTime = useStore((state) => state.startTime);
  const setData = useStore((state) => state.setData);

  const { data: earthquakes } = useQuery(['earthquakes', startTime, ''], () =>
    getEarthquakes(startTime, setData)
  );

  const latestEarthquakes = earthquakes?.features
    ? [...earthquakes.features]
        .sort(
          (a: FeatureProps, b: FeatureProps) =>
            b.properties.time - a.properties.time
        )
        .slice(0, 200)
    : [];

  // Extract unique locations from earthquakes
  const uniqueLocations = useMemo(() => {
    const locations = new Set<string>();
    latestEarthquakes.forEach((eq: FeatureProps) => {
      const place = eq.properties.place || 'Unknown Location';
      // Extract the main location (usually after the last comma)
      const parts = place.split(',');
      const mainLocation =
        parts.length > 1 ? parts[parts.length - 1].trim() : place.trim();
      locations.add(mainLocation);
    });
    return Array.from(locations).sort();
  }, [latestEarthquakes]);

  // Filter earthquakes based on search query and selected location
  const filteredEarthquakes = useMemo(() => {
    return latestEarthquakes.filter((eq: FeatureProps) => {
      const place = (eq.properties.place || 'Unknown Location').toLowerCase();
      const matchesSearch =
        searchQuery === '' || place.includes(searchQuery.toLowerCase());

      if (selectedLocation === 'all') {
        return matchesSearch;
      }

      const parts = eq.properties.place?.split(',') || [];
      const mainLocation =
        parts.length > 1
          ? parts[parts.length - 1].trim()
          : eq.properties.place?.trim() || 'Unknown Location';
      const matchesLocation = mainLocation === selectedLocation;

      return matchesSearch && matchesLocation;
    });
  }, [latestEarthquakes, searchQuery, selectedLocation]);

  const handleEarthquakeClick = (
    earthquake: FeatureProps,
    e: React.MouseEvent
  ) => {
    // Don't trigger if clicking the USGS button
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }

    const {
      geometry: { coordinates }
    } = earthquake;

    // Store the selected coordinates in global state
    const map = (window as any).leafletMap;
    if (map) {
      map.setView([coordinates[1], coordinates[0]], 8);
      // Find and open the popup for this earthquake
      setTimeout(() => {
        map.eachLayer((layer: any) => {
          if (
            layer.feature &&
            layer.feature.geometry.coordinates[0] === coordinates[0] &&
            layer.feature.geometry.coordinates[1] === coordinates[1] &&
            layer.feature.properties.time === earthquake.properties.time
          ) {
            layer.openPopup();
          }
        });
      }, 300);
    }
  };

  const handleUSGSClick = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(url, '_blank');
  };

  return (
    <>
      <ToggleButton
        isOpen={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        style={{ marginTop: '2%' }}>
        {isOpen ? '✕ Close' : '📋 Latest'}
      </ToggleButton>

      <Panel isOpen={isOpen}>
        <Header>
          Latest Earthquakes
          <div
            style={{
              fontSize: '14px',
              fontWeight: 'normal',
              marginTop: '5px'
            }}>
            {filteredEarthquakes.length} of {latestEarthquakes.length}{' '}
            earthquakes
          </div>
        </Header>

        <FilterContainer>
          <SearchInput
            type="text"
            placeholder="Search by location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}>
            <option value="all">All Locations</option>
            {uniqueLocations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </Select>
          {(searchQuery || selectedLocation !== 'all') && (
            <FilterInfo>
              {filteredEarthquakes.length} result
              {filteredEarthquakes.length !== 1 ? 's' : ''} found
            </FilterInfo>
          )}
        </FilterContainer>

        {filteredEarthquakes.length === 0 ? (
          <NoData>
            {latestEarthquakes.length === 0
              ? 'No earthquake data available'
              : 'No earthquakes match your search criteria'}
          </NoData>
        ) : (
          filteredEarthquakes.map((earthquake: FeatureProps) => {
            const { properties, geometry } = earthquake;
            return (
              <EarthquakeItem
                key={`${properties.time}-${geometry.coordinates[0]}-${geometry.coordinates[1]}`}
                onClick={(e) => handleEarthquakeClick(earthquake, e)}>
                <Title>
                  <MagnitudeBadge magnitude={properties.mag}>
                    M{properties.mag.toFixed(1)}
                  </MagnitudeBadge>
                  {properties.place || 'Unknown Location'}
                </Title>
                <Detail>
                  <strong>Time:</strong> {timeConverterToHKT(properties.time)}
                </Detail>
                <Detail>
                  <strong>Depth:</strong> {geometry.coordinates[2].toFixed(1)}{' '}
                  km
                </Detail>
                <Detail>
                  <strong>Coordinates:</strong>{' '}
                  {geometry.coordinates[1].toFixed(3)},{' '}
                  {geometry.coordinates[0].toFixed(3)}
                </Detail>
                <USGSButton onClick={(e) => handleUSGSClick(properties.url, e)}>
                  📊 View USGS Details
                </USGSButton>
              </EarthquakeItem>
            );
          })
        )}
      </Panel>
    </>
  );
}
