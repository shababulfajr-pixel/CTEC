import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  useAdvancedMarkerRef,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  Building2,
  Download,
  Flame,
  Loader2,
  MapPin,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react';
import { CTEC_REFERENCE_HOTSPOTS } from '../data/ctecReferenceData';
import {
  formatCurrency,
  getDensityLevel,
  getDensityMeta,
  HOSPITAL_STATUS_LABEL,
  type DensityLevel,
  type Hospital,
  type HospitalType,
  type UserProfile,
} from '../types';
import { getFriendlyFirestoreError } from '../firebase';
import { createHospital } from '../services/crmService';
import { inferProvinceAndRegion } from './HospitalPlaceAutocomplete';

interface DiscoveredHospital {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone: string;
}

interface HospitalMapViewProps {
  hospitals: Hospital[];
  currentUser: UserProfile;
  focusedHospitalId: string | null;
  hasMapsKey: boolean;
  mapsErrorCode?: string | null;
  onSelectAddDeal: (hospital: Hospital) => void;
  onSelectAddHospital: () => void;
  onNotifyToast: (msg: string) => void;
}

interface DensityMarkerProps {
  hospital: Hospital;
  viewMode: 'density' | 'status';
  isSelected: boolean;
  onSelect: (id: string | null) => void;
  onAddDeal: (hospital: Hospital) => void;
}

const HospitalDensityMarker: React.FC<DensityMarkerProps> = ({
  hospital,
  viewMode,
  isSelected,
  onSelect,
  onAddDeal,
}) => {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const density = getDensityMeta(hospital.caseCount);

  const haloSize =
    hospital.caseCount >= 120
      ? 116
      : density.level === 'high'
        ? Math.min(104, 68 + Math.round(hospital.caseCount * 0.45))
        : density.level === 'medium'
          ? 56
          : density.level === 'low'
            ? 40
            : 28;

  const coreSize =
    hospital.caseCount >= 120
      ? 40
      : density.level === 'high'
        ? 34
        : density.level === 'medium'
          ? 30
          : density.level === 'low'
            ? 26
            : 22;

  const haloGradient =
    hospital.caseCount >= 120
      ? 'radial-gradient(circle, rgba(255,94,30,0.55) 0%, rgba(255,94,30,0.22) 52%, rgba(255,94,30,0) 76%)'
      : density.level === 'high'
        ? 'radial-gradient(circle, rgba(255,170,0,0.48) 0%, rgba(255,170,0,0.18) 55%, rgba(255,170,0,0) 75%)'
        : density.level === 'medium'
          ? 'radial-gradient(circle, rgba(238,192,88,0.40) 0%, rgba(238,192,88,0.14) 55%, rgba(238,192,88,0) 75%)'
          : density.level === 'low'
            ? 'radial-gradient(circle, rgba(52,211,153,0.34) 0%, rgba(52,211,153,0.12) 55%, rgba(52,211,153,0) 75%)'
            : 'radial-gradient(circle, rgba(148,163,184,0.22) 0%, rgba(148,163,184,0) 70%)';

  const statusColor =
    hospital.status === 'high_priority'
      ? '#FF5E1E'
      : hospital.status === 'active'
        ? '#FFAA00'
        : hospital.status === 'prospect'
          ? '#38BDF8'
          : '#64748B';

  const coreColor = viewMode === 'density' ? density.color : statusColor;

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: hospital.lat, lng: hospital.lng }}
        onClick={() => onSelect(isSelected ? null : hospital.id)}
        title={`${hospital.name} (${hospital.caseCount} เคส)`}
        zIndex={isSelected ? 500 : Math.min(400, 10 + hospital.caseCount)}
      >
        <div
          className="relative flex items-center justify-center cursor-pointer select-none"
          style={{ width: haloSize, height: haloSize }}
        >
          {viewMode === 'density' && (
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{ background: haloGradient }}
            />
          )}
          <div
            className="relative flex items-center justify-center rounded-full text-white font-mono tabular-nums font-bold shadow-lg transition-transform hover:scale-110"
            style={{
              width: coreSize,
              height: coreSize,
              backgroundColor: coreColor,
              border: isSelected ? '3px solid #0f131c' : '2px solid #ffffff',
              fontSize: coreSize >= 34 ? '12px' : '11px',
            }}
          >
            {hospital.caseCount}
          </div>
        </div>
      </AdvancedMarker>

      {isSelected && marker && (
        <InfoWindow
          anchor={marker}
          onCloseClick={() => onSelect(null)}
          maxWidth={300}
        >
          <div className="p-1.5 text-slate-900 space-y-2.5 min-w-[230px]">
            <div>
              <div className="text-[11px] text-slate-500">
                {hospital.hospitalType} · {hospital.province || hospital.region}
              </div>
              <h3 className="text-sm font-bold text-slate-900 leading-snug mt-0.5">
                {hospital.name}
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2 py-2 border-y border-slate-100">
              <div>
                <div className="text-[11px] text-slate-500">จำนวนเคสสะสม</div>
                <div
                  className="text-base font-bold font-mono tabular-nums"
                  style={{ color: density.color }}
                >
                  {hospital.caseCount.toLocaleString('th-TH')} เคส
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">ยอดขายสะสม</div>
                <div className="text-sm font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                  {formatCurrency(hospital.totalRevenue)}
                </div>
              </div>
            </div>

            <div className="space-y-1 text-xs text-slate-600">
              <div>
                <span className="text-slate-400">ระดับความหนาแน่น:</span>{' '}
                <span className="font-semibold" style={{ color: density.color }}>
                  {density.tierCode}
                </span>
              </div>
              <div>
                <span className="text-slate-400">สถานะ:</span>{' '}
                <span className="text-slate-800">
                  {HOSPITAL_STATUS_LABEL[hospital.status]}
                </span>
              </div>
              <div>
                <span className="text-slate-400">ผู้ดูแล:</span>{' '}
                <span className="text-slate-800">{hospital.ownerName}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onAddDeal(hospital)}
              className="w-full py-2 px-3 rounded-lg bg-[#FF5E1E] hover:bg-[#E04B10] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              เพิ่มเคส / สร้างดีลใหม่
            </button>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

interface MapViewportControllerProps {
  target: { lat: number; lng: number; zoom?: number } | null;
}

const MapViewportController: React.FC<MapViewportControllerProps> = ({ target }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !target) return;
    map.panTo({ lat: target.lat, lng: target.lng });
    if (target.zoom) {
      map.setZoom(target.zoom);
    }
  }, [map, target]);

  return null;
};

type LoadedPlacesLib = ReturnType<typeof useMapsLibrary<'places'>>;

interface PlacesLibraryBridgeProps {
  onLoaded: (lib: LoadedPlacesLib) => void;
}

const PlacesLibraryBridge: React.FC<PlacesLibraryBridgeProps> = ({ onLoaded }) => {
  const placesLib = useMapsLibrary('places');

  useEffect(() => {
    onLoaded(placesLib);
  }, [placesLib, onLoaded]);

  return null;
};

const QUICK_SEARCH_REGIONS = [
  { label: 'กรุงเทพฯ', query: 'โรงพยาบาล กรุงเทพมหานคร' },
  { label: 'เชียงใหม่', query: 'โรงพยาบาล เชียงใหม่' },
  { label: 'ขอนแก่น', query: 'โรงพยาบาล ขอนแก่น' },
  { label: 'ชลบุรี', query: 'โรงพยาบาล ชลบุรี' },
  { label: 'ภูเก็ต', query: 'โรงพยาบาล ภูเก็ต' },
  { label: 'สงขลา', query: 'โรงพยาบาล สงขลา' },
];

function getMapsErrorMessage(code: string | null | undefined): string | null {
  if (!code) return null;
  switch (code) {
    case 'OverQuotaMapError':
      return 'โควตาการใช้งานฟรีรายวันของ Google Maps เต็มแล้ว กรุณารอรีเซ็ตวันถัดไป หรือเปลี่ยนไปใช้โปรเจกต์ Google Cloud ของคุณในเมนูตั้งค่า Google Maps';
    case 'RefererNotAllowedMapError':
      return 'โดเมนของเว็บนี้ยังไม่ได้รับอนุญาตใน HTTP Referrer Restriction ของ Google Maps API Key';
    case 'ApiNotActivatedMapError':
      return 'ยังไม่ได้เปิดใช้งาน Maps JavaScript API ในโปรเจกต์ Google Cloud ของคีย์นี้';
    case 'BillingNotEnabledMapError':
      return 'โปรเจกต์ Google Cloud ยังไม่ได้ผูกบัญชี Billing สำหรับ Google Maps Platform';
    case 'InvalidKeyMapError':
    case 'gm_authFailure':
      return 'การยืนยันตัวตน Google Maps API Key ไม่สำเร็จ (อาจเกินโควตาหรือคีย์ไม่รองรับโดเมนนี้)';
    default:
      return 'ไม่สามารถโหลดแผนที่ Google Maps ได้ในขณะนี้ กรุณารีเฟรชหน้าเว็บหรือตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
  }
}

export const HospitalMapView: React.FC<HospitalMapViewProps> = ({
  hospitals,
  currentUser,
  focusedHospitalId,
  hasMapsKey,
  mapsErrorCode,
  onSelectAddDeal,
  onSelectAddHospital,
  onNotifyToast,
}) => {
  const [placesLib, setPlacesLib] = useState<LoadedPlacesLib>(null);
  const [viewMode, setViewMode] = useState<'density' | 'status'>('density');
  const [densityFilter, setDensityFilter] = useState<'all' | DensityLevel>('all');
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(
    focusedHospitalId
  );
  const [cameraTarget, setCameraTarget] = useState<{
    lat: number;
    lng: number;
    zoom?: number;
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [syncingCtecRefs, setSyncingCtecRefs] = useState(false);
  const [discoveredPlaces, setDiscoveredPlaces] = useState<DiscoveredHospital[]>([]);
  const [importingId, setImportingId] = useState<string | null>(null);

  useEffect(() => {
    if (!focusedHospitalId) return;
    const found = hospitals.find((h) => h.id === focusedHospitalId);
    if (found) {
      setSelectedHospitalId(found.id);
      setCameraTarget({ lat: found.lat, lng: found.lng, zoom: 13 });
    }
  }, [focusedHospitalId, hospitals]);

  const filteredHospitals = useMemo(() => {
    return hospitals
      .filter((h) => {
        if (densityFilter === 'all') return true;
        return getDensityLevel(h.caseCount) === densityFilter;
      })
      .sort((a, b) => b.caseCount - a.caseCount);
  }, [hospitals, densityFilter]);

  const mappableHospitals = useMemo(() => {
    return filteredHospitals.filter(
      (h) =>
        typeof h.lat === 'number' &&
        typeof h.lng === 'number' &&
        Number.isFinite(h.lat) &&
        Number.isFinite(h.lng) &&
        !(h.lat === 0 && h.lng === 0)
    );
  }, [filteredHospitals]);

  const mapDiagnosticMessage = getMapsErrorMessage(mapsErrorCode);

  const existingPlaceIds = useMemo(() => {
    const lookup: Record<string, boolean> = {};
    hospitals.forEach((h) => {
      if (h.placeId) lookup[h.placeId] = true;
    });
    return lookup;
  }, [hospitals]);

  const existingNames = useMemo(() => {
    const lookup: Record<string, boolean> = {};
    hospitals.forEach((h) => {
      lookup[h.name.toLowerCase()] = true;
    });
    return lookup;
  }, [hospitals]);

  // Resolve CTEC Reference Hotspots live through Google Maps Places API (New) and import to Firestore
  const handleSyncCtecReferenceHospitals = useCallback(async () => {
    if (!placesLib) {
      onNotifyToast('กำลังโหลด Google Maps Places Library กรุณารอสักครู่');
      return;
    }
    setSyncingCtecRefs(true);
    let importedCount = 0;

    try {
      for (const refHosp of CTEC_REFERENCE_HOTSPOTS) {
        if (existingNames[refHosp.name.toLowerCase()]) continue;

        const res = await placesLib.Place.searchByText({
          textQuery: refHosp.searchQuery,
          fields: ['id', 'displayName', 'formattedAddress', 'location'],
          includedType: 'hospital',
          language: 'th',
          region: 'TH',
          maxResultCount: 1,
        });

        const placesList = (res.places || []) as google.maps.places.Place[];
        const top = placesList[0];
        if (!top?.location) continue;
        if (top.id && existingPlaceIds[top.id]) continue;

        await createHospital(
          {
            name: refHosp.name,
            placeId: top.id || '',
            address: top.formattedAddress || refHosp.province,
            province: refHosp.province,
            region: refHosp.region,
            lat: top.location.lat(),
            lng: top.location.lng(),
            hospitalType: refHosp.hospitalType,
            caseCount: refHosp.cases,
            totalRevenue: refHosp.revenue,
            activeDealsCount: Math.max(2, Math.round(refHosp.cases / 25)),
            status: 'high_priority',
            contactName: 'หัวหน้าศูนย์อุปกรณ์ผ่าตัด',
            contactRole: refHosp.specialty,
            contactPhone: '',
            notes: `นำเข้าจากชุดข้อมูลอ้างอิง CTEC (${refHosp.specialty}) พร้อมพิกัดจริงจาก Google Maps`,
          },
          currentUser
        );
        importedCount += 1;
      }

      if (importedCount > 0) {
        onNotifyToast(
          `นำเข้าโรงพยาบาลอ้างอิง CTEC จำนวน ${importedCount} แห่งพร้อมพิกัดจริงจาก Google Maps แล้ว`
        );
      } else {
        onNotifyToast('โรงพยาบาลอ้างอิง CTEC ทั้งหมดถูกนำเข้าในฐานข้อมูลแล้ว');
      }
    } catch (err) {
      const msg = String(err);
      if (
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('OVER_QUERY_LIMIT') ||
        msg.includes('429')
      ) {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
      }
      onNotifyToast('ไม่สามารถดึงพิกัดโรงพยาบาลอ้างอิงจาก Google Maps ได้ในขณะนี้');
    } finally {
      setSyncingCtecRefs(false);
    }
  }, [placesLib, existingNames, existingPlaceIds, currentUser, onNotifyToast]);

  const handleDiscoverHospitals = useCallback(
    async (queryText: string) => {
      if (!placesLib || !queryText.trim()) return;
      setSearchingPlaces(true);
      try {
        let res = await placesLib.Place.searchByText({
          textQuery: queryText.trim(),
          fields: ['id', 'displayName', 'formattedAddress', 'location'],
          includedType: 'hospital',
          language: 'th',
          region: 'TH',
          maxResultCount: 10,
        });

        let placesList = (res.places || []) as google.maps.places.Place[];
        if (placesList.length === 0) {
          res = await placesLib.Place.searchByText({
            textQuery: queryText.trim(),
            fields: ['id', 'displayName', 'formattedAddress', 'location'],
            language: 'th',
            region: 'TH',
            maxResultCount: 10,
          });
          placesList = (res.places || []) as google.maps.places.Place[];
        }

        const results: DiscoveredHospital[] = placesList
          .filter((p) => Boolean(p.location && p.displayName))
          .map((p) => ({
            placeId: p.id || '',
            name: p.displayName || '',
            address: p.formattedAddress || '',
            lat: p.location!.lat(),
            lng: p.location!.lng(),
            phone: '',
          }));

        setDiscoveredPlaces(results);
        if (results.length > 0) {
          setCameraTarget({ lat: results[0].lat, lng: results[0].lng, zoom: 11 });
          onNotifyToast(`พบโรงพยาบาลจริงจาก Google Maps จำนวน ${results.length} แห่ง`);
        } else {
          onNotifyToast('ไม่พบโรงพยาบาลตามคำค้นหา ลองเปลี่ยนชื่อจังหวัดหรือเขตพื้นที่');
        }
      } catch (err) {
        const msg = String(err);
        if (
          msg.includes('RESOURCE_EXHAUSTED') ||
          msg.includes('OVER_QUERY_LIMIT') ||
          msg.includes('429')
        ) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        onNotifyToast('ไม่สามารถค้นหาโรงพยาบาลจาก Google Maps ได้ในขณะนี้');
      } finally {
        setSearchingPlaces(false);
      }
    },
    [placesLib, onNotifyToast]
  );

  const handleImportDiscovered = async (item: DiscoveredHospital) => {
    setImportingId(item.placeId);
    try {
      const { province, region } = inferProvinceAndRegion(item.address);
      const inferredType: HospitalType =
        item.name.includes('ศิริราช') ||
        item.name.includes('จุฬาลงกรณ์') ||
        item.name.includes('รามาธิบดี') ||
        item.name.includes('มหาวิทยาลัย')
          ? 'โรงเรียนแพทย์'
          : item.name.includes('เอกชน') ||
              item.name.includes('บำรุงราษฎร์') ||
              item.name.includes('กรุงเทพ') ||
              item.name.includes('สมิติเวช') ||
              item.name.includes('พญาไท')
            ? 'โรงพยาบาลเอกชน'
            : 'โรงพยาบาลรัฐ';

      await createHospital(
        {
          name: item.name,
          placeId: item.placeId,
          address: item.address,
          province,
          region,
          lat: item.lat,
          lng: item.lng,
          hospitalType: inferredType,
          caseCount: 0,
          totalRevenue: 0,
          activeDealsCount: 0,
          status: 'prospect',
          contactName: '',
          contactRole: 'ฝ่ายจัดซื้อเครื่องมือแพทย์',
          contactPhone: item.phone,
          notes: 'นำเข้าพิกัดจริงจาก Google Maps Platform',
        },
        currentUser
      );
      onNotifyToast(`นำเข้า "${item.name}" เข้าสู่ระบบ CRM เรียบร้อยแล้ว`);
    } catch (err) {
      onNotifyToast(getFriendlyFirestoreError(err, `ไม่สามารถนำเข้า "${item.name}" ได้`));
    } finally {
      setImportingId(null);
    }
  };

  const densityCounts = useMemo(() => {
    let high = 0;
    let medium = 0;
    let low = 0;
    hospitals.forEach((h) => {
      const lvl = getDensityLevel(h.caseCount);
      if (lvl === 'high') high += 1;
      else if (lvl === 'medium') medium += 1;
      else if (lvl === 'low') low += 1;
    });
    return { high, medium, low };
  }, [hospitals]);

  return (
    <div className="space-y-5">
      {hasMapsKey && <PlacesLibraryBridge onLoaded={setPlacesLib} />}
      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F4F6FB]">
            แผนที่ติดตามสถานะและความหนาแน่นโรงพยาบาล
          </h1>
          <p className="text-sm text-[#B5BDCB] mt-1">
            โรงพยาบาลที่มีเคสผ่าตัดจำนวนมากจะแสดงรัศมีความหนาแน่นสีส้ม-ทองชัดเจน พร้อมค้นหาพิกัดจริงจาก Google Maps
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center p-1 rounded-xl bg-[#0A0E17]/80 border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setViewMode('density')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                viewMode === 'density'
                  ? 'bg-[#FF5E1E] text-white'
                  : 'text-[#B5BDCB] hover:text-white'
              }`}
            >
              โหมดความหนาแน่นเคส
            </button>
            <button
              type="button"
              onClick={() => setViewMode('status')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                viewMode === 'status'
                  ? 'bg-[#FF5E1E] text-white'
                  : 'text-[#B5BDCB] hover:text-white'
              }`}
            >
              โหมดสถานะลูกค้า
            </button>
          </div>

          <button
            type="button"
            disabled={syncingCtecRefs || !hasMapsKey}
            onClick={() => void handleSyncCtecReferenceHospitals()}
            className="btn-glass min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            {syncingCtecRefs ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FFCF90]" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-[#FFCF90]" />
            )}
            {syncingCtecRefs ? 'กำลังดึงพิกัด...' : 'นำเข้า 5 รพ. อ้างอิง CTEC'}
          </button>

          <button
            type="button"
            onClick={onSelectAddHospital}
            className="btn-luxury-orange min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            เพิ่มโรงพยาบาลใหม่
          </button>
        </div>
      </div>

      {/* Places API (New) Live Discovery Bar */}
      <div className="glass-panel rounded-2xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#8E97AB] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  void handleDiscoverHospitals(searchQuery);
                }
              }}
              placeholder="ค้นหาโรงพยาบาลจริงบน Google Maps เช่น โรงพยาบาลศิริราช, โรงพยาบาลเชียงใหม่..."
              className="glass-input w-full h-10 pl-9 pr-3 text-sm rounded-xl placeholder:text-[#8E97AB]"
            />
          </div>
          <button
            type="button"
            disabled={searchingPlaces || !searchQuery.trim() || !hasMapsKey}
            onClick={() => void handleDiscoverHospitals(searchQuery)}
            className="btn-luxury-orange min-h-[40px] px-4 py-2 text-xs font-semibold rounded-xl inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            {searchingPlaces ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            ค้นหาจาก Google Maps
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[#8E97AB]">ค้นหาด่วนตามพื้นที่:</span>
          {QUICK_SEARCH_REGIONS.map((r) => (
            <button
              key={r.label}
              type="button"
              disabled={searchingPlaces || !hasMapsKey}
              onClick={() => {
                setSearchQuery(r.query);
                void handleDiscoverHospitals(r.query);
              }}
              className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-[#FF5E1E]/20 hover:text-[#FFB59D] text-[#DFE2EF] font-medium transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
            >
              {r.label}
            </button>
          ))}
        </div>

        {discoveredPlaces.length > 0 && (
          <div className="pt-3 border-t border-white/[0.08] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#FFCF90]">
                ผลการค้นหาโรงพยาบาลจาก Google Maps ({discoveredPlaces.length} แห่ง)
              </span>
              <button
                type="button"
                onClick={() => setDiscoveredPlaces([])}
                className="text-[#8E97AB] hover:text-white cursor-pointer"
              >
                ซ่อนรายการ
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
              {discoveredPlaces.map((place) => {
                const alreadyAdded = Boolean(existingPlaceIds[place.placeId]);
                return (
                  <div
                    key={place.placeId}
                    className="glass-tile rounded-xl p-3 flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#F4F6FB] truncate">
                        {place.name}
                      </div>
                      <div className="text-[11px] text-[#8E97AB] line-clamp-1 mt-0.5">
                        {place.address}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={alreadyAdded || importingId === place.placeId}
                      onClick={() => void handleImportDiscovered(place)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap shrink-0 inline-flex items-center gap-1 cursor-pointer ${
                        alreadyAdded
                          ? 'bg-emerald-500/15 text-emerald-300 cursor-default'
                          : 'bg-[#FF5E1E] hover:bg-[#FF7038] text-white'
                      }`}
                    >
                      {alreadyAdded ? (
                        'อยู่ใน CRM แล้ว'
                      ) : importingId === place.placeId ? (
                        'กำลังเพิ่ม...'
                      ) : (
                        <>
                          <Download className="w-3 h-3" />
                          นำเข้า CRM
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Main Map + Side Density List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Interactive Map Container */}
        <div className="lg:col-span-8 glass-panel rounded-2xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-3 bg-[#141822]/70">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { key: 'all', label: `ทั้งหมด (${hospitals.length})` },
                  { key: 'high', label: `หนาแน่นสูง 30+ (${densityCounts.high})` },
                  { key: 'medium', label: `ปานกลาง 11–29 (${densityCounts.medium})` },
                  { key: 'low', label: `ปกติ 1–10 (${densityCounts.low})` },
                ] as const
              ).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setDensityFilter(item.key)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                    densityFilter === item.key
                      ? 'bg-[#FF5E1E] text-white'
                      : 'bg-white/[0.05] text-[#B5BDCB] hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 text-[11px] text-[#B5BDCB]">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF5E1E] inline-block" />
                วิกฤต 120+
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FFAA00] inline-block" />
                สูง 30+
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EEC058] inline-block" />
                ปานกลาง
              </span>
            </div>
          </div>

          {mapDiagnosticMessage && (
            <div className="px-4 py-2.5 bg-amber-500/15 border-b border-amber-400/30 text-xs text-amber-100 leading-relaxed">
              {mapDiagnosticMessage}
            </div>
          )}

          <div className="relative w-full h-[420px] sm:h-[520px] lg:h-[580px]">
            {hasMapsKey ? (
              <GoogleMap
                mapId="DEMO_MAP_ID"
                defaultCenter={{ lat: 13.7563, lng: 100.5018 }}
                defaultZoom={6}
                gestureHandling="greedy"
                mapTypeControl={false}
                streetViewControl={false}
                fullscreenControl={true}
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                style={{ width: '100%', height: '100%' }}
              >
                <MapViewportController target={cameraTarget} />

                {mappableHospitals.map((hospital) => (
                  <HospitalDensityMarker
                    key={hospital.id}
                    hospital={hospital}
                    viewMode={viewMode}
                    isSelected={selectedHospitalId === hospital.id}
                    onSelect={setSelectedHospitalId}
                    onAddDeal={onSelectAddDeal}
                  />
                ))}

                {discoveredPlaces
                  .filter((p) => !existingPlaceIds[p.placeId])
                  .map((place) => (
                    <AdvancedMarker
                      key={`preview-${place.placeId}`}
                      position={{ lat: place.lat, lng: place.lng }}
                      title={`${place.name} (คลิกเพื่อนำเข้า CRM)`}
                      onClick={() => void handleImportDiscovered(place)}
                    >
                      <div className="w-6 h-6 rounded-full bg-[#0F131C]/90 border-2 border-[#FFB59D] text-[#FFB59D] flex items-center justify-center shadow cursor-pointer hover:scale-110 transition-transform">
                        <Plus className="w-3.5 h-3.5" />
                      </div>
                    </AdvancedMarker>
                  ))}
              </GoogleMap>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#0A0E17] p-6 text-center">
                <div className="max-w-sm space-y-2">
                  <MapPin className="w-8 h-8 text-[#8E97AB] mx-auto" />
                  <div className="text-sm font-semibold text-[#F4F6FB]">
                    รอการเชื่อมต่อ Google Maps API Key
                  </div>
                  <p className="text-xs text-[#8E97AB] leading-relaxed">
                    หากกำลังเปิดผ่านลิงก์เว็บที่แชร์ (Shared App) กรุณากดอัปเดตการเผยแพร่ (Publish / Share) อีกครั้งเพื่อให้เซิร์ฟเวอร์นำคีย์ Google Maps ล่าสุดไปใช้งาน
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Ranked Hospital Case Density List */}
        <div className="lg:col-span-4 glass-panel rounded-2xl flex flex-col overflow-hidden max-h-[650px]">
          <div className="px-4 py-3.5 border-b border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#FF5E1E]" />
              <h2 className="text-sm font-semibold text-[#F4F6FB]">
                จัดอันดับความหนาแน่นเคส
              </h2>
            </div>
            <span className="text-xs font-mono tabular-nums text-[#8E97AB]">
              {filteredHospitals.length} แห่ง
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-white/[0.06]">
            {filteredHospitals.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <Building2 className="w-8 h-8 text-[#8E97AB] mx-auto" />
                <div className="text-sm font-semibold text-[#F4F6FB]">
                  ยังไม่มีโรงพยาบาลบนแผนที่
                </div>
                <p className="text-xs text-[#B5BDCB] leading-relaxed">
                  กดปุ่ม "นำเข้า 5 รพ. อ้างอิง CTEC" ด้านบนเพื่อดึงพิกัดจริงจาก Google Maps พร้อมเคสอ้างอิงทันที หรือค้นหาจังหวัดที่ต้องการ
                </p>
                <button
                  type="button"
                  disabled={syncingCtecRefs || !hasMapsKey}
                  onClick={() => void handleSyncCtecReferenceHospitals()}
                  className="btn-luxury-orange px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  นำเข้า 5 รพ. อ้างอิง CTEC
                </button>
              </div>
            ) : (
              filteredHospitals.map((h) => {
                const density = getDensityMeta(h.caseCount);
                const selected = selectedHospitalId === h.id;
                const progressPct = Math.min(100, Math.round((h.caseCount / 150) * 100));

                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => {
                      setSelectedHospitalId(h.id);
                      setCameraTarget({ lat: h.lat, lng: h.lng, zoom: 13 });
                    }}
                    className={`w-full text-left px-4 py-3.5 hover:bg-white/[0.05] transition-colors cursor-pointer ${
                      selected ? 'bg-[#FF5E1E]/10' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[#F4F6FB] truncate">
                          {h.name}
                        </div>
                        <div className="text-xs text-[#B5BDCB] mt-0.5 truncate">
                          {h.province || h.region} · {h.ownerName}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div
                          className="text-sm font-bold font-mono tabular-nums"
                          style={{ color: density.color }}
                        >
                          {h.caseCount} เคส
                        </div>
                        <div className="text-[11px] font-mono tabular-nums text-[#8E97AB]">
                          {formatCurrency(h.totalRevenue)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.max(6, progressPct)}%`,
                            backgroundColor: density.color,
                          }}
                        />
                      </div>
                      <span
                        className="text-[10px] font-mono font-bold whitespace-nowrap"
                        style={{ color: density.color }}
                      >
                        {density.tierCode}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
