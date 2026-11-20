import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  Compass,
  Download,
  Flame,
  Layers,
  Loader2,
  MapPin,
  Minus,
  Plus,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import {
  matchCatalogHospitalByName,
  normalizeHospitalNameKey,
  THAILAND_HOSPITALS_CATALOG,
  type ThailandHospitalEntry,
} from '../data/thailandHospitalsCatalog';
import {
  projectThailandLatLng,
  REGION_CAMERA_PRESETS,
  THAILAND_MAP_VIEWBOX,
  THAILAND_PROVINCES,
  type ThailandProvinceShape,
} from '../data/thailandMapData';
import { getFriendlyFirestoreError } from '../firebase';
import { createHospital } from '../services/crmService';
import {
  formatCompactCurrency,
  formatCurrency,
  getDensityLevel,
  getDensityMeta,
  HOSPITAL_STATUS_LABEL,
  REGIONS,
  type DensityLevel,
  type Hospital,
  type HospitalStatus,
  type HospitalType,
  type OfficeCase,
  type RegionName,
  type UserProfile,
} from '../types';

interface HospitalMapViewProps {
  hospitals: Hospital[];
  officeCases: OfficeCase[];
  currentUser: UserProfile;
  focusedHospitalId: string | null;
  onSelectAddDeal: (hospital: Hospital) => void;
  onSelectAddHospital: () => void;
  onNotifyToast: (msg: string) => void;
}

interface UnifiedMapHospital {
  id: string;
  catalogId?: string;
  crmHospital?: Hospital;
  inCrm: boolean;
  name: string;
  address: string;
  province: string;
  region: RegionName;
  hospitalType: HospitalType;
  lat: number;
  lng: number;
  x: number;
  y: number;
  crmCases: number;
  officeCasesCount: number;
  totalCases: number;
  totalRevenue: number;
  status: HospitalStatus;
  ownerName: string;
  isCtecReference?: boolean;
}

const HOSPITAL_TYPE_COLORS: Record<HospitalType, string> = {
  โรงเรียนแพทย์: '#FF5E1E',
  โรงพยาบาลรัฐ: '#38BDF8',
  โรงพยาบาลเอกชน: '#FFAA00',
  คลินิกเฉพาะทาง: '#34D399',
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 8.5;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export const HospitalMapView: React.FC<HospitalMapViewProps> = ({
  hospitals,
  officeCases,
  currentUser,
  focusedHospitalId,
  onSelectAddDeal,
  onSelectAddHospital,
  onNotifyToast,
}) => {
  // Visual & filter states
  const [viewMode, setViewMode] = useState<'density' | 'type'>('density');
  const [scopeMode, setScopeMode] = useState<'nationwide' | 'active_only'>('nationwide');
  const [densityFilter, setDensityFilter] = useState<'all' | DensityLevel>('all');
  const [regionFilter, setRegionFilter] = useState<'all' | RegionName>('all');
  const [selectedProvinceName, setSelectedProvinceName] = useState<string | null>(null);
  const [hoveredProvinceName, setHoveredProvinceName] = useState<string | null>(null);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(focusedHospitalId);
  const [hoveredHospitalId, setHoveredHospitalId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sideTab, setSideTab] = useState<'hospitals' | 'provinces'>('hospitals');

  // Import states
  const [importingRegion, setImportingRegion] = useState(false);
  const [importingSingleId, setImportingSingleId] = useState<string | null>(null);

  // Interactive SVG camera (center cx, cy in viewBox space + zoom factor)
  const [camera, setCamera] = useState<{ cx: number; cy: number; zoom: number }>({
    cx: REGION_CAMERA_PRESETS.all.cx,
    cy: REGION_CAMERA_PRESETS.all.cy,
    zoom: REGION_CAMERA_PRESETS.all.zoom,
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    startCx: number;
    startCy: number;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Aggregate live Office Cases by normalized hospital name & matched catalog ID
  const officeCasesByHospital = useMemo(() => {
    const byCatalogId: Record<string, { count: number; revenue: number }> = {};
    const byNormName: Record<string, { count: number; revenue: number }> = {};

    for (const oc of officeCases) {
      const rawName = (oc.hospitalName || '').trim();
      if (!rawName) continue;
      const rev = Number.isFinite(oc.price) ? Math.max(0, oc.price) : 0;
      const norm = normalizeHospitalNameKey(rawName);
      if (norm) {
        if (!byNormName[norm]) byNormName[norm] = { count: 0, revenue: 0 };
        byNormName[norm].count += 1;
        byNormName[norm].revenue += rev;
      }
      const matched = matchCatalogHospitalByName(rawName);
      if (matched) {
        if (!byCatalogId[matched.id]) byCatalogId[matched.id] = { count: 0, revenue: 0 };
        byCatalogId[matched.id].count += 1;
        byCatalogId[matched.id].revenue += rev;
      }
    }
    return { byCatalogId, byNormName };
  }, [officeCases]);

  // Merge Firestore CRM Hospitals + Live Office Cases + Nationwide 156-Hospital Offline Catalog
  const unifiedHospitals: UnifiedMapHospital[] = useMemo(() => {
    const matchedCatalogIds = new Set<string>();
    const list: UnifiedMapHospital[] = [];

    // 1. All Firestore CRM Hospitals first
    for (const h of hospitals) {
      const catalogMatch =
        THAILAND_HOSPITALS_CATALOG.find((c) => c.id === h.placeId) ||
        matchCatalogHospitalByName(h.name);

      if (catalogMatch) {
        matchedCatalogIds.add(catalogMatch.id);
      }

      const validLat =
        typeof h.lat === 'number' && Number.isFinite(h.lat) && h.lat >= 5 && h.lat <= 21
          ? h.lat
          : catalogMatch?.lat ?? 13.7563;
      const validLng =
        typeof h.lng === 'number' && Number.isFinite(h.lng) && h.lng >= 97 && h.lng <= 106
          ? h.lng
          : catalogMatch?.lng ?? 100.5018;
      const { x, y } = projectThailandLatLng(validLat, validLng);

      const norm = normalizeHospitalNameKey(h.name);
      const officeStat =
        (catalogMatch && officeCasesByHospital.byCatalogId[catalogMatch.id]) ||
        (norm && officeCasesByHospital.byNormName[norm]) ||
        null;

      const officeCount = officeStat?.count || 0;
      const officeRev = officeStat?.revenue || 0;
      const crmCases = h.caseCount || 0;
      const totalCases = crmCases + officeCount;

      list.push({
        id: h.id,
        catalogId: catalogMatch?.id,
        crmHospital: h,
        inCrm: true,
        name: h.name,
        address: h.address || catalogMatch?.address || '',
        province: h.province || catalogMatch?.province || 'ประเทศไทย',
        region: h.region || catalogMatch?.region || 'ภาคกลาง',
        hospitalType: h.hospitalType || catalogMatch?.hospitalType || 'โรงพยาบาลรัฐ',
        lat: validLat,
        lng: validLng,
        x,
        y,
        crmCases,
        officeCasesCount: officeCount,
        totalCases,
        totalRevenue: (h.totalRevenue || 0) + officeRev,
        status: h.status,
        ownerName: h.ownerName || 'ทีม CTEC',
        isCtecReference: catalogMatch?.isCtecReference,
      });
    }

    // 2. Remaining Nationwide Offline Catalog Hospitals (all 77 provinces)
    for (const item of THAILAND_HOSPITALS_CATALOG) {
      if (matchedCatalogIds.has(item.id)) continue;
      const { x, y } = projectThailandLatLng(item.lat, item.lng);
      const officeStat = officeCasesByHospital.byCatalogId[item.id];
      const officeCount = officeStat?.count || 0;
      const officeRev = officeStat?.revenue || 0;

      list.push({
        id: item.id,
        catalogId: item.id,
        inCrm: false,
        name: item.name,
        address: item.address,
        province: item.province,
        region: item.region,
        hospitalType: item.hospitalType,
        lat: item.lat,
        lng: item.lng,
        x,
        y,
        crmCases: 0,
        officeCasesCount: officeCount,
        totalCases: officeCount,
        totalRevenue: officeRev,
        status: officeCount >= 30 ? 'high_priority' : officeCount > 0 ? 'active' : 'prospect',
        ownerName: 'ฐานข้อมูล รพ.ทั่วประเทศ',
        isCtecReference: item.isCtecReference,
      });
    }

    return list.sort((a, b) => {
      if (b.totalCases !== a.totalCases) return b.totalCases - a.totalCases;
      if (a.inCrm !== b.inCrm) return a.inCrm ? -1 : 1;
      return a.name.localeCompare(b.name, 'th');
    });
  }, [hospitals, officeCasesByHospital]);

  // Focus hospital passed from Dashboard / Pipeline view
  useEffect(() => {
    if (!focusedHospitalId) return;
    const found = unifiedHospitals.find((h) => h.id === focusedHospitalId);
    if (found) {
      setSelectedHospitalId(found.id);
      setCamera({ cx: found.x, cy: found.y, zoom: 4.2 });
    }
  }, [focusedHospitalId, unifiedHospitals]);

  // Province-level heat aggregation (for 77-province choropleth glow & stats)
  const provinceStatsMap = useMemo(() => {
    const map: Record<
      string,
      { hospitalCount: number; crmCount: number; totalCases: number; totalRevenue: number }
    > = {};

    for (const p of THAILAND_PROVINCES) {
      map[p.nameTh] = { hospitalCount: 0, crmCount: 0, totalCases: 0, totalRevenue: 0 };
    }

    for (const h of unifiedHospitals) {
      const key = h.province;
      if (!map[key]) {
        map[key] = { hospitalCount: 0, crmCount: 0, totalCases: 0, totalRevenue: 0 };
      }
      map[key].hospitalCount += 1;
      if (h.inCrm) map[key].crmCount += 1;
      map[key].totalCases += h.totalCases;
      map[key].totalRevenue += h.totalRevenue;
    }

    return map;
  }, [unifiedHospitals]);

  const maxProvinceCases = useMemo(() => {
    let max = 1;
    for (const stat of Object.values(provinceStatsMap)) {
      if (stat.totalCases > max) max = stat.totalCases;
    }
    return max;
  }, [provinceStatsMap]);

  // Filtered hospitals for both Map markers and Right Panel ranking
  const filteredHospitals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const normQ = normalizeHospitalNameKey(q);

    return unifiedHospitals.filter((h) => {
      if (scopeMode === 'active_only' && !h.inCrm && h.totalCases === 0) return false;
      if (regionFilter !== 'all' && h.region !== regionFilter) return false;
      if (selectedProvinceName && h.province !== selectedProvinceName) return false;
      if (densityFilter !== 'all' && getDensityLevel(h.totalCases) !== densityFilter) {
        return false;
      }
      if (q) {
        const hitName = h.name.toLowerCase().includes(q);
        const hitProv = h.province.toLowerCase().includes(q);
        const hitRegion = h.region.toLowerCase().includes(q);
        const hitType = h.hospitalType.toLowerCase().includes(q);
        const hitNorm = normQ.length >= 2 && normalizeHospitalNameKey(h.name).includes(normQ);
        if (!hitName && !hitProv && !hitRegion && !hitType && !hitNorm) return false;
      }
      return true;
    });
  }, [unifiedHospitals, scopeMode, regionFilter, selectedProvinceName, densityFilter, searchQuery]);

  // Summary metrics
  const kpiStats = useMemo(() => {
    let totalCases = 0;
    let activeWithCases = 0;
    let highDensity = 0;
    let mediumDensity = 0;
    let lowDensity = 0;
    let crmTotal = 0;
    const provincesWithCases = new Set<string>();

    for (const h of unifiedHospitals) {
      totalCases += h.totalCases;
      if (h.inCrm) crmTotal += 1;
      if (h.totalCases > 0) {
        activeWithCases += 1;
        provincesWithCases.add(h.province);
      }
      const lvl = getDensityLevel(h.totalCases);
      if (lvl === 'high') highDensity += 1;
      else if (lvl === 'medium') mediumDensity += 1;
      else if (lvl === 'low') lowDensity += 1;
    }

    let topProvince = 'กรุงเทพมหานคร';
    let topProvinceCases = 0;
    for (const [prov, stat] of Object.entries(provinceStatsMap)) {
      if (stat.totalCases > topProvinceCases) {
        topProvinceCases = stat.totalCases;
        topProvince = prov;
      }
    }

    return {
      totalCatalog: unifiedHospitals.length,
      crmTotal,
      totalCases,
      activeWithCases,
      highDensity,
      mediumDensity,
      lowDensity,
      provincesWithCases: provincesWithCases.size,
      topProvince,
      topProvinceCases,
    };
  }, [unifiedHospitals, provinceStatsMap]);

  const rankedProvinces = useMemo(() => {
    return THAILAND_PROVINCES.map((p) => {
      const stat = provinceStatsMap[p.nameTh] || {
        hospitalCount: 0,
        crmCount: 0,
        totalCases: 0,
        totalRevenue: 0,
      };
      return { ...p, ...stat };
    })
      .filter((p) => regionFilter === 'all' || p.region === regionFilter)
      .sort((a, b) => {
        if (b.totalCases !== a.totalCases) return b.totalCases - a.totalCases;
        if (b.hospitalCount !== a.hospitalCount) return b.hospitalCount - a.hospitalCount;
        return a.nameTh.localeCompare(b.nameTh, 'th');
      });
  }, [provinceStatsMap, regionFilter]);

  const selectedHospital = useMemo(
    () => unifiedHospitals.find((h) => h.id === selectedHospitalId) || null,
    [unifiedHospitals, selectedHospitalId]
  );

  const hoveredHospital = useMemo(
    () => unifiedHospitals.find((h) => h.id === hoveredHospitalId) || null,
    [unifiedHospitals, hoveredHospitalId]
  );

  // Compute SVG viewBox string from camera
  const viewBoxString = useMemo(() => {
    const vbW = THAILAND_MAP_VIEWBOX.width / camera.zoom;
    const vbH = THAILAND_MAP_VIEWBOX.height / camera.zoom;
    const x = clamp(camera.cx - vbW / 2, -60, THAILAND_MAP_VIEWBOX.width - vbW + 60);
    const y = clamp(camera.cy - vbH / 2, -60, THAILAND_MAP_VIEWBOX.height - vbH + 60);
    return `${x.toFixed(1)} ${y.toFixed(1)} ${vbW.toFixed(1)} ${vbH.toFixed(1)}`;
  }, [camera]);

  // Camera controls
  const handleSelectRegion = useCallback((region: 'all' | RegionName) => {
    setRegionFilter(region);
    setSelectedProvinceName(null);
    const preset = REGION_CAMERA_PRESETS[region];
    setCamera({ cx: preset.cx, cy: preset.cy, zoom: preset.zoom });
  }, []);

  const handleFocusProvince = useCallback((prov: ThailandProvinceShape) => {
    setSelectedProvinceName((prev) => (prev === prov.nameTh ? null : prov.nameTh));
    setSelectedHospitalId(null);
    setCamera({
      cx: prov.cx,
      cy: prov.cy,
      zoom: prov.region === 'กรุงเทพและปริมณฑล' ? 5.6 : 3.4,
    });
  }, []);

  const handleFocusHospital = useCallback((h: UnifiedMapHospital) => {
    setSelectedHospitalId(h.id);
    setCamera((prev) => ({
      cx: h.x,
      cy: h.y,
      zoom: Math.max(prev.zoom, h.region === 'กรุงเทพและปริมณฑล' ? 5.2 : 3.2),
    }));
  }, []);

  const handleZoomBy = useCallback((factor: number) => {
    setCamera((prev) => ({
      ...prev,
      zoom: clamp(prev.zoom * factor, MIN_ZOOM, MAX_ZOOM),
    }));
  }, []);

  const handleResetCamera = useCallback(() => {
    setRegionFilter('all');
    setSelectedProvinceName(null);
    setSelectedHospitalId(null);
    setCamera({
      cx: REGION_CAMERA_PRESETS.all.cx,
      cy: REGION_CAMERA_PRESETS.all.cy,
      zoom: REGION_CAMERA_PRESETS.all.zoom,
    });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.18 : 0.85;
    setCamera((prev) => ({
      ...prev,
      zoom: clamp(prev.zoom * factor, MIN_ZOOM, MAX_ZOOM),
    }));
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if ((e.target as HTMLElement).closest('[data-map-interactive="true"]')) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      setIsDragging(true);
      dragStartRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        startCx: camera.cx,
        startCy: camera.cy,
      };
    },
    [camera.cx, camera.cy]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!isDragging || !dragStartRef.current || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const vbW = THAILAND_MAP_VIEWBOX.width / camera.zoom;
      const vbH = THAILAND_MAP_VIEWBOX.height / camera.zoom;
      const scale = Math.max(vbW / rect.width, vbH / rect.height);
      const dx = (e.clientX - dragStartRef.current.clientX) * scale;
      const dy = (e.clientY - dragStartRef.current.clientY) * scale;

      setCamera((prev) => ({
        ...prev,
        cx: clamp(dragStartRef.current!.startCx - dx, 40, THAILAND_MAP_VIEWBOX.width - 40),
        cy: clamp(dragStartRef.current!.startCy - dy, 40, THAILAND_MAP_VIEWBOX.height - 40),
      }));
    },
    [isDragging, camera.zoom]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  // Offline 1-click import: Single catalog hospital into Firestore CRM (strictly real live counts only)
  const handleImportSingleHospital = useCallback(
    async (item: UnifiedMapHospital) => {
      if (item.inCrm) return;
      setImportingSingleId(item.id);
      try {
        const createdId = await createHospital(
          {
            name: item.name,
            placeId: item.catalogId || item.id,
            address: item.address || item.province,
            province: item.province,
            region: item.region,
            lat: item.lat,
            lng: item.lng,
            hospitalType: item.hospitalType,
            caseCount: item.officeCasesCount || 0,
            totalRevenue: item.totalRevenue || 0,
            activeDealsCount: item.officeCasesCount > 0 ? 1 : 0,
            status: item.totalCases >= 30 ? 'high_priority' : item.totalCases > 0 ? 'active' : 'prospect',
            contactName: '',
            contactRole: 'ฝ่ายจัดซื้อเครื่องมือแพทย์',
            contactPhone: '',
            notes: 'นำเข้าจากฐานข้อมูลโรงพยาบาลทั่วประเทศ (แผนที่ออฟไลน์)',
          },
          currentUser
        );
        setSelectedHospitalId(createdId);
        onNotifyToast(`นำเข้า "${item.name}" เข้าสู่ระบบ CRM เรียบร้อยแล้ว`);
      } catch (err) {
        onNotifyToast(getFriendlyFirestoreError(err, `ไม่สามารถนำเข้า "${item.name}" ได้`));
      } finally {
        setImportingSingleId(null);
      }
    },
    [currentUser, onNotifyToast]
  );

  // Batch import hospitals for the currently selected region (or provincial hubs)
  const handleBatchImportFilteredToCrm = useCallback(async () => {
    const candidates = filteredHospitals.filter((h) => !h.inCrm).slice(0, 20);
    if (candidates.length === 0) {
      onNotifyToast('โรงพยาบาลในตัวกรองปัจจุบันถูกนำเข้าสู่ระบบ CRM ครบแล้ว');
      return;
    }
    setImportingRegion(true);
    let imported = 0;
    try {
      for (const item of candidates) {
        await createHospital(
          {
            name: item.name,
            placeId: item.catalogId || item.id,
            address: item.address || item.province,
            province: item.province,
            region: item.region,
            lat: item.lat,
            lng: item.lng,
            hospitalType: item.hospitalType,
            caseCount: item.officeCasesCount || 0,
            totalRevenue: item.totalRevenue || 0,
            activeDealsCount: item.officeCasesCount > 0 ? 1 : 0,
            status: item.officeCasesCount >= 30 ? 'high_priority' : item.officeCasesCount > 0 ? 'active' : 'prospect',
            contactName: '',
            contactRole: 'ฝ่ายจัดซื้อเครื่องมือแพทย์',
            contactPhone: '',
            notes: 'นำเข้าแบบกลุ่มจากฐานข้อมูลโรงพยาบาลทั่วประเทศ',
          },
          currentUser
        );
        imported += 1;
      }
      onNotifyToast(`นำเข้าโรงพยาบาลจำนวน ${imported} แห่งเข้าสู่ระบบ CRM เรียบร้อยแล้ว`);
    } catch (err) {
      onNotifyToast(getFriendlyFirestoreError(err, `นำเข้าได้ ${imported} แห่ง ก่อนพบข้อผิดพลาด`));
    } finally {
      setImportingRegion(false);
    }
  }, [filteredHospitals, currentUser, onNotifyToast]);

  // Province choropleth fill color based on case volume
  const getProvinceFill = (provName: string, isSelected: boolean, isHovered: boolean): string => {
    const stat = provinceStatsMap[provName];
    const cases = stat?.totalCases || 0;
    if (isSelected) return 'rgba(255, 94, 30, 0.34)';
    if (cases > 0) {
      const ratio = Math.min(1, Math.sqrt(cases / Math.max(maxProvinceCases, 20)));
      const alpha = isHovered ? Math.min(0.46, 0.18 + ratio * 0.28) : 0.1 + ratio * 0.26;
      if (cases >= 100) return `rgba(255, 94, 30, ${alpha.toFixed(2)})`;
      if (cases >= 30) return `rgba(255, 148, 34, ${alpha.toFixed(2)})`;
      return `rgba(255, 186, 73, ${alpha.toFixed(2)})`;
    }
    if (isHovered) return 'rgba(255, 255, 255, 0.11)';
    return 'rgba(28, 35, 50, 0.78)';
  };

  // Sort markers so higher-case hotspots render on top
  const renderOrderedHospitals = useMemo(() => {
    return filteredHospitals.slice().sort((a, b) => {
      if (a.id === selectedHospitalId) return 1;
      if (b.id === selectedHospitalId) return -1;
      return a.totalCases - b.totalCases;
    });
  }, [filteredHospitals, selectedHospitalId]);

  const invZoom = 1 / Math.pow(camera.zoom, 0.72);
  const hoveredProvObj = hoveredProvinceName
    ? THAILAND_PROVINCES.find((p) => p.nameTh === hoveredProvinceName) || null
    : null;
  const hoveredProvStat = hoveredProvinceName ? provinceStatsMap[hoveredProvinceName] : null;

  return (
    <div className="space-y-5">
      {/* Header & Primary Controls */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-bold text-[#F4F6FB] tracking-tight">
            แผนที่ความหนาแน่นเคสโรงพยาบาลทั่วประเทศไทย
          </h1>
          <p className="text-sm text-[#B5BDCB] mt-1">
            แผนที่ออฟไลน์ 77 จังหวัด พร้อมฐานข้อมูลโรงพยาบาลทั่วประเทศ {kpiStats.totalCatalog} แห่ง ผสานยอดเคสจาก CRM และตารางเคสออฟฟิศอัตโนมัติ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center p-1 rounded-xl bg-[#0A0E17]/80 border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setViewMode('density')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                viewMode === 'density'
                  ? 'bg-[#FF5E1E] text-white'
                  : 'text-[#B5BDCB] hover:text-white'
              }`}
            >
              โหมดความหนาแน่นเคส
            </button>
            <button
              type="button"
              onClick={() => setViewMode('type')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                viewMode === 'type'
                  ? 'bg-[#FF5E1E] text-white'
                  : 'text-[#B5BDCB] hover:text-white'
              }`}
            >
              โหมดประเภท รพ.
            </button>
          </div>

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

      {/* Top KPI Strip (Clean Single-Elevation Glass Tiles, Tabular Numerals) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="glass-panel rounded-2xl p-4">
          <div className="text-xs text-[#B5BDCB]">ฐานข้อมูล รพ. บนแผนที่</div>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-[#F4F6FB]">
            {kpiStats.totalCatalog.toLocaleString('th-TH')}
            <span className="text-xs font-sans font-normal text-[#8E97AB] ml-1.5">แห่ง</span>
          </div>
          <div className="mt-1 text-xs text-[#8E97AB]">
            ครบ 77 จังหวัด · ใน CRM {kpiStats.crmTotal} แห่ง
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-4">
          <div className="text-xs text-[#B5BDCB]">เคสสะสมรวมบนแผนที่</div>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-[#FFCF90]">
            {kpiStats.totalCases.toLocaleString('th-TH')}
            <span className="text-xs font-sans font-normal text-[#8E97AB] ml-1.5">เคส</span>
          </div>
          <div className="mt-1 text-xs text-[#8E97AB]">
            ครอบคลุม {kpiStats.activeWithCases} รพ. · {kpiStats.provincesWithCases} จังหวัด
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-4">
          <div className="text-xs text-[#B5BDCB]">จุดความหนาแน่นสูง (30+ เคส)</div>
          <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-[#FFB59D]">
            {kpiStats.highDensity.toLocaleString('th-TH')}
            <span className="text-xs font-sans font-normal text-[#8E97AB] ml-1.5">แห่ง</span>
          </div>
          <div className="mt-1 text-xs text-[#8E97AB]">
            ปานกลาง {kpiStats.mediumDensity} · ปกติ {kpiStats.lowDensity} แห่ง
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-4">
          <div className="text-xs text-[#B5BDCB]">จังหวัดที่เคสหนาแน่นสูงสุด</div>
          <div className="mt-1.5 text-lg font-bold text-[#F4F6FB] truncate">
            {kpiStats.topProvinceCases > 0 ? kpiStats.topProvince : 'พร้อมบันทึกเคส'}
          </div>
          <div className="mt-1 text-xs font-mono tabular-nums text-[#FFCF90]">
            {kpiStats.topProvinceCases > 0
              ? `${kpiStats.topProvinceCases.toLocaleString('th-TH')} เคสสะสม`
              : 'บันทึกเคสเพื่อแสดงความหนาแน่นบนแผนที่'}
          </div>
        </div>
      </div>

      {/* Instant Offline Search & Regional Quick-Focus Toolbar */}
      <div className="glass-panel rounded-2xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#8E97AB] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อโรงพยาบาล, จังหวัด, หรือประเภท เช่น ศิริราช, เชียงใหม่, ขอนแก่น, โรงเรียนแพทย์..."
              className="glass-input w-full h-10 pl-10 pr-9 text-sm rounded-xl placeholder:text-[#8E97AB]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="ล้างคำค้นหา"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E97AB] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="inline-flex items-center p-1 rounded-xl bg-[#0A0E17]/80 border border-white/[0.08] shrink-0">
            <button
              type="button"
              onClick={() => setScopeMode('nationwide')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                scopeMode === 'nationwide'
                  ? 'bg-[#262B38] text-[#FFB59D]'
                  : 'text-[#8E97AB] hover:text-white'
              }`}
            >
              ทั้งประเทศ ({unifiedHospitals.length})
            </button>
            <button
              type="button"
              onClick={() => setScopeMode('active_only')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                scopeMode === 'active_only'
                  ? 'bg-[#262B38] text-[#FFB59D]'
                  : 'text-[#8E97AB] hover:text-white'
              }`}
            >
              เฉพาะที่มีเคส / CRM ({kpiStats.crmTotal + unifiedHospitals.filter((h) => !h.inCrm && h.totalCases > 0).length})
            </button>
          </div>
        </div>

        {/* Regional Focus Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[#8E97AB] mr-1 inline-flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-[#FFCF90]" />
              โฟกัสภูมิภาค:
            </span>
            {(['all', ...REGIONS] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => handleSelectRegion(r)}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  regionFilter === r
                    ? 'bg-[#FF5E1E] text-white'
                    : 'bg-white/[0.05] text-[#DFE2EF] hover:bg-white/[0.1]'
                }`}
              >
                {REGION_CAMERA_PRESETS[r].label}
              </button>
            ))}
          </div>

          {selectedProvinceName && (
            <button
              type="button"
              onClick={() => setSelectedProvinceName(null)}
              className="text-xs text-[#FFB59D] hover:text-white inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
            >
              <span>จังหวัด: {selectedProvinceName}</span>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Split: Interactive Offline Thailand Map + Ranked Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left 8 Cols: Interactive Offline Vector Map */}
        <div className="lg:col-span-8 glass-panel rounded-2xl overflow-hidden flex flex-col">
          {/* Map Top Filter & Legend Bar */}
          <div className="px-4 py-3 border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-3 bg-[#111622]/85">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { key: 'all', label: `ทั้งหมด (${filteredHospitals.length})` },
                  { key: 'high', label: `หนาแน่นสูง 30+ (${kpiStats.highDensity})` },
                  { key: 'medium', label: `ปานกลาง 11–29 (${kpiStats.mediumDensity})` },
                  { key: 'low', label: `ปกติ 1–10 (${kpiStats.lowDensity})` },
                ] as const
              ).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setDensityFilter(item.key)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    densityFilter === item.key
                      ? 'bg-[#FF5E1E] text-white'
                      : 'bg-white/[0.05] text-[#B5BDCB] hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {viewMode === 'density' ? (
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#B5BDCB]">
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
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#34D399] inline-block" />
                  1–10 เคส
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#64748B] inline-block" />
                  รพ.เครือข่าย
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#B5BDCB]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF5E1E] inline-block" />
                  โรงเรียนแพทย์
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8] inline-block" />
                  โรงพยาบาลรัฐ
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FFAA00] inline-block" />
                  โรงพยาบาลเอกชน
                </span>
              </div>
            )}
          </div>

          {/* Interactive SVG Map Canvas */}
          <div className="relative w-full h-[500px] sm:h-[580px] lg:h-[640px] bg-[#080C15] select-none overflow-hidden">
            {/* Subtle cartographic ambient ocean depth */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(circle at 46% 42%, rgba(255,94,30,0.08) 0%, rgba(16,24,40,0.2) 48%, rgba(8,12,21,0.95) 100%)',
              }}
            />

            <svg
              ref={svgRef}
              viewBox={viewBoxString}
              onWheel={handleWheel}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              className={`relative z-10 w-full h-full touch-none ${
                isDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
              role="img"
              aria-label="แผนที่ประเทศไทย 77 จังหวัดแสดงความหนาแน่นเคสโรงพยาบาล"
            >
              <defs>
                <radialGradient id="halo-critical">
                  <stop offset="0%" stopColor="#FF5E1E" stopOpacity="0.72" />
                  <stop offset="45%" stopColor="#FF5E1E" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#FF5E1E" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="halo-high">
                  <stop offset="0%" stopColor="#FFAA00" stopOpacity="0.65" />
                  <stop offset="50%" stopColor="#FFAA00" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#FFAA00" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="halo-medium">
                  <stop offset="0%" stopColor="#EEC058" stopOpacity="0.55" />
                  <stop offset="55%" stopColor="#EEC058" stopOpacity="0.16" />
                  <stop offset="100%" stopColor="#EEC058" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="halo-low">
                  <stop offset="0%" stopColor="#34D399" stopOpacity="0.45" />
                  <stop offset="55%" stopColor="#34D399" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#34D399" stopOpacity="0" />
                </radialGradient>
                <filter id="soft-glow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Subtle Coordinate Graticule Grid */}
              <g stroke="rgba(148,163,184,0.06)" strokeWidth={0.8 * invZoom}>
                {[100, 200, 300, 400, 500, 600].map((gx) => (
                  <line key={`vx-${gx}`} x1={gx} y1={-40} x2={gx} y2={1160} />
                ))}
                {[100, 250, 400, 550, 700, 850, 1000].map((gy) => (
                  <line key={`hy-${gy}`} x1={-40} y1={gy} x2={680} y2={gy} />
                ))}
              </g>

              {/* 77 Provinces Choropleth Vector Layer */}
              <g>
                {THAILAND_PROVINCES.map((prov) => {
                  const isSel = selectedProvinceName === prov.nameTh;
                  const isHov = hoveredProvinceName === prov.nameTh;
                  const inActiveRegion = regionFilter === 'all' || prov.region === regionFilter;
                  const stat = provinceStatsMap[prov.nameTh];
                  const hasCases = (stat?.totalCases || 0) > 0;

                  return (
                    <path
                      key={prov.id}
                      d={prov.d}
                      data-map-interactive="true"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFocusProvince(prov);
                      }}
                      onMouseEnter={() => setHoveredProvinceName(prov.nameTh)}
                      onMouseLeave={() =>
                        setHoveredProvinceName((prev) => (prev === prov.nameTh ? null : prev))
                      }
                      fill={getProvinceFill(prov.nameTh, isSel, isHov)}
                      fillOpacity={inActiveRegion ? 1 : 0.35}
                      stroke={
                        isSel
                          ? '#FF7A45'
                          : isHov
                            ? 'rgba(255,207,144,0.75)'
                            : hasCases
                              ? 'rgba(255,170,80,0.45)'
                              : 'rgba(148,163,184,0.22)'
                      }
                      strokeWidth={(isSel ? 1.8 : isHov ? 1.3 : 0.75) * invZoom}
                      className="transition-colors duration-150 cursor-pointer"
                    />
                  );
                })}
              </g>

              {/* Province Name Labels (appear smoothly at zoomed levels or for major regional hubs) */}
              <g pointerEvents="none">
                {THAILAND_PROVINCES.map((prov) => {
                  const stat = provinceStatsMap[prov.nameTh];
                  const isMajor =
                    prov.nameTh === 'กรุงเทพมหานคร' ||
                    prov.nameTh === 'เชียงใหม่' ||
                    prov.nameTh === 'ขอนแก่น' ||
                    prov.nameTh === 'นครราชสีมา' ||
                    prov.nameTh === 'ชลบุรี' ||
                    prov.nameTh === 'ภูเก็ต' ||
                    prov.nameTh === 'สงขลา' ||
                    prov.nameTh === 'อุบลราชธานี';
                  const showLabel =
                    camera.zoom >= 2.2 ||
                    selectedProvinceName === prov.nameTh ||
                    (isMajor && camera.zoom >= 1.0) ||
                    (stat?.totalCases || 0) >= 30;
                  if (!showLabel) return null;

                  return (
                    <text
                      key={`lbl-${prov.id}`}
                      x={prov.cx}
                      y={prov.cy + (isMajor && camera.zoom < 2 ? 12 * invZoom : 0)}
                      textAnchor="middle"
                      fill={
                        selectedProvinceName === prov.nameTh
                          ? '#FFCF90'
                          : (stat?.totalCases || 0) > 0
                            ? 'rgba(255,226,195,0.85)'
                            : 'rgba(181,189,203,0.52)'
                      }
                      fontSize={(camera.zoom >= 3.5 ? 9.5 : 8.5) * invZoom}
                      fontWeight={isMajor || (stat?.totalCases || 0) > 0 ? 600 : 400}
                      style={{ paintOrder: 'stroke', stroke: '#080C15', strokeWidth: 2.2 * invZoom }}
                    >
                      {prov.nameTh === 'กรุงเทพมหานคร' ? 'กทม.' : prov.nameTh}
                    </text>
                  );
                })}
              </g>

              {/* Hospital Case-Density Halo & Pin Layer */}
              <g>
                {renderOrderedHospitals.map((h) => {
                  const density = getDensityMeta(h.totalCases);
                  const isSel = selectedHospitalId === h.id;
                  const isHov = hoveredHospitalId === h.id;
                  const pinColor =
                    viewMode === 'density'
                      ? h.totalCases > 0
                        ? density.color
                        : h.inCrm
                          ? '#94A3B8'
                          : '#475569'
                      : HOSPITAL_TYPE_COLORS[h.hospitalType];

                  const haloRadius =
                    viewMode === 'density' && h.totalCases > 0
                      ? (h.totalCases >= 120
                          ? 46
                          : h.totalCases >= 30
                            ? Math.min(40, 26 + h.totalCases * 0.14)
                            : h.totalCases >= 11
                              ? 22
                              : 15) * invZoom
                      : 0;

                  const haloFill =
                    h.totalCases >= 120
                      ? 'url(#halo-critical)'
                      : h.totalCases >= 30
                        ? 'url(#halo-high)'
                        : h.totalCases >= 11
                          ? 'url(#halo-medium)'
                          : 'url(#halo-low)';

                  const coreRadius =
                    (h.totalCases >= 120
                      ? 12
                      : h.totalCases >= 30
                        ? 10
                        : h.totalCases >= 11
                          ? 8.5
                          : h.totalCases >= 1
                            ? 7
                            : h.inCrm
                              ? 5.2
                              : 3.8) *
                    (isSel ? 1.28 : isHov ? 1.18 : 1) *
                    invZoom;

                  return (
                    <g
                      key={h.id}
                      transform={`translate(${h.x.toFixed(1)}, ${h.y.toFixed(1)})`}
                      data-map-interactive="true"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFocusHospital(h);
                      }}
                      onMouseEnter={() => setHoveredHospitalId(h.id)}
                      onMouseLeave={() =>
                        setHoveredHospitalId((prev) => (prev === h.id ? null : prev))
                      }
                      className="cursor-pointer"
                    >
                      {/* Density Heat Halo */}
                      {haloRadius > 0 && (
                        <circle r={haloRadius} fill={haloFill} pointerEvents="none" />
                      )}

                      {/* Outer selection ring */}
                      {isSel && (
                        <circle
                          r={coreRadius + 4.5 * invZoom}
                          fill="none"
                          stroke="#FFFFFF"
                          strokeWidth={1.6 * invZoom}
                          strokeOpacity={0.9}
                        />
                      )}

                      {/* Main Pin Dot */}
                      <circle
                        r={coreRadius}
                        fill={pinColor}
                        fillOpacity={h.totalCases > 0 || h.inCrm || isSel || isHov ? 0.96 : 0.72}
                        stroke={isSel ? '#080C15' : h.totalCases > 0 ? '#FFFFFF' : 'rgba(255,255,255,0.45)'}
                        strokeWidth={(isSel ? 2.2 : h.totalCases > 0 ? 1.4 : 0.7) * invZoom}
                        filter={h.totalCases >= 30 ? 'url(#soft-glow)' : undefined}
                      />

                      {/* Case count number inside pin for active hospitals */}
                      {h.totalCases > 0 && (
                        <text
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="#FFFFFF"
                          fontSize={(h.totalCases >= 100 ? 7.5 : 8.5) * invZoom}
                          fontWeight={700}
                          fontFamily="'IBM Plex Mono', monospace"
                          pointerEvents="none"
                        >
                          {h.totalCases}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>

            {/* Top-Left Compact Map Zoom Controls */}
            <div className="absolute top-3.5 left-3.5 z-20 flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => handleZoomBy(1.35)}
                aria-label="ซูมเข้า"
                className="w-9 h-9 rounded-xl bg-[#121724]/90 hover:bg-[#1E2538] border border-white/[0.12] text-[#F4F6FB] flex items-center justify-center shadow-lg transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleZoomBy(0.74)}
                aria-label="ซูมออก"
                className="w-9 h-9 rounded-xl bg-[#121724]/90 hover:bg-[#1E2538] border border-white/[0.12] text-[#F4F6FB] flex items-center justify-center shadow-lg transition-colors cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleResetCamera}
                aria-label="รีเซ็ตมุมมองทั้งประเทศ"
                title="รีเซ็ตมุมมองทั้งประเทศ"
                className="w-9 h-9 rounded-xl bg-[#121724]/90 hover:bg-[#1E2538] border border-white/[0.12] text-[#FFCF90] flex items-center justify-center shadow-lg transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Bottom-Left Subtle Hover Info Bar */}
            {(hoveredHospital || hoveredProvObj) && !selectedHospital && (
              <div className="pointer-events-none absolute bottom-3.5 left-3.5 z-20 max-w-xs bg-[#101522]/92 backdrop-blur-xl border border-white/[0.12] rounded-xl px-3.5 py-2.5 shadow-xl">
                {hoveredHospital ? (
                  <>
                    <div className="text-xs font-semibold text-white truncate">
                      {hoveredHospital.name}
                    </div>
                    <div className="text-[11px] text-[#B5BDCB] mt-0.5">
                      {hoveredHospital.province} · {hoveredHospital.hospitalType}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-[11px] font-mono tabular-nums">
                      <span className="text-[#FFCF90] font-semibold">
                        {hoveredHospital.totalCases.toLocaleString('th-TH')} เคส
                      </span>
                      <span className="text-[#8E97AB]">
                        {hoveredHospital.inCrm ? 'อยู่ใน CRM' : 'คลิกเพื่อดู / นำเข้า CRM'}
                      </span>
                    </div>
                  </>
                ) : hoveredProvObj ? (
                  <>
                    <div className="text-xs font-semibold text-white">
                      จังหวัด{hoveredProvObj.nameTh}
                    </div>
                    <div className="text-[11px] text-[#B5BDCB] mt-0.5">
                      {hoveredProvObj.region} · รพ. {hoveredProvStat?.hospitalCount || 0} แห่ง ·{' '}
                      <span className="font-mono tabular-nums text-[#FFCF90] font-semibold">
                        {(hoveredProvStat?.totalCases || 0).toLocaleString('th-TH')} เคส
                      </span>
                    </div>
                  </>
                ) : null}
              </div>
            )}

            {/* Floating Apple Frosted Glass Hospital Inspector Card (when a pin is selected) */}
            {selectedHospital && (
              <div className="absolute bottom-3.5 left-3.5 right-3.5 sm:left-auto sm:right-3.5 sm:w-[330px] z-30 bg-[#121724]/95 backdrop-blur-2xl border border-white/[0.14] rounded-2xl p-4 shadow-2xl space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] text-[#FFCF90] font-medium">
                      {selectedHospital.hospitalType} · {selectedHospital.province}
                    </div>
                    <h3 className="text-sm font-bold text-white leading-snug mt-0.5">
                      {selectedHospital.name}
                    </h3>
                    <div className="text-[11px] text-[#8E97AB] line-clamp-1 mt-0.5">
                      {selectedHospital.address || selectedHospital.region}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedHospitalId(null)}
                    aria-label="ปิดรายละเอียดโรงพยาบาล"
                    className="p-1 rounded-lg text-[#8E97AB] hover:text-white hover:bg-white/[0.08] cursor-pointer shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5 py-2.5 border-y border-white/[0.08]">
                  <div>
                    <div className="text-[11px] text-[#8E97AB]">เคสสะสมรวม</div>
                    <div
                      className="text-lg font-bold font-mono tabular-nums"
                      style={{ color: getDensityMeta(selectedHospital.totalCases).color }}
                    >
                      {selectedHospital.totalCases.toLocaleString('th-TH')} เคส
                    </div>
                    {selectedHospital.officeCasesCount > 0 && (
                      <div className="text-[10px] text-[#B5BDCB] mt-0.5">
                        CRM {selectedHospital.crmCases} · ออฟฟิศ {selectedHospital.officeCasesCount}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-[11px] text-[#8E97AB]">มูลค่ายอดขายสะสม</div>
                    <div className="text-base font-bold font-mono tabular-nums text-white mt-0.5">
                      {formatCurrency(selectedHospital.totalRevenue)}
                    </div>
                    <div className="text-[10px] text-[#8E97AB] mt-0.5">
                      {getDensityMeta(selectedHospital.totalCases).tierCode}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-[#B5BDCB]">
                  <span>
                    สถานะ:{' '}
                    <span className="text-white font-medium">
                      {selectedHospital.inCrm
                        ? HOSPITAL_STATUS_LABEL[selectedHospital.status]
                        : 'รพ.เครือข่ายทั่วประเทศ'}
                    </span>
                  </span>
                  <span className="font-mono text-[10px] text-[#8E97AB]">
                    {selectedHospital.lat.toFixed(3)}, {selectedHospital.lng.toFixed(3)}
                  </span>
                </div>

                {selectedHospital.crmHospital ? (
                  <button
                    type="button"
                    onClick={() => onSelectAddDeal(selectedHospital.crmHospital!)}
                    className="btn-luxury-orange w-full min-h-[40px] py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    เพิ่มเคส / สร้างดีลใหม่
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={importingSingleId === selectedHospital.id}
                    onClick={() => void handleImportSingleHospital(selectedHospital)}
                    className="btn-luxury-orange w-full min-h-[40px] py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    {importingSingleId === selectedHospital.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    {importingSingleId === selectedHospital.id
                      ? 'กำลังนำเข้า CRM...'
                      : 'นำเข้าโรงพยาบาลนี้เข้าสู่ CRM'}
                  </button>
                )}
              </div>
            )}

            {/* Bottom-Right Subtle Zoom Indicator */}
            {!selectedHospital && (
              <div className="pointer-events-none absolute bottom-3.5 right-3.5 z-20 text-[11px] font-mono tabular-nums text-[#8E97AB] bg-[#101522]/80 border border-white/[0.08] rounded-lg px-2.5 py-1">
                {camera.zoom.toFixed(1)}× · เลื่อนลูกกลิ้งเพื่อซูม / ลากเพื่อเลื่อน
              </div>
            )}
          </div>
        </div>

        {/* Right 4 Cols: Nationwide Hospital & Province Ranking Panel */}
        <div className="lg:col-span-4 glass-panel rounded-2xl flex flex-col overflow-hidden max-h-[700px]">
          {/* Panel Tab Header */}
          <div className="px-4 py-3 border-b border-white/[0.08] space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex items-center p-1 rounded-xl bg-[#0A0E17]/80 border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setSideTab('hospitals')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer inline-flex items-center gap-1.5 ${
                    sideTab === 'hospitals'
                      ? 'bg-[#FF5E1E] text-white'
                      : 'text-[#B5BDCB] hover:text-white'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  รายชื่อ รพ. ({filteredHospitals.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSideTab('provinces')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer inline-flex items-center gap-1.5 ${
                    sideTab === 'provinces'
                      ? 'bg-[#FF5E1E] text-white'
                      : 'text-[#B5BDCB] hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  77 จังหวัด ({rankedProvinces.length})
                </button>
              </div>
            </div>

            {sideTab === 'hospitals' && filteredHospitals.some((h) => !h.inCrm) && (
              <button
                type="button"
                disabled={importingRegion}
                onClick={() => void handleBatchImportFilteredToCrm()}
                className="w-full py-2 px-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] text-xs font-medium text-[#FFCF90] flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {importingRegion ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                {importingRegion
                  ? 'กำลังนำเข้าข้อมูล รพ. เข้าสู่ CRM...'
                  : `นำเข้า รพ. ในมุมมองนี้เข้าสู่ CRM (สูงสุด 20 แห่ง/ครั้ง)`}
              </button>
            )}
          </div>

          {/* Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/[0.06]">
            {sideTab === 'hospitals' ? (
              filteredHospitals.length === 0 ? (
                <div className="p-8 text-center space-y-2.5">
                  <Building2 className="w-8 h-8 text-[#8E97AB] mx-auto" />
                  <div className="text-sm font-semibold text-[#F4F6FB]">
                    ไม่พบโรงพยาบาลตามตัวกรอง
                  </div>
                  <p className="text-xs text-[#B5BDCB]">
                    ลองล้างคำค้นหาหรือเปลี่ยนกลับเป็นมุมมองทั้งประเทศ
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setDensityFilter('all');
                      setScopeMode('nationwide');
                      handleResetCamera();
                    }}
                    className="btn-glass px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    แสดงโรงพยาบาลทั้งหมด
                  </button>
                </div>
              ) : (
                filteredHospitals.map((h) => {
                  const density = getDensityMeta(h.totalCases);
                  const selected = selectedHospitalId === h.id;
                  const progressPct =
                    h.totalCases > 0 ? Math.min(100, Math.max(8, Math.round((h.totalCases / 150) * 100))) : 0;

                  return (
                    <div
                      key={h.id}
                      onClick={() => handleFocusHospital(h)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleFocusHospital(h);
                        }
                      }}
                      className={`w-full text-left px-4 py-3 hover:bg-white/[0.05] transition-colors cursor-pointer ${
                        selected ? 'bg-[#FF5E1E]/12' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-[#F4F6FB] truncate">
                            {h.name}
                          </div>
                          <div className="text-xs text-[#B5BDCB] mt-0.5 truncate">
                            {h.province} · {h.hospitalType}
                            {h.inCrm ? ' · CRM' : ''}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div
                            className="text-sm font-bold font-mono tabular-nums"
                            style={{ color: h.totalCases > 0 ? density.color : '#8E97AB' }}
                          >
                            {h.totalCases.toLocaleString('th-TH')} เคส
                          </div>
                          <div className="text-[11px] font-mono tabular-nums text-[#8E97AB]">
                            {h.totalRevenue > 0 ? formatCompactCurrency(h.totalRevenue) : '—'}
                          </div>
                        </div>
                      </div>

                      {h.totalCases > 0 && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${progressPct}%`,
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
                      )}
                    </div>
                  );
                })
              )
            ) : (
              rankedProvinces.map((prov) => {
                const isSel = selectedProvinceName === prov.nameTh;
                const density = getDensityMeta(prov.totalCases);
                return (
                  <button
                    key={prov.id}
                    type="button"
                    onClick={() => handleFocusProvince(prov)}
                    className={`w-full text-left px-4 py-3 hover:bg-white/[0.05] transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                      isSel ? 'bg-[#FF5E1E]/12' : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#F4F6FB] truncate">
                        {prov.nameTh}
                      </div>
                      <div className="text-xs text-[#8E97AB] mt-0.5">
                        {prov.region} · รพ. {prov.hospitalCount} แห่ง
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div
                        className="text-sm font-bold font-mono tabular-nums"
                        style={{ color: prov.totalCases > 0 ? density.color : '#8E97AB' }}
                      >
                        {prov.totalCases.toLocaleString('th-TH')} เคส
                      </div>
                      {prov.totalRevenue > 0 && (
                        <div className="text-[11px] font-mono tabular-nums text-[#8E97AB]">
                          {formatCompactCurrency(prov.totalRevenue)}
                        </div>
                      )}
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
