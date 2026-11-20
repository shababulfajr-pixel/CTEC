import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { Loader2, MapPin, Search } from 'lucide-react';
import type { RegionName } from '../types';

export interface SelectedHospitalPlace {
  name: string;
  placeId: string;
  address: string;
  province: string;
  region: RegionName;
  lat: number;
  lng: number;
  phone: string;
}

interface HospitalPlaceAutocompleteProps {
  onSelect: (place: SelectedHospitalPlace) => void;
  placeholder?: string;
}

export function inferProvinceAndRegion(address: string): {
  province: string;
  region: RegionName;
} {
  const addr = address || '';
  if (
    addr.includes('กรุงเทพ') ||
    addr.includes('Bangkok') ||
    addr.includes('นนทบุรี') ||
    addr.includes('ปทุมธานี') ||
    addr.includes('สมุทรปราการ') ||
    addr.includes('สมุทรสาคร') ||
    addr.includes('นครปฐม')
  ) {
    const prov = addr.includes('นนทบุรี')
      ? 'นนทบุรี'
      : addr.includes('ปทุมธานี')
        ? 'ปทุมธานี'
        : addr.includes('สมุทรปราการ')
          ? 'สมุทรปราการ'
          : 'กรุงเทพมหานคร';
    return { province: prov, region: 'กรุงเทพและปริมณฑล' };
  }
  if (addr.includes('เชียงใหม่') || addr.includes('Chiang Mai')) {
    return { province: 'เชียงใหม่', region: 'ภาคเหนือ' };
  }
  if (addr.includes('เชียงราย') || addr.includes('ลำปาง') || addr.includes('พิษณุโลก')) {
    return { province: 'ภาคเหนือ', region: 'ภาคเหนือ' };
  }
  if (addr.includes('ขอนแก่น') || addr.includes('Khon Kaen')) {
    return { province: 'ขอนแก่น', region: 'ภาคตะวันออกเฉียงเหนือ' };
  }
  if (
    addr.includes('นครราชสีมา') ||
    addr.includes('อุดรธานี') ||
    addr.includes('อุบลราชธานี')
  ) {
    return { province: 'ภาคตะวันออกเฉียงเหนือ', region: 'ภาคตะวันออกเฉียงเหนือ' };
  }
  if (addr.includes('ชลบุรี') || addr.includes('Chon Buri') || addr.includes('ระยอง')) {
    return {
      province: addr.includes('ระยอง') ? 'ระยอง' : 'ชลบุรี',
      region: 'ภาคตะวันออก',
    };
  }
  if (
    addr.includes('ภูเก็ต') ||
    addr.includes('Phuket') ||
    addr.includes('สงขลา') ||
    addr.includes('Songkhla') ||
    addr.includes('สุราษฎร์ธานี')
  ) {
    const prov = addr.includes('ภูเก็ต')
      ? 'ภูเก็ต'
      : addr.includes('สงขลา')
        ? 'สงขลา'
        : 'สุราษฎร์ธานี';
    return { province: prov, region: 'ภาคใต้' };
  }
  return { province: 'ประเทศไทย', region: 'ภาคกลาง' };
}

export const HospitalPlaceAutocomplete: React.FC<HospitalPlaceAutocompleteProps> = ({
  onSelect,
  placeholder = 'พิมพ์ชื่อโรงพยาบาลเพื่อค้นหาพิกัดจาก Google Maps...',
}) => {
  const placesLib = useMapsLibrary('places');
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<
    google.maps.places.AutocompleteSuggestion[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const sessionTokenRef =
    useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  useEffect(() => {
    if (!placesLib) return;
    const trimmed = inputValue.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        const { AutocompleteSessionToken, AutocompleteSuggestion } = placesLib;
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new AutocompleteSessionToken();
        }
        setLoading(true);
        const res = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: trimmed,
          sessionToken: sessionTokenRef.current,
          includedRegionCodes: ['th'],
          includedPrimaryTypes: ['hospital', 'medical_clinic', 'doctor'],
          language: 'th',
        });
        setSuggestions(res.suggestions || []);
        setOpen(true);
      } catch (err) {
        const msg = String(err);
        if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('OVER_QUERY_LIMIT') || msg.includes('429')) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => window.clearTimeout(timer);
  }, [placesLib, inputValue]);

  const handleSelect = useCallback(
    async (suggestion: google.maps.places.AutocompleteSuggestion) => {
      if (!placesLib || !suggestion.placePrediction) return;
      try {
        setLoading(true);
        const place = suggestion.placePrediction.toPlace();
        await place.fetchFields({
          fields: ['id', 'displayName', 'formattedAddress', 'location'],
        });

        const lat = place.location?.lat();
        const lng = place.location?.lng();
        const name = place.displayName || suggestion.placePrediction.text.text || '';
        const address = place.formattedAddress || '';
        const { province, region } = inferProvinceAndRegion(address);

        if (typeof lat === 'number' && typeof lng === 'number') {
          onSelect({
            name,
            placeId: place.id || '',
            address,
            province,
            region,
            lat,
            lng,
            phone: '',
          });
        }
        setInputValue(name);
        setOpen(false);
        setSuggestions([]);
        sessionTokenRef.current = null;
      } catch (err) {
        const msg = String(err);
        if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('OVER_QUERY_LIMIT') || msg.includes('429')) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
      } finally {
        setLoading(false);
      }
    },
    [placesLib, onSelect]
  );

  return (
    <div className="relative">
      <div className="relative">
        <Search className="w-4 h-4 text-[#aa897f] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="w-full h-10 pl-9 pr-9 text-sm rounded-xl glass-input"
        />
        {loading && (
          <Loader2 className="w-4 h-4 text-[#ffb59d] animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-40 mt-1.5 w-full bg-[#181b25]/95 backdrop-blur-2xl border border-white/[0.12] rounded-xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-white/[0.06]">
          {suggestions.map((item, idx) => (
            <li key={item.placePrediction?.placeId || idx}>
              <button
                type="button"
                onClick={() => void handleSelect(item)}
                className="w-full text-left px-3.5 py-2.5 hover:bg-white/[0.06] flex items-start gap-2.5 transition-colors cursor-pointer"
              >
                <MapPin className="w-4 h-4 text-[#ff5e1e] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white truncate">
                    {item.placePrediction?.mainText?.text || item.placePrediction?.text.text}
                  </div>
                  {item.placePrediction?.secondaryText?.text && (
                    <div className="text-xs text-[#aa897f] truncate">
                      {item.placePrediction.secondaryText.text}
                    </div>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
