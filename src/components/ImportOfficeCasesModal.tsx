import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardPaste,
  Download,
  FileSpreadsheet,
  Layers,
  Loader2,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  downloadOfficeCaseTemplateExcel,
  parseCtecOfficeTextDetailed,
  parseCtecOfficeUploadDetailed,
  type ImportDetectedFormat,
  type OfficeCaseSeedInput,
  type ParsedSheetResult,
} from '../data/officeCaseReferenceData';
import {
  buildExistingCaseLookup,
  importOfficeCasesBatch,
  matchCaseInLookup,
  type BatchImportResult,
  type DuplicateImportMode,
} from '../services/officeCaseService';
import {
  OFFICE_WORKFLOW_META,
  type OfficeCase,
  type UserProfile,
} from '../types';

interface ImportOfficeCasesModalProps {
  open: boolean;
  officeCases: OfficeCase[];
  currentUser: UserProfile;
  onClose: () => void;
  onNotifyToast: (msg: string) => void;
}

type SourceTab = 'file' | 'paste';
type PreviewFilterMode = 'all' | 'new' | 'dup';

const PREVIEW_PAGE_SIZE = 50;

const FORMAT_LABELS: Record<ImportDetectedFormat, string> = {
  ctec_raw_ledger: 'ทะเบียน CTEC ต้นฉบับ (54 คอลัมน์)',
  ctec_exported_excel: 'ไฟล์ Excel ที่ส่งออกจากระบบ CTEC',
  flexible_headers: 'ตารางหัวคอลัมน์อัตโนมัติ (Excel / CSV / Sheets)',
  unknown: 'ยังไม่ทราบรูปแบบ',
};

const STATUS_DOT_CLASS: Record<string, string> = {
  in_progress: 'bg-white border border-slate-400',
  sterilizing: 'bg-sky-400 border border-sky-200',
  delivered: 'bg-emerald-400 border border-emerald-200',
};

export const ImportOfficeCasesModal: React.FC<ImportOfficeCasesModalProps> = ({
  open,
  officeCases,
  currentUser,
  onClose,
  onNotifyToast,
}) => {
  const [sourceTab, setSourceTab] = useState<SourceTab>('file');
  const [dragActive, setDragActive] = useState(false);
  const [pasteText, setPasteText] = useState('');

  // Multi-sheet + Parsed preview state
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [sheetResults, setSheetResults] = useState<ParsedSheetResult[]>([]);
  const [selectedSheetKey, setSelectedSheetKey] = useState<string>('');
  const [parsedCases, setParsedCases] = useState<OfficeCaseSeedInput[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [detectedFormat, setDetectedFormat] = useState<ImportDetectedFormat>('unknown');
  const [sourceLabel, setSourceLabel] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);

  // Preview pagination & filter (keeps 500–5,000+ rows butter smooth)
  const [previewSearch, setPreviewSearch] = useState('');
  const [previewFilter, setPreviewFilter] = useState<PreviewFilterMode>('all');
  const [previewPage, setPreviewPage] = useState(1);

  // Import execution state
  const [duplicateMode, setDuplicateMode] = useState<DuplicateImportMode>('skip');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; label: string }>({
    done: 0,
    total: 0,
    label: '',
  });
  const [importResult, setImportResult] = useState<BatchImportResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Freeze match table during active batch import so live Firestore snapshots do not thrash the modal
  const frozenMatchesRef = useRef<(OfficeCase | undefined)[]>([]);

  // O(1) lookup index for existing cases
  const existingLookup = useMemo(() => {
    return buildExistingCaseLookup(officeCases);
  }, [officeCases]);

  const existingMatches = useMemo(() => {
    if (importing && frozenMatchesRef.current.length === parsedCases.length) {
      return frozenMatchesRef.current;
    }
    const matches = parsedCases.map((item) => matchCaseInLookup(item, existingLookup));
    frozenMatchesRef.current = matches;
    return matches;
  }, [parsedCases, existingLookup, importing]);

  const summaryCounts = useMemo(() => {
    let selectedTotal = 0;
    let newCount = 0;
    let dupCount = 0;
    let withPriceCount = 0;
    let withSterilizeCount = 0;
    let withDeliveryCount = 0;
    for (let idx = 0; idx < parsedCases.length; idx++) {
      if (!selectedIndices.has(idx)) continue;
      selectedTotal += 1;
      if (existingMatches[idx]) dupCount += 1;
      else newCount += 1;
      const item = parsedCases[idx];
      if (item.price > 0) withPriceCount += 1;
      if (
        item.sterilizeOutDate ||
        item.sterilizeReturnDate ||
        item.qcReceiveDate ||
        item.certificateNo
      ) {
        withSterilizeCount += 1;
      }
      if (
        item.deliveryDate ||
        item.deliveryChannel ||
        item.deliveredBy ||
        item.emsTrackingNo
      ) {
        withDeliveryCount += 1;
      }
    }
    return {
      selectedTotal,
      newCount,
      dupCount,
      withPriceCount,
      withSterilizeCount,
      withDeliveryCount,
    };
  }, [parsedCases, selectedIndices, existingMatches]);

  const filteredPreviewIndices = useMemo(() => {
    const q = previewSearch.trim().toLowerCase();
    const out: number[] = [];
    for (let idx = 0; idx < parsedCases.length; idx++) {
      const isDup = Boolean(existingMatches[idx]);
      if (previewFilter === 'new' && isDup) continue;
      if (previewFilter === 'dup' && !isDup) continue;
      if (q) {
        const item = parsedCases[idx];
        const hay = `${item.jobNumber} ${item.salesSeqNo} ${item.hospitalName} ${item.patientFirstName} ${item.patientLastName} ${item.patientHN} ${item.doctorName} ${item.productCode} ${item.caseReceiver}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }
      out.push(idx);
    }
    return out;
  }, [parsedCases, existingMatches, previewFilter, previewSearch]);

  const totalPreviewPages = Math.max(
    1,
    Math.ceil(filteredPreviewIndices.length / PREVIEW_PAGE_SIZE)
  );
  const safePreviewPage = Math.min(previewPage, totalPreviewPages);
  const visiblePreviewIndices = useMemo(() => {
    const start = (safePreviewPage - 1) * PREVIEW_PAGE_SIZE;
    return filteredPreviewIndices.slice(start, start + PREVIEW_PAGE_SIZE);
  }, [filteredPreviewIndices, safePreviewPage]);

  const totalAllSheetsCount = useMemo(
    () => sheetResults.reduce((sum, s) => sum + s.cases.length, 0),
    [sheetResults]
  );

  if (!open) return null;

  const applyParsedPreview = (
    cases: OfficeCaseSeedInput[],
    format: ImportDetectedFormat,
    label: string,
    warnings: string[]
  ) => {
    setImportResult(null);
    setPreviewSearch('');
    setPreviewFilter('all');
    setPreviewPage(1);

    if (cases.length === 0) {
      setParsedCases([]);
      setSelectedIndices(new Set());
      setDetectedFormat('unknown');
      setSourceLabel(label);
      setParseError(
        warnings[0] ||
          'ไม่พบแถวข้อมูลเคสในไฟล์นี้ — กรุณาตรวจสอบว่ามีหัวคอลัมน์ เช่น เลขที่รับงาน, โรงพยาบาล, ชื่อคนไข้ หรือดาวน์โหลดแม่แบบ Excel'
      );
      return;
    }

    setParseError(null);
    setParsedCases(cases);
    setDetectedFormat(format);
    setSourceLabel(label);
    const allIdx = new Set<number>();
    let matchedExisting = 0;
    for (let i = 0; i < cases.length; i++) {
      allIdx.add(i);
      if (matchCaseInLookup(cases[i], existingLookup)) {
        matchedExisting += 1;
      }
    }
    setSelectedIndices(allIdx);
    // When re-uploading a workbook whose rows already exist in Firestore, default to non-destructive "อัปเดตเคสเดิม"
    // so price, sterilization, and delivery data fill in cleanly without skipping everything.
    if (matchedExisting > 0 && matchedExisting === cases.length) {
      setDuplicateMode('update');
    }
  };

  const handleSelectSheet = (key: string, sheets: ParsedSheetResult[], fileName: string) => {
    setSelectedSheetKey(key);
    if (key === '__all__') {
      const combined = sheets.flatMap((s) => s.cases);
      const primaryFormat = sheets[0]?.detectedFormat ?? 'flexible_headers';
      applyParsedPreview(
        combined,
        primaryFormat,
        `${fileName} (รวมทุกชีต ${sheets.length} ชีต)`,
        []
      );
      return;
    }

    const found = sheets.find((s) => s.sheetName === key);
    if (found) {
      applyParsedPreview(
        found.cases,
        found.detectedFormat,
        `${fileName} (${found.sheetName})`,
        found.warnings
      );
    }
  };

  const handleFileSelected = async (file: File) => {
    setParsing(true);
    setParseError(null);
    setImportResult(null);
    setSheetResults([]);
    setSelectedSheetKey('');
    setUploadedFileName(file.name);
    try {
      const res = await parseCtecOfficeUploadDetailed(file);
      const sheets = res.sheetResults ?? [];
      setSheetResults(sheets);

      if (sheets.length > 1) {
        const totalRows = sheets.reduce((sum, s) => sum + s.cases.length, 0);
        const largestSheet = sheets.reduce(
          (best, s) => (s.cases.length > best.cases.length ? s : best),
          sheets[0]
        );
        // If rows are distributed across multiple sheets (e.g., monthly tabs), combine all sheets by default;
        // otherwise select the primary sheet while still letting the user switch to "รวมทุกชีต" with 1 click.
        const defaultKey =
          largestSheet.cases.length < totalRows * 0.85 ? '__all__' : largestSheet.sheetName;
        handleSelectSheet(defaultKey, sheets, file.name);
      } else {
        setSelectedSheetKey(res.sheetName || '');
        applyParsedPreview(
          res.cases,
          res.detectedFormat,
          `${file.name}${res.sheetName && res.sheetName !== file.name ? ` (${res.sheetName})` : ''}`,
          res.warnings
        );
      }
    } catch (err) {
      console.error('Import file parse failed:', err);
      setParsedCases([]);
      setSelectedIndices(new Set());
      setSheetResults([]);
      setParseError(
        'ไม่สามารถอ่านไฟล์นี้ได้ กรุณาตรวจสอบว่าไฟล์ไม่เสียหาย หรือลองคัดลอกข้อมูลจาก Excel มาวางในแท็บ "วางข้อมูลจากตาราง"'
      );
    } finally {
      setParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleParsePaste = () => {
    setImportResult(null);
    setSheetResults([]);
    setSelectedSheetKey('');
    setUploadedFileName('');
    const res = parseCtecOfficeTextDetailed(pasteText);
    applyParsedPreview(res.cases, res.detectedFormat, 'ข้อมูลวางจากตาราง', res.warnings);
  };

  const handleClearPreview = () => {
    setParsedCases([]);
    setSelectedIndices(new Set());
    setSheetResults([]);
    setSelectedSheetKey('');
    setUploadedFileName('');
    setDetectedFormat('unknown');
    setSourceLabel('');
    setParseError(null);
    setImportResult(null);
    setPreviewSearch('');
    setPreviewFilter('all');
    setPreviewPage(1);
  };

  const toggleRow = (idx: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleAllRows = () => {
    if (selectedIndices.size === parsedCases.length) {
      setSelectedIndices(new Set());
    } else {
      const all = new Set<number>();
      for (let i = 0; i < parsedCases.length; i++) all.add(i);
      setSelectedIndices(all);
    }
  };

  const handleDownloadTemplate = () => {
    downloadOfficeCaseTemplateExcel();
    onNotifyToast('ดาวน์โหลดไฟล์แม่แบบ Excel (.xlsx) สำหรับนำเข้าเคสแล้ว');
  };

  const handleConfirmImport = async () => {
    if (importing || summaryCounts.selectedTotal === 0) return;

    const rowsToImport: OfficeCaseSeedInput[] = [];
    for (let idx = 0; idx < parsedCases.length; idx++) {
      if (selectedIndices.has(idx)) rowsToImport.push(parsedCases[idx]);
    }

    // Freeze current matches snapshot during batch commit
    frozenMatchesRef.current = existingMatches;
    setImporting(true);
    setImportResult(null);
    setProgress({
      done: 0,
      total: rowsToImport.length,
      label: `เตรียมนำเข้า ${rowsToImport.length.toLocaleString('th-TH')} รายการ (แบบชุดครั้งละ 100 รายการ)...`,
    });

    try {
      const result = await importOfficeCasesBatch(
        rowsToImport,
        officeCases,
        currentUser,
        {
          duplicateMode,
          sourceLabel,
          onProgress: (done, total, batchLabel) =>
            setProgress({
              done,
              total,
              label: batchLabel || `กำลังบันทึก ${done.toLocaleString('th-TH')} / ${total.toLocaleString('th-TH')} รายการ...`,
            }),
        }
      );
      setImportResult(result);

      if (result.imported > 0 || result.updated > 0) {
        const parts: string[] = [];
        if (result.imported > 0)
          parts.push(`นำเข้าใหม่ ${result.imported.toLocaleString('th-TH')} เคส`);
        if (result.updated > 0)
          parts.push(`อัปเดต ${result.updated.toLocaleString('th-TH')} เคส`);
        if (result.skipped > 0)
          parts.push(`ข้ามซ้ำ ${result.skipped.toLocaleString('th-TH')}`);
        if (result.failed > 0)
          parts.push(`ไม่สำเร็จ ${result.failed.toLocaleString('th-TH')}`);
        onNotifyToast(`นำเข้าเคสเสร็จสิ้น: ${parts.join(' · ')}`);
      } else if (result.failed > 0) {
        onNotifyToast(
          `นำเข้าไม่สำเร็จ ${result.failed.toLocaleString('th-TH')} รายการ กรุณาดูรายละเอียดในหน้าต่างนำเข้า`
        );
      } else {
        onNotifyToast(
          `ไม่พบเคสใหม่ (ข้อมูลซ้ำทั้งหมด ${result.skipped.toLocaleString('th-TH')} รายการ — สามารถเลือก "นำเข้าทั้งหมด" ได้)`
        );
      }
    } catch (err) {
      console.error('Batch import unexpected error:', err);
      onNotifyToast('เกิดข้อผิดพลาดระหว่างนำเข้าเคส กรุณาลองใหม่อีกครั้ง');
    } finally {
      setImporting(false);
    }
  };

  const progressPercent =
    progress.total > 0 ? Math.min(100, Math.round((progress.done / progress.total) * 100)) : 0;

  const pageStartItem =
    filteredPreviewIndices.length === 0 ? 0 : (safePreviewPage - 1) * PREVIEW_PAGE_SIZE + 1;
  const pageEndItem = Math.min(
    safePreviewPage * PREVIEW_PAGE_SIZE,
    filteredPreviewIndices.length
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="ระบบนำเข้าเคสออฟฟิศ"
    >
      <div className="glass-panel w-full max-w-5xl rounded-3xl border border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-white/10 flex items-center justify-between gap-4 bg-gradient-to-r from-[#FF6B2B]/15 via-transparent to-transparent">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#FFB59D] shrink-0" />
              <h2 className="text-lg sm:text-xl font-bold text-white truncate">
                นำเข้าข้อมูลเคสออฟฟิศ (Excel / CSV / วางจากตาราง)
              </h2>
            </div>
            <p className="text-xs text-[#C8B6AE] mt-0.5">
              รองรับไฟล์ขนาดใหญ่ 500–5,000+ แถว ด้วยระบบบันทึกแบบชุดความเร็วสูง (Batch Commit) พร้อมรองรับไฟล์ Excel หลายชีต และหัวตารางภาษาไทย/อังกฤษอัตโนมัติ
            </p>
          </div>
          <button
            type="button"
            disabled={importing}
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/12 border border-white/10 flex items-center justify-center text-white/80 hover:text-white cursor-pointer shrink-0 disabled:opacity-40"
            aria-label="ปิดหน้าต่างนำเข้าเคส"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Source Switcher + Template Download */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="inline-flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-black/35 border border-white/10">
              <button
                type="button"
                disabled={importing}
                onClick={() => setSourceTab('file')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer ${
                  sourceTab === 'file'
                    ? 'bg-gradient-to-r from-[#FF6B2B] to-[#FF9457] text-white shadow-lg shadow-[#FF6B2B]/25'
                    : 'text-[#C8B6AE] hover:text-white hover:bg-white/5'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                อัปโหลดไฟล์ Excel / CSV
              </button>
              <button
                type="button"
                disabled={importing}
                onClick={() => setSourceTab('paste')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer ${
                  sourceTab === 'paste'
                    ? 'bg-gradient-to-r from-[#FF6B2B] to-[#FF9457] text-white shadow-lg shadow-[#FF6B2B]/25'
                    : 'text-[#C8B6AE] hover:text-white hover:bg-white/5'
                }`}
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                วางจาก Excel / Google Sheets
              </button>
            </div>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="btn-glass px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 text-emerald-300 hover:text-emerald-200 cursor-pointer self-start md:self-auto"
            >
              <Download className="w-3.5 h-3.5" />
              ดาวน์โหลดแม่แบบ Excel (.xlsx)
            </button>
          </div>

          {/* Source Tab 1: File Upload / Drag & Drop */}
          {sourceTab === 'file' && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                const dropped = e.dataTransfer.files?.[0];
                if (dropped) void handleFileSelected(dropped);
              }}
              className={`rounded-2xl border-2 border-dashed p-6 sm:p-7 text-center transition ${
                dragActive
                  ? 'border-[#FF9457] bg-[#FF6B2B]/15'
                  : 'border-white/15 bg-white/[0.03] hover:border-white/25'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFileSelected(file);
                }}
                className="hidden"
              />

              <div className="mx-auto w-12 h-12 rounded-2xl bg-[#FF6B2B]/15 border border-[#FF6B2B]/30 flex items-center justify-center mb-3">
                {parsing ? (
                  <Loader2 className="w-6 h-6 text-[#FFB59D] animate-spin" />
                ) : (
                  <Upload className="w-6 h-6 text-[#FFB59D]" />
                )}
              </div>

              <p className="text-sm font-semibold text-white">
                {parsing
                  ? 'กำลังอ่านไฟล์และแยกคอลัมน์ข้อมูล...'
                  : 'ลากไฟล์มาวางที่นี่ หรือกดเลือกไฟล์จากเครื่อง'}
              </p>
              <p className="text-xs text-[#A9B4C6] mt-1 max-w-xl mx-auto">
                รองรับ <span className="text-white/90">.xlsx, .xls, .csv, .tsv</span> ขนาดใหญ่ 500–5,000+ แถว รวมถึงไฟล์ที่มีหลายชีต หรือหัวตาราง 2 ชั้น และอ่านภาษาไทยอัตโนมัติทั้ง UTF-8 / Windows-874
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  disabled={parsing || importing}
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-luxury-orange px-5 py-2.5 rounded-xl text-xs font-semibold inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  เลือกไฟล์จากเครื่อง
                </button>
              </div>
            </div>
          )}

          {/* Source Tab 2: Copy & Paste from Excel / Google Sheets */}
          {sourceTab === 'paste' && (
            <div className="rounded-2xl border border-white/12 bg-white/[0.03] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-white">
                    คัดลอกแถวจาก Excel / Google Sheets แล้ววางลงด้านล่าง
                  </p>
                  <p className="text-xs text-[#A9B4C6]">
                    รองรับการวางครั้งละ 500+ แถว แนะนำให้คัดลอกรวมแถวหัวคอลัมน์ (เช่น <span className="text-white/85">เลขที่รับงาน, โรงพยาบาล, ชื่อคนไข้, แพทย์, ราคา</span>)
                  </p>
                </div>
              </div>

              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={6}
                placeholder="วางข้อมูลที่คัดลอกจาก Excel, Google Sheets หรือ CSV ที่นี่..."
                className="w-full rounded-xl bg-black/40 border border-white/12 px-3.5 py-2.5 text-xs text-white font-mono placeholder:text-white/35 focus:outline-none focus:border-[#FF9457]/70"
              />

              <div className="flex items-center justify-end gap-2">
                {pasteText && (
                  <button
                    type="button"
                    onClick={() => {
                      setPasteText('');
                      handleClearPreview();
                    }}
                    className="btn-glass px-3.5 py-2 rounded-xl text-xs font-medium cursor-pointer"
                  >
                    ล้างข้อความ
                  </button>
                )}
                <button
                  type="button"
                  disabled={!pasteText.trim() || importing}
                  onClick={handleParsePaste}
                  className="btn-luxury-orange px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  <Check className="w-3.5 h-3.5" />
                  ตรวจสอบและแสดงตัวอย่าง
                </button>
              </div>
            </div>
          )}

          {/* Multi-Sheet Selector (shown automatically if Excel workbook has >1 data sheet) */}
          {sheetResults.length > 1 && (
            <div className="rounded-2xl border border-white/12 bg-white/[0.03] p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <Layers className="w-4 h-4 text-[#FFB59D]" />
                <span>
                  พบข้อมูลหลายชีตในไฟล์ Excel ({sheetResults.length} ชีต · รวม{' '}
                  {totalAllSheetsCount.toLocaleString('th-TH')} รายการ) — เลือกชีตที่ต้องการนำเข้า:
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  disabled={importing}
                  onClick={() => handleSelectSheet('__all__', sheetResults, uploadedFileName)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    selectedSheetKey === '__all__'
                      ? 'bg-[#FF6B2B] text-white shadow-md shadow-[#FF6B2B]/25'
                      : 'bg-white/5 text-[#C8B6AE] hover:text-white hover:bg-white/10'
                  }`}
                >
                  รวมทุกชีต ({totalAllSheetsCount.toLocaleString('th-TH')})
                </button>
                {sheetResults.map((sheet) => (
                  <button
                    key={sheet.sheetName}
                    type="button"
                    disabled={importing}
                    onClick={() =>
                      handleSelectSheet(sheet.sheetName, sheetResults, uploadedFileName)
                    }
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                      selectedSheetKey === sheet.sheetName
                        ? 'bg-white/20 text-white border border-white/25'
                        : 'bg-white/5 text-[#C8B6AE] hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {sheet.sheetName} ({sheet.cases.length.toLocaleString('th-TH')})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Parse Error Banner */}
          {parseError && (
            <div className="rounded-2xl border border-rose-400/35 bg-rose-500/12 px-4 py-3 flex items-start gap-2.5 text-rose-200 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-rose-100">ไม่สามารถแยกข้อมูลเคสได้</p>
                <p className="text-rose-200/90 leading-relaxed">{parseError}</p>
              </div>
            </div>
          )}

          {/* Import Result Banner */}
          {importResult && (
            <div
              className={`rounded-2xl border px-4 py-3.5 space-y-2 ${
                importResult.failed > 0 && importResult.imported === 0 && importResult.updated === 0
                  ? 'border-rose-400/35 bg-rose-500/12'
                  : 'border-emerald-400/35 bg-emerald-500/12'
              }`}
            >
              <div className="flex items-center gap-2">
                {importResult.failed > 0 && importResult.imported === 0 && importResult.updated === 0 ? (
                  <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                )}
                <p className="text-sm font-semibold text-white">
                  ผลการนำเข้าข้อมูลเข้าฐานข้อมูล
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums">
                <span className="text-emerald-200 font-semibold">
                  นำเข้าใหม่: {importResult.imported.toLocaleString('th-TH')} เคส
                </span>
                {importResult.updated > 0 && (
                  <span className="text-sky-200 font-semibold">
                    อัปเดตเคสเดิม: {importResult.updated.toLocaleString('th-TH')} เคส
                  </span>
                )}
                <span className="text-white/75">
                  ข้ามรายการซ้ำ: {importResult.skipped.toLocaleString('th-TH')} เคส
                </span>
                {importResult.failed > 0 && (
                  <span className="text-rose-300 font-semibold">
                    ไม่สำเร็จ: {importResult.failed.toLocaleString('th-TH')} เคส
                  </span>
                )}
              </div>
              {importResult.errors.length > 0 && (
                <div className="mt-1 rounded-xl bg-black/30 border border-rose-400/20 p-2.5 text-[11px] text-rose-200 space-y-1 max-h-28 overflow-y-auto">
                  {importResult.errors.map((errMsg, i) => (
                    <div key={i}>• {errMsg}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Preview Table Section */}
          {parsedCases.length > 0 && (
            <div className="space-y-3">
              {/* Preview Meta & Duplicate Mode Controls */}
              <div className="rounded-2xl border border-white/12 bg-black/30 p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-semibold text-white font-mono tabular-nums">
                      พบ {parsedCases.length.toLocaleString('th-TH')} รายการ
                    </span>
                    <span className="text-white/35">·</span>
                    <span className="text-[#FFCF90] font-medium">
                      {FORMAT_LABELS[detectedFormat]}
                    </span>
                    {sourceLabel && (
                      <>
                        <span className="text-white/35">·</span>
                        <span className="text-[#A9B4C6] truncate max-w-[240px]">
                          {sourceLabel}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#C8B6AE] font-mono tabular-nums">
                    <span>เลือกนำเข้า {summaryCounts.selectedTotal.toLocaleString('th-TH')} รายการ</span>
                    <span className="text-emerald-300">
                      เคสใหม่ {summaryCounts.newCount.toLocaleString('th-TH')}
                    </span>
                    {summaryCounts.dupCount > 0 && (
                      <span className="text-amber-300">
                        ซ้ำกับในระบบ {summaryCounts.dupCount.toLocaleString('th-TH')}
                      </span>
                    )}
                    <span className="text-white/25">|</span>
                    <span className="text-[#FFCF90]">
                      พบราคา {summaryCounts.withPriceCount.toLocaleString('th-TH')}
                    </span>
                    <span className="text-sky-300">
                      ฆ่าเชื้อ {summaryCounts.withSterilizeCount.toLocaleString('th-TH')}
                    </span>
                    <span className="text-emerald-300">
                      จัดส่ง {summaryCounts.withDeliveryCount.toLocaleString('th-TH')}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Duplicate Handling Mode */}
                  <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 text-[11px]">
                    <button
                      type="button"
                      disabled={importing}
                      onClick={() => setDuplicateMode('skip')}
                      className={`px-2.5 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                        duplicateMode === 'skip'
                          ? 'bg-white/15 text-white'
                          : 'text-[#A9B4C6] hover:text-white'
                      }`}
                    >
                      ข้ามเคสซ้ำ
                    </button>
                    <button
                      type="button"
                      disabled={importing}
                      onClick={() => setDuplicateMode('update')}
                      className={`px-2.5 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                        duplicateMode === 'update'
                          ? 'bg-[#FF6B2B]/80 text-white'
                          : 'text-[#A9B4C6] hover:text-white'
                      }`}
                    >
                      อัปเดตเคสเดิม
                    </button>
                    <button
                      type="button"
                      disabled={importing}
                      onClick={() => setDuplicateMode('import_all')}
                      className={`px-2.5 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                        duplicateMode === 'import_all'
                          ? 'bg-emerald-600/85 text-white'
                          : 'text-[#A9B4C6] hover:text-white'
                      }`}
                    >
                      นำเข้าทั้งหมด (ไม่ตัดซ้ำ)
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={importing}
                    onClick={handleClearPreview}
                    className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-[#C8B6AE] hover:text-white inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    ล้างรายการ
                  </button>
                </div>
              </div>

              {/* Preview Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] self-start">
                  {(
                    [
                      { id: 'all', label: `ทั้งหมด (${parsedCases.length.toLocaleString('th-TH')})` },
                      {
                        id: 'new',
                        label: `เคสใหม่ (${parsedCases.filter((_, i) => !existingMatches[i]).length.toLocaleString('th-TH')})`,
                      },
                      {
                        id: 'dup',
                        label: `ซ้ำในระบบ (${parsedCases.filter((_, i) => Boolean(existingMatches[i])).length.toLocaleString('th-TH')})`,
                      },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        setPreviewFilter(f.id);
                        setPreviewPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                        previewFilter === f.id
                          ? 'bg-white/15 text-white'
                          : 'text-[#A9B4C6] hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="relative sm:w-64">
                  <Search className="w-3.5 h-3.5 text-[#8E97AB] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={previewSearch}
                    onChange={(e) => {
                      setPreviewSearch(e.target.value);
                      setPreviewPage(1);
                    }}
                    placeholder="ค้นหาในตัวอย่าง (เลขงาน, รพ., ชื่อ)..."
                    className="glass-input w-full h-8 pl-8 pr-3 text-xs rounded-xl"
                  />
                </div>
              </div>

              {/* Paginated Preview Data Table (renders 50 rows/page for 60fps on 500–5,000+ rows) */}
              <div className="rounded-2xl border border-white/12 overflow-hidden bg-black/25">
                <div className="overflow-x-auto max-h-72 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 z-10 bg-[#1B1716]/95 backdrop-blur-md border-b border-white/10 text-[11px] text-[#C8B6AE]">
                      <tr>
                        <th className="py-2.5 px-3 w-10">
                          <input
                            type="checkbox"
                            checked={
                              parsedCases.length > 0 &&
                              selectedIndices.size === parsedCases.length
                            }
                            onChange={toggleAllRows}
                            disabled={importing}
                            aria-label="เลือกทั้งหมด"
                            className="rounded accent-[#FF6B2B] cursor-pointer"
                          />
                        </th>
                        <th className="py-2.5 px-2.5 font-semibold whitespace-nowrap">
                          เลขที่รับงาน / ลำดับ
                        </th>
                        <th className="py-2.5 px-2.5 font-semibold whitespace-nowrap">
                          โรงพยาบาล
                        </th>
                        <th className="py-2.5 px-2.5 font-semibold whitespace-nowrap">
                          คนไข้ / แพทย์
                        </th>
                        <th className="py-2.5 px-2.5 font-semibold whitespace-nowrap">
                          สินค้า / วันรับ-ผ่าตัด
                        </th>
                        <th className="py-2.5 px-2.5 font-semibold whitespace-nowrap">
                          ฆ่าเชื้อ / จัดส่ง
                        </th>
                        <th className="py-2.5 px-2.5 font-semibold whitespace-nowrap">
                          สถานะสี
                        </th>
                        <th className="py-2.5 px-2.5 font-semibold text-right whitespace-nowrap">
                          ราคา (฿)
                        </th>
                        <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">
                          สถานะนำเข้า
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/8">
                      {visiblePreviewIndices.map((idx) => {
                        const item = parsedCases[idx];
                        const checked = selectedIndices.has(idx);
                        const match = existingMatches[idx];
                        const patientFull = [
                          item.patientPrefix,
                          item.patientFirstName,
                          item.patientLastName,
                        ]
                          .filter(Boolean)
                          .join(' ');
                        const statusMeta = OFFICE_WORKFLOW_META[item.workflowStatus];

                        return (
                          <tr
                            key={`${item.jobNumber}-${item.salesSeqNo}-${idx}`}
                            onClick={() => !importing && toggleRow(idx)}
                            className={`transition cursor-pointer ${
                              checked
                                ? 'bg-white/[0.03] hover:bg-white/[0.06]'
                                : 'opacity-45 hover:opacity-70'
                            }`}
                          >
                            <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={importing}
                                onChange={() => toggleRow(idx)}
                                className="rounded accent-[#FF6B2B] cursor-pointer"
                              />
                            </td>
                            <td className="py-2.5 px-2.5 whitespace-nowrap">
                              <div className="font-mono font-semibold text-white">
                                {item.jobNumber || (
                                  <span className="text-white/40">ไม่ระบุเลขงาน</span>
                                )}
                              </div>
                              {item.salesSeqNo > 0 && (
                                <div className="text-[10px] text-[#A9B4C6]">
                                  ลำดับ #{item.salesSeqNo}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-2.5 max-w-[180px]">
                              <div className="text-white font-medium truncate">
                                {item.hospitalName || <span className="text-white/40">-</span>}
                              </div>
                              {item.caseReceiver && (
                                <div className="text-[10px] text-[#A9B4C6]">
                                  ผู้รับเคส: {item.caseReceiver}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-2.5 max-w-[200px]">
                              <div className="text-white/95 truncate">
                                {patientFull || <span className="text-white/40">-</span>}
                              </div>
                              <div className="text-[10px] text-[#A9B4C6] truncate">
                                {item.doctorName ||
                                  (item.patientHN ? `HN: ${item.patientHN}` : '-')}
                              </div>
                            </td>
                            <td className="py-2.5 px-2.5 whitespace-nowrap">
                              <div className="font-mono text-[11px] text-[#FFCF90]">
                                {item.productCode || '-'}
                              </div>
                              <div className="text-[10px] text-[#A9B4C6]">
                                {item.receivedDate ? `รับ ${item.receivedDate}` : ''}
                                {item.receivedDate && item.surgeryDate ? ' · ' : ''}
                                {item.surgeryDate ? `ผ่าตัด ${item.surgeryDate}` : ''}
                                {!item.receivedDate && !item.surgeryDate ? '-' : ''}
                              </div>
                            </td>
                            <td className="py-2.5 px-2.5 max-w-[180px]">
                              <div className="text-[11px] text-sky-200/95 truncate font-mono">
                                {item.sterilizeOutDate || item.sterilizeReturnDate || item.certificateNo
                                  ? `ฆ่าเชื้อ: ${item.sterilizeOutDate || item.sterilizeReturnDate || '-'}${item.certificateNo ? ` · ${item.certificateNo}` : ''}`
                                  : <span className="text-white/35">ฆ่าเชื้อ: -</span>}
                              </div>
                              <div className="text-[10px] text-emerald-300/90 truncate">
                                {item.deliveryDate || item.deliveryChannel || item.deliveredBy || item.emsTrackingNo
                                  ? `ส่ง: ${item.deliveryDate || '-'}${item.deliveryChannel ? ` (${item.deliveryChannel})` : ''}${item.emsTrackingNo ? ` · ${item.emsTrackingNo}` : ''}`
                                  : <span className="text-white/35">จัดส่ง: -</span>}
                              </div>
                            </td>
                            <td className="py-2.5 px-2.5 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5 text-[11px] text-white/90">
                                <span
                                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_DOT_CLASS[item.workflowStatus]}`}
                                />
                                {statusMeta.colorName}
                              </span>
                            </td>
                            <td className="py-2.5 px-2.5 text-right font-mono tabular-nums text-white/90 whitespace-nowrap">
                              {item.price > 0 ? item.price.toLocaleString('th-TH') : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              {duplicateMode === 'import_all' ? (
                                <span className="text-[11px] font-semibold text-emerald-300">
                                  นำเข้าใหม่
                                </span>
                              ) : match ? (
                                <span
                                  className={`text-[11px] font-semibold ${
                                    duplicateMode === 'update'
                                      ? 'text-sky-300'
                                      : 'text-amber-300'
                                  }`}
                                >
                                  {duplicateMode === 'update' ? 'จะอัปเดตเดิม' : 'ซ้ำ (จะข้าม)'}
                                </span>
                              ) : (
                                <span className="text-[11px] font-semibold text-emerald-300">
                                  เคสใหม่
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Preview Table Pagination Bar */}
                {filteredPreviewIndices.length > PREVIEW_PAGE_SIZE && (
                  <div className="px-3.5 py-2.5 border-t border-white/10 bg-black/35 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#C8B6AE]">
                    <span className="font-mono tabular-nums">
                      แสดงแถว {pageStartItem.toLocaleString('th-TH')}–
                      {pageEndItem.toLocaleString('th-TH')} จาก{' '}
                      {filteredPreviewIndices.length.toLocaleString('th-TH')} รายการ
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={safePreviewPage <= 1}
                        onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/12 border border-white/10 text-white disabled:opacity-35 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        ก่อนหน้า
                      </button>
                      <span className="px-2 font-mono tabular-nums text-white">
                        หน้า {safePreviewPage} / {totalPreviewPages}
                      </span>
                      <button
                        type="button"
                        disabled={safePreviewPage >= totalPreviewPages}
                        onClick={() =>
                          setPreviewPage((p) => Math.min(totalPreviewPages, p + 1))
                        }
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/12 border border-white/10 text-white disabled:opacity-35 inline-flex items-center gap-1 cursor-pointer"
                      >
                        ถัดไป
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Live Batch Progress Bar */}
          {importing && (
            <div className="rounded-2xl border border-[#FF9457]/35 bg-[#FF6B2B]/10 p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-white inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#FFCF90]" />
                  {progress.label || 'กำลังบันทึกเคสเข้าฐานข้อมูล Firestore...'}
                </span>
                <span className="font-mono tabular-nums text-[#FFCF90] font-semibold">
                  {progress.done.toLocaleString('th-TH')} / {progress.total.toLocaleString('th-TH')}{' '}
                  ({progressPercent}%)
                </span>
              </div>
              <div className="h-2 rounded-full bg-black/40 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#FF6B2B] to-[#FFCF90] transition-all duration-200"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-white/10 bg-black/30 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-[#A9B4C6]">
            {parsedCases.length > 0 ? (
              duplicateMode === 'import_all' ? (
                <span>
                  พร้อมนำเข้าทั้งหมด:{' '}
                  <strong className="text-emerald-300 font-mono tabular-nums">
                    {summaryCounts.selectedTotal.toLocaleString('th-TH')} เคส
                  </strong>{' '}
                  (ไม่ตัดรายการซ้ำ)
                </span>
              ) : (
                <span>
                  พร้อมดำเนินการ:{' '}
                  <strong className="text-white font-mono tabular-nums">
                    {summaryCounts.newCount.toLocaleString('th-TH')} เคสใหม่
                  </strong>
                  {summaryCounts.dupCount > 0 && (
                    <>
                      {' · '}
                      <strong
                        className={`font-mono tabular-nums ${
                          duplicateMode === 'update' ? 'text-sky-300' : 'text-amber-300'
                        }`}
                      >
                        {duplicateMode === 'update'
                          ? `อัปเดต ${summaryCounts.dupCount.toLocaleString('th-TH')} เคสเดิม`
                          : `ข้ามซ้ำ ${summaryCounts.dupCount.toLocaleString('th-TH')} เคส`}
                      </strong>
                    </>
                  )}
                </span>
              )
            ) : (
              <span>เลือกไฟล์ Excel / CSV หรือวางตารางเพื่อตรวจสอบก่อนบันทึก</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={importing}
              onClick={onClose}
              className="btn-glass px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-40"
            >
              {importResult ? 'ปิดหน้าต่าง' : 'ยกเลิก'}
            </button>
            <button
              type="button"
              disabled={importing || summaryCounts.selectedTotal === 0}
              onClick={() => void handleConfirmImport()}
              className="btn-luxury-orange px-5 py-2.5 rounded-xl text-xs font-semibold inline-flex items-center gap-2 cursor-pointer disabled:opacity-40"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  กำลังนำเข้า...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  ยืนยันนำเข้า {summaryCounts.selectedTotal.toLocaleString('th-TH')} รายการ
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
