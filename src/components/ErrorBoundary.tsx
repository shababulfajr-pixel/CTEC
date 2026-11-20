import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface State {
  hasError: boolean;
  message: string;
  isQuota: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '', isQuota: false };
  }

  static getDerivedStateFromError(error: Error): State {
    const raw = error?.message || 'เกิดข้อผิดพลาดที่ไม่คาดคิด';
    const isQuota = raw.toLowerCase().includes('quota exceeded');
    let friendly = raw;
    try {
      const parsed = JSON.parse(raw) as { error?: string; operationType?: string; path?: string };
      if (parsed.error) {
        friendly = `สิทธิ์การเข้าถึงหรือการเชื่อมต่อฐานข้อมูลขัดข้อง (${parsed.operationType || 'operation'} · ${parsed.path || 'unknown'}): ${parsed.error}`;
      }
    } catch {
      // Plain error message
    }
    return { hasError: true, message: friendly, isQuota };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('CRM ErrorBoundary caught:', error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-[#0f131c] text-[#dfe2ef] flex items-center justify-center p-6">
        <div className="max-w-lg w-full apple-glass rounded-2xl p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1 min-w-0">
              <h2 className="text-base font-semibold text-white">
                {this.state.isQuota
                  ? 'โควตาการใช้งานฐานข้อมูลวันนี้ครบกำหนดแล้ว'
                  : 'พบข้อผิดพลาดในการโหลดข้อมูลระบบ'}
              </h2>
              <p className="text-sm text-[#e3beb3] break-words leading-relaxed">
                {this.state.isQuota
                  ? 'โควตารายวันของ Firestore ฟรีจะรีเซ็ตในวันถัดไป หรือคุณสามารถอัปเกรดแผนการใช้งานใน Firebase Console'
                  : this.state.message}
              </p>
            </div>
          </div>
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg orange-cta whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              โหลดหน้าใหม่
            </button>
          </div>
        </div>
      </div>
    );
  }
}
