import React, { useMemo, useState } from 'react';
import { Building2, MapPin, Search, X } from 'lucide-react';
import {
  normalizeHospitalNameKey,
  THAILAND_HOSPITALS_CATALOG,
  type ThailandHospitalEntry,
} from '../data/thailandHospitalsCatalog';
import type { HospitalType, RegionName } from '../types';

export interface SelectedHospitalPlace {
  name: string;
  placeId: string;
  address: string;
  province: string;
  region: RegionName;
  lat: number;
  lng: number;
  phone: string;
  hospitalType?: HospitalType;
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
          : addr.includes('สมุทรสาคร')
            ? 'สมุทรสาคร'
            : addr.includes('นครปฐม')
              ? 'นครปฐม'
              : 'กรุงเทพมหานคร';
    return { province: prov, region: 'กรุงเทพและปริมณฑล' };
  }
  if (addr.includes('เชียงใหม่') || addr.includes('Chiang Mai')) {
    return { province: 'เชียงใหม่', region: 'ภาคเหนือ' };
  }
  if (addr.includes('เชียงราย') || addr.includes('ลำปาง') || addr.includes('น่าน') || addr.includes('พะเยา')) {
    return { province: 'ภาคเหนือ', region: 'ภาคเหนือ' };
  }
  if (addr.includes('ขอนแก่น') || addr.includes('Khon Kaen')) {
    return { province: 'ขอนแก่น', region: 'ภาคตะวันออกเฉียงเหนือ' };
  }
  if (
    addr.includes('นครราชสีมา') ||
    addr.includes('อุดรธานี') ||
    addr.includes('อุบลราชธานี') ||
    addr.includes('บุรีรัมย์')
  ) {
    return { province: 'ภาคตะวันออกเฉียงเหนือ', region: 'ภาคตะวันออกเฉียงเหนือ' };
  }
  if (addr.includes('ชลบุรี') || addr.includes('Chon Buri') || addr.includes('ระยอง') || addr.includes('จันทบุรี')) {
    return {
      province: addr.includes('ระยอง') ? 'ระยอง' : addr.includes('จันทบุรี') ? 'จันทบุรี' : 'ชลบุรี',
      region: 'ภาคตะวันออก',
    };
  }
  if (
    addr.includes('ภูเก็ต') ||
    addr.includes('Phuket') ||
    addr.includes('สงขลา') ||
    addr.includes('Songkhla') ||
    addr.includes('สุราษฎร์ธานี') ||
    addr.includes('นครศรีธรรมราช')
  ) {
    const prov = addr.includes('ภูเก็ต')
      ? 'ภูเก็ต'
      : addr.includes('สงขลา')
        ? 'สงขลา'
        : addr.includes('นครศรีธรรมราช')
          ? 'นครศรีธรรมราช'
          : 'สุราษฎร์ธานี';
    return { province: prov, region: 'ภาคใต้' };
  }
  return { province: 'ประเทศไทย', region: 'ภาคกลาง' };
}

export const HospitalPlaceAutocomplete: React.FC<HospitalPlaceAutocompleteProps> = ({
  onSelect,
  placeholder = 'พิมพ์ชื่อโรงพยาบาลหรือจังหวัด (ค้นหาออฟไลน์ครบ 77 จังหวัด)...',
}) => {
  const [inputValue, setInputValue] = useState('');
  const [open, setOpen] = useState(false);

  const suggestions = useMemo(() => {
    const trimmed = inputValue.trim().toLowerCase();
    if (!trimmed) return THAILAND_HOSPITALS_CATALOG.slice(0, 8);
    const norm = normalizeHospitalNameKey(trimmed);

    return THAILAND_HOSPITALS_CATALOG.filter((item) => {
      if (item.name.toLowerCase().includes(trimmed)) return true;
      if (item.province.toLowerCase().includes(trimmed)) return true;
      if (item.region.toLowerCase().includes(trimmed)) return true;
      if (item.hospitalType.toLowerCase().includes(trimmed)) return true;
      if (item.aliases?.some((a) => a.toLowerCase().includes(trimmed))) return true;
      if (norm.length >= 2 && normalizeHospitalNameKey(item.name).includes(norm)) return true;
      return false;
    }).slice(0, 12);
  }, [inputValue]);

  const handleSelect = (item: ThailandHospitalEntry) => {
    onSelect({
      name: item.name,
      placeId: item.id,
      address: item.address,
      province: item.province,
      region: item.region,
      lat: item.lat,
      lng: item.lng,
      phone: '',
      hospitalType: item.hospitalType,
    });
    setInputValue(item.name);
    setOpen(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="w-4 h-4 text-[#aa897f] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full h-10 pl-9 pr-9 text-sm rounded-xl glass-input"
        />
        {inputValue && (
          <button
            type="button"
            onClick={() => {
              setInputValue('');
              setOpen(false);
            }}
            aria-label="ล้างคำค้นหาโรงพยาบาล"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#aa897f] hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-40 mt-1.5 w-full bg-[#151924]/98 backdrop-blur-2xl border border-white/[0.12] rounded-xl shadow-2xl max-h-64 overflow-y-auto divide-y divide-white/[0.06]">
          {suggestions.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => handleSelect(item)}
                className="w-full text-left px-3.5 py-2.5 hover:bg-white/[0.06] flex items-start gap-2.5 transition-colors cursor-pointer"
              >
                <MapPin className="w-4 h-4 text-[#ff5e1e] shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-white truncate">{item.name}</div>
                  <div className="text-xs text-[#aa897f] truncate mt-0.5">
                    {item.province} · {item.region} · {item.hospitalType}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && inputValue.trim().length > 0 && suggestions.length === 0 && (
        <div className="absolute z-40 mt-1.5 w-full bg-[#151924]/98 backdrop-blur-2xl border border-white/[0.12] rounded-xl p-3 text-xs text-[#B5BDCB] flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#8E97AB] shrink-0" />
          <span>ไม่พบในรายชื่อด่วน สามารถกรอกชื่อโรงพยาบาลด้านล่างได้ทันที</span>
        </div>
      )}
    </div>
  );
};
