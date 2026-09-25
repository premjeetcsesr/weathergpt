import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  MapPin, 
  Search, 
  X, 
  Check, 
  Building2, 
  Navigation, 
  Compass, 
  Globe2,
  ChevronRight
} from 'lucide-react';
import { searchLocations } from '../../services/weatherApi';
import { CITY_LOCALITIES_CATALOG, getStateForCity } from '../../data/indianLocations';

// Common popular Indian cities for quick switcher
const POPULAR_CITIES = ['Kanpur', 'Pune', 'Mumbai', 'Lucknow', 'Delhi', 'Noida', 'Bengaluru', 'Varanasi', 'Jaipur', 'Agra', 'Hyderabad', 'Kolkata'];

// Helper to generate realistic generic sectors for any other city
function getGenericCityLocalities(cityName) {
  const c = cityName || 'City';
  return [
    { name: `Civil Lines (${c})`, pincode: '', tag: 'City Center' },
    { name: `Station Road`, pincode: '', tag: 'Transit Area' },
    { name: `North ${c}`, pincode: '', tag: 'North Sector' },
    { name: `South ${c}`, pincode: '', tag: 'South Sector' },
    { name: `East ${c}`, pincode: '', tag: 'East Zone' },
    { name: `West ${c}`, pincode: '', tag: 'West Zone' },
    { name: `Main Market / Chowk`, pincode: '', tag: 'Commercial Hub' },
    { name: `Industrial Area`, pincode: '', tag: 'Industrial Corridor' }
  ];
}

export function AreaSelectorModal({ 
  isOpen, 
  onClose, 
  currentCity = 'Kanpur', 
  currentState = '',
  selectedArea = null, 
  onSelectArea,
  onSwitchCity
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [customResults, setCustomResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);

  // Clean and sanitize city name (remove ISP or reverse-lookup anomalies like "Alok Mishra")
  const sanitizedCity = useMemo(() => {
    let raw = (currentCity || 'Kanpur').trim();
    if (raw.toLowerCase().includes('alok mishra')) return 'Kanpur';
    return raw;
  }, [currentCity]);

  // Determine localities list based on current active city
  const cityKey = sanitizedCity.toLowerCase().replace(/[^a-z]/g, '');

  // Accurately resolve State for the active city (NEVER defaults blindly to Uttar Pradesh)
  const resolvedState = useMemo(() => {
    if (CITY_LOCALITIES_CATALOG[cityKey]?.state) {
      return CITY_LOCALITIES_CATALOG[cityKey].state;
    }
    const stateFromMap = getStateForCity(sanitizedCity);
    if (stateFromMap) return stateFromMap;
    if (currentState && currentState.toLowerCase() !== 'uttar pradesh') {
      return currentState;
    }
    if (sanitizedCity.toLowerCase() === 'kanpur' || sanitizedCity.toLowerCase() === 'lucknow') {
      return 'Uttar Pradesh';
    }
    return currentState || '';
  }, [cityKey, sanitizedCity, currentState]);
  
  const knownAreas = useMemo(() => {
    if (CITY_LOCALITIES_CATALOG[cityKey]?.localities) {
      return CITY_LOCALITIES_CATALOG[cityKey].localities;
    }
    
    // Check aliases
    for (const [key, val] of Object.entries(CITY_LOCALITIES_CATALOG)) {
      if (cityKey.includes(key) || key.includes(cityKey)) {
        return val.localities;
      }
    }

    // For any other town/city in India or world, generate localized sectors
    return getGenericCityLocalities(sanitizedCity);
  }, [cityKey, sanitizedCity]);

  // Filtered areas by search
  const filteredLocalities = useMemo(() => {
    if (!searchQuery.trim()) return knownAreas;
    const q = searchQuery.toLowerCase().trim();
    return knownAreas.filter(
      (a) => a.name.toLowerCase().includes(q) || (a.pincode && a.pincode.includes(q)) || a.tag.toLowerCase().includes(q)
    );
  }, [searchQuery, knownAreas]);

  // Handle dynamic custom search
  const handleSearchChange = async (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim().length >= 3 && filteredLocalities.length === 0) {
      setIsSearching(true);
      try {
        const results = await searchLocations(`${val}, ${sanitizedCity}`);
        setCustomResults(results);
      } catch {
        setCustomResults([]);
      } finally {
        setIsSearching(false);
      }
    } else {
      setCustomResults([]);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-start justify-center p-3 sm:p-4 pt-8 sm:pt-14 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-[#0c1527] text-white rounded-3xl border border-[#1a2c4e] shadow-2xl overflow-hidden flex flex-col max-h-[88vh] my-auto transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Location & Quick City Switcher */}
        <div className="p-4 sm:p-5 border-b border-[#1a2c4e] bg-[#0c1527]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Choose Specific Area</span>
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-sky-400 font-medium">
                    {sanitizedCity}{resolvedState ? `, ${resolvedState}` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCityPicker(!showCityPicker)}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                  >
                    {showCityPicker ? 'Close Cities' : 'Switch City ▾'}
                  </button>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Popular City Switcher Drawer */}
          {showCityPicker && (
            <div className="mt-3 pt-3 border-t border-[#1a2c4e] animate-fadeIn">
              <div className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center gap-1">
                <Globe2 className="w-3.5 h-3.5 text-sky-400" />
                <span>Select City to view its local areas:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_CITIES.map((c) => {
                  const isActive = sanitizedCity.toLowerCase() === c.toLowerCase();
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        if (onSwitchCity) onSwitchCity(c);
                        setShowCityPicker(false);
                        setSearchQuery('');
                      }}
                      className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-sky-500 text-white shadow-sm'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Search Bar Input */}
        <div className="p-3.5 border-b border-[#1a2c4e] bg-[#080d1a]/80">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder={`Search locality or postal code in ${sanitizedCity}...`}
              className="w-full pl-10 pr-9 py-2.5 bg-[#0c1527] border border-[#1a2c4e] rounded-2xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-400 transition-all"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Locality List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar min-h-[220px]">
          <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-sky-400" />
              <span>Localities in {sanitizedCity}</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {filteredLocalities.length} Areas Available
            </span>
          </div>

          {filteredLocalities.map((area) => {
            const isSelected = selectedArea?.name === area.name;
            return (
              <button
                key={(area.pincode || '') + area.name}
                type="button"
                onClick={() => {
                  onSelectArea({
                    ...area,
                    city: sanitizedCity,
                    state: resolvedState
                  });
                  if (onSwitchCity) {
                    onSwitchCity(sanitizedCity);
                  }
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-3 rounded-2xl text-left text-xs transition-all ${
                  isSelected
                    ? 'bg-sky-500/15 border border-sky-400/60 text-white shadow-sm'
                    : 'bg-[#080d1a]/60 hover:bg-[#111f38] border border-transparent text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${isSelected ? 'bg-sky-500/25 text-sky-300' : 'bg-slate-800 text-slate-400'}`}>
                    <Compass className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-semibold text-white flex items-center gap-2">
                      <span>{area.name}</span>
                      {area.pincode && (
                        <span className="text-[11px] font-mono text-sky-400 bg-sky-950/60 px-1.5 py-0.2 rounded border border-sky-800/40">
                          {area.pincode}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400">{area.tag}</span>
                  </div>
                </div>

                {isSelected ? (
                  <div className="flex items-center gap-1 text-sky-400 text-xs font-semibold px-2.5 py-1 rounded-lg bg-sky-500/10">
                    <Check className="w-3.5 h-3.5" />
                    <span>Selected</span>
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-400 hover:text-white flex items-center gap-0.5">
                    <span>Select</span>
                    <ChevronRight className="w-3 h-3" />
                  </span>
                )}
              </button>
            );
          })}

          {/* Custom Search Matches */}
          {customResults.length > 0 && (
            <div className="pt-2">
              <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">
                Geocoded Search Matches
              </div>
              {customResults.map((item, idx) => (
                <button
                  key={`${item.city}-${idx}`}
                  type="button"
                  onClick={() => {
                    const itemCity = item.city || sanitizedCity;
                    const itemState = item.state || getStateForCity(itemCity) || resolvedState;
                    onSelectArea({ 
                      name: item.city, 
                      pincode: '', 
                      tag: item.country || 'Location',
                      city: itemCity,
                      state: itemState
                    });
                    if (onSwitchCity) {
                      onSwitchCity(itemCity);
                    }
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl text-left text-xs bg-[#080d1a] hover:bg-[#111f38] text-white mb-1 border border-[#1a2c4e]"
                >
                  <div className="flex items-center gap-2">
                    <Navigation className="w-3.5 h-3.5 text-sky-400" />
                    <span>{item.city}</span>
                    <span className="text-slate-400">{item.state}</span>
                  </div>
                  <span className="text-sky-400 text-[11px]">Choose</span>
                </button>
              ))}
            </div>
          )}

          {filteredLocalities.length === 0 && customResults.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-xs">
              {isSearching ? 'Searching meteorological records...' : `No matching areas found for "${searchQuery}".`}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-[#080d1a] border-t border-[#1a2c4e] text-[11px] text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Hyper-local weather telemetry</span>
          </span>
          <button
            type="button"
            onClick={() => {
              onSelectArea(null);
              onClose();
            }}
            className="text-sky-400 hover:text-sky-300 font-medium hover:underline"
          >
            Reset to Entire City
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
