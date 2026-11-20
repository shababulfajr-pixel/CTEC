import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ClipboardPaste,
  Download,
  FileSpreadsheet,
  Loader2,
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
} from '../data/officeCaseReferenceData';
import {
  findMatchingExistingCase,
  importOfficeCasesBatch,
  type BatchImportResult,
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

  // Parsed preview state
  const [parsedCases, setParsedCases] = useState<OfficeCaseSeedInput[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [detectedFormat, setDetectedFormat] = useState<ImportDetectedFormat>('unknown');
  const [sourceLabel, setSourceLabel] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);

  // Import execution state
  const [duplicateMode, setDuplicateMode] = useState<'skip' | 'update'>('skip');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number }>({
    done: 0,
    total: 0,
  });
  const [importResult, setImportResult] = useState<BatchImportResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const existingMatches = useMemo(() => {
    return parsedCases.map((item) => findMatchingExistingCase(item, officeCases));
  }, [parsedCases, officeCases]);

  const summaryCounts = useMemo(() => {
    let selectedTotal = 0;
    let newCount = 0;
    let dupCount = 0;
    parsedCases.forEach((_, idx) => {
      if (!selectedIndices.has(idx)) return;
      selectedTotal += 1;
      if (existingMatches[idx]) dupCount += 1;
      else newCount += 1;
    });
    return { selectedTotal, newCount, dupCount };
  }, [parsedCases, selectedIndices, existingMatches]);

  if (!open) return null;

  const applyParsedPreview = (
    cases: OfficeCaseSeedInput[],
    format: ImportDetectedFormat,
    label: string,
    warnings: string[]
  ) => {
    setImportResult(null);
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
    setSelectedIndices(new Set(cases.map((_, idx) => idx)));
  };

  const handleFileSelected = async (file: File) => {
    setParsing(true);
    setParseError(null);
    setImportResult(null);
    try {
      const res = await parseCtecOfficeUploadDetailed(file);
      applyParsedPreview(
        res.cases,
        res.detectedFormat,
        `${file.name}${res.sheetName && res.sheetName !== file.name ? ` (${res.sheetName})` : ''}`,
        res.warnings
      );
    } catch (err) {
      console.error('Import file parse failed:', err);
      setParsedCases([]);
      setSelectedIndices(new Set());
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
    const res = parseCtecOfficeTextDetailed(pasteText);
    applyParsedPreview(res.cases, res.detectedFormat, 'ข้อมูลวางจากตาราง', res.warnings);
  };

  const handleClearPreview = () => {
    setParsedCases([]);
    setSelectedIndices(new Set());
    setDetectedFormat('unknown');
    setSourceLabel('');
    setParseError(null);
    setImportResult(null);
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
      setSelectedIndices(new Set(parsedCases.map((_, idx) => idx)));
    }
  };

  const handleDownloadTemplate = () => {
    downloadOfficeCaseTemplateExcel();
    onNotifyToast('ดาวน์โหลดไฟล์แม่แบบ Excel (.xlsx) สำหรับนำเข้าเคสแล้ว');
  };

  const handleConfirmImport = async () => {
    if (importing || summaryCounts.selectedTotal === 0) return;

    const rowsToImport = parsedCases.filter((_, idx) => selectedIndices.has(idx));
    setImporting(true);
    setImportResult(null);
    setProgress({ done: 0, total: rowsToImport.length });

    try {
      const result = await importOfficeCasesBatch(
        rowsToImport,
        officeCases,
        currentUser,
        {
          duplicateMode,
          sourceLabel,
          onProgress: (done, total) => setProgress({ done, total }),
        }
      );
      setImportResult(result);

      if (result.imported > 0 || result.updated > 0) {
        const parts: string[] = [];
        if (result.imported > 0) parts.push(`นำเข้าใหม่ ${result.imported} เคส`);
        if (result.updated > 0) parts.push(`อัปเดต ${result.updated} เคส`);
        if (result.skipped > 0) parts.push(`ข้ามซ้ำ ${result.skipped}`);
        if (result.failed > 0) parts.push(`ไม่สำเร็จ ${result.failed}`);
        onNotifyToast(`นำเข้าเคสเสร็จสิ้น: ${parts.join(' · ')}`);
      } else if (result.failed > 0) {
        onNotifyToast(`นำเข้าไม่สำเร็จ ${result.failed} รายการ กรุณาดูรายละเอียดในหน้าต่างนำเข้า`);
      } else {
        onNotifyToast(`ไม่พบเคสใหม่ (ข้อมูลซ้ำทั้งหมด ${result.skipped} รายการ)`);
      }
    } catch (err) {
      console.error('Batch import unexpected error:', err);
      onNotifyToast('เกิดข้อผิดพลาดระหว่างนำเข้าเคส กรุณาลองใหม่อีกครั้ง');
    } finally {
      setImporting(false);
    }
  };

  const progressPercent =
    progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

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
              รองรับไฟล์ทะเบียน CTEC ต้นฉบับ (รวมถึงไฟล์ไม่มีนามสกุล), ไฟล์ Excel ที่ส่งออก, ไฟล์ CSV ภาษาไทย และตาราง Excel / Google Sheets ทั่วไป
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
              className={`rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center transition ${
                dragActive
                  ? 'border-[#FF9457] bg-[#FF6B2B]/15'
                  : 'border-white/15 bg-white/[0.03] hover:border-white/25'
              }`}
            >
              {/* No restrictive accept attribute so extensionless CSV files (e.g. รับเคสคิว19-11-69) can always be picked */}
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
                ลากไฟล์มาวางที่นี่ หรือกดเลือกไฟล์จากเครื่อง
              </p>
              <p className="text-xs text-[#A9B4C6] mt-1 max-w-xl mx-auto">
                รองรับ <span className="text-white/90">.xlsx, .xls, .csv, .tsv</span> รวมถึงไฟล์ทะเบียน CTEC ที่ไม่มีนามสกุล (เช่น <span className="font-mono text-[#FFCF90]">รับเคสคิว19-11-69</span>) อ่านภาษาไทยอัตโนมัติทั้ง UTF-8 และ Windows-874
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
                    แนะนำให้คัดลอกรวมแถวหัวคอลัมน์ (เช่น <span className="text-white/85">เลขที่รับงาน, โรงพยาบาล, ชื่อคนไข้, แพทย์, ราคา</span>) — ไม่จำเป็นต้องครบทุกช่อง
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
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="text-emerald-200 font-semibold">
                  นำเข้าใหม่: {importResult.imported} เคส
                </span>
                {importResult.updated > 0 && (
                  <span className="text-sky-200 font-semibold">
                    อัปเดตเคสเดิม: {importResult.updated} เคส
                  </span>
                )}
                <span className="text-white/75">ข้ามรายการซ้ำ: {importResult.skipped} เคส</span>
                {importResult.failed > 0 && (
                  <span className="text-rose-300 font-semibold">
                    ไม่สำเร็จ: {importResult.failed} เคส
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
                    <span className="font-semibold text-white">
                      พบ {parsedCases.length} รายการ
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
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#C8B6AE]">
                    <span>เลือกนำเข้า {summaryCounts.selectedTotal} รายการ</span>
                    <span className="text-emerald-300">เคสใหม่ {summaryCounts.newCount}</span>
                    {summaryCounts.dupCount > 0 && (
                      <span className="text-amber-300">
                        ซ้ำกับในระบบ {summaryCounts.dupCount}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Duplicate Handling Mode */}
                  <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 text-[11px]">
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

              {/* Preview Data Table */}
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
                      {parsedCases.map((item, idx) => {
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
                              checked ? 'bg-white/[0.03] hover:bg-white/[0.06]' : 'opacity-45 hover:opacity-70'
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
                                {item.jobNumber || <span className="text-white/40">ไม่ระบุเลขงาน</span>}
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
                                {item.doctorName || (item.patientHN ? `HN: ${item.patientHN}` : '-')}
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
                            <td className="py-2.5 px-2.5 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5 text-[11px] text-white/90">
                                <span
                                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_DOT_CLASS[item.workflowStatus]}`}
                                />
                                {statusMeta.colorName}
                              </span>
                            </td>
                            <td className="py-2.5 px-2.5 text-right font-mono text-white/90 whitespace-nowrap">
                              {item.price > 0 ? item.price.toLocaleString('th-TH') : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              {match ? (
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
              </div>
            </div>
          )}

          {/* Live Progress Bar */}
          {importing && (
            <div className="rounded-2xl border border-[#FF9457]/35 bg-[#FF6B2B]/10 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#FFCF90]" />
                  กำลังบันทึกเคสเข้าฐานข้อมูล Firestore...
                </span>
                <span className="font-mono text-[#FFCF90] font-semibold">
                  {progress.done} / {progress.total} ({progressPercent}%)
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
              <span>
                พร้อมดำเนินการ:{' '}
                <strong className="text-white">{summaryCounts.newCount} เคสใหม่</strong>
                {summaryCounts.dupCount > 0 && (
                  <>
                    {' · '}
                    <strong className={duplicateMode === 'update' ? 'text-sky-300' : 'text-amber-300'}>
                      {duplicateMode === 'update'
                        ? `อัปเดต ${summaryCounts.dupCount} เคสเดิม`
                        : `ข้ามซ้ำ ${summaryCounts.dupCount} เคส`}
                    </strong>
                  </>
                )}
              </span>
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
                  ยืนยันนำเข้า {summaryCounts.selectedTotal} รายการ
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
