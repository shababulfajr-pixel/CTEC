import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { BarChart3, BellRing, FileSpreadsheet, Lock, MapPin, ShieldCheck } from 'lucide-react';
import { auth, googleProvider } from '../firebase';

export const LoginView: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถเข้าสู่ระบบได้';
      if (msg.includes('popup-closed-by-user')) {
        setError('ยกเลิกการเข้าสู่ระบบ กรุณากดปุ่มด้านล่างเพื่อลองใหม่อีกครั้ง');
      } else {
        setError(`เข้าสู่ระบบไม่สำเร็จ: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const capabilities = [
    {
      icon: MapPin,
      title: 'แผนที่ความหนาแน่นโรงพยาบาล',
      desc: 'ติดตามสถานะและปริมาณเคสผ่าตัดของโรงพยาบาลแต่ละแห่งบนแผนที่จริง แสดงรัศมีความหนาแน่นชัดเจน',
    },
    {
      icon: BarChart3,
      title: 'กราฟจำนวนเคสรายเดือนและรายปี',
      desc: 'วิเคราะห์แนวโน้มจำนวนเคสแต่ละเดือน เทียบผลงานข้ามปี 2024–2026 และอันดับผู้แทนขายบนมือถือ',
    },
    {
      icon: BellRing,
      title: 'แจ้งเตือนสรุปยอดขายรายวันเรียลไทม์',
      desc: 'ซิงก์ความเคลื่อนไหวการปิดดีลและสรุปยอดขายประจำวันผ่าน Firebase Firestore ทันทีทุกอุปกรณ์',
    },
    {
      icon: FileSpreadsheet,
      title: 'ส่งออกรายงาน PDF / Excel และสิทธิ์ RBAC',
      desc: 'ออกรายงานผู้บริหารได้ทันที พร้อมควบคุมสิทธิ์ระดับผู้ดูแล ผู้บริหาร ผู้จัดการ และผู้แทนขาย',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0F131C] text-[#DFE2EF] relative overflow-hidden flex flex-col lg:flex-row">
      {/* Ambient Luxury Orange & Gold Glows */}
      <div className="fixed -top-40 -left-24 w-[480px] h-[480px] rounded-full bg-[#FF5E1E]/15 blur-[140px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[520px] h-[520px] rounded-full bg-[#FFAA00]/12 blur-[150px] pointer-events-none" />

      {/* Left Brand & Value Architecture */}
      <div className="relative z-10 lg:w-[56%] p-8 sm:p-12 lg:p-16 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white p-1.5 flex items-center justify-center shrink-0 overflow-hidden shadow-[0_8px_24px_rgba(255,94,30,0.32)] ring-1 ring-white/25">
              <img
                src="/assets/aistudio/IMG_0007_bea31e22.jpeg"
                alt="CTEC Customized Technologies Co., Ltd."
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="text-base font-bold tracking-tight text-[#F4F6FB]">
                CTEC Customized Technologies
              </div>
              <div className="text-[11px] text-[#FFCF90] font-medium">
                CTEC Medical Devices CRM · sale-rep-ctec
              </div>
            </div>
          </div>

          <div className="mt-12 max-w-xl">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#F4F6FB] leading-tight">
              ศูนย์บริหารลูกค้าโรงพยาบาลและติดตามเคสผ่าตัดระดับผู้บริหาร
            </h1>
            <p className="mt-4 text-base text-[#B5BDCB] leading-relaxed">
              รวมศูนย์ข้อมูลบัญชีโรงพยาบาล ปริมาณเคสรายเดือนและรายปี ไปป์ไลน์การขาย แผนที่ความหนาแน่นพื้นที่ และรายงานผู้บริหารไว้ในระบบเดียว
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            {capabilities.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="glass-panel rounded-2xl p-5">
                  <Icon className="w-5 h-5 text-[#FFB59D] mb-3" />
                  <h2 className="text-sm font-semibold text-[#F4F6FB]">{item.title}</h2>
                  <p className="mt-1.5 text-xs text-[#B5BDCB] leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/[0.08] flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#8E97AB]">
          <span>ยืนยันตัวตนผ่าน Google OAuth</span>
          <span aria-hidden="true">·</span>
          <span>ควบคุมสิทธิ์แยกบทบาท (RBAC)</span>
          <span aria-hidden="true">·</span>
          <span>บันทึกประวัติความปลอดภัยอัตโนมัติ</span>
        </div>
      </div>

      {/* Right Apple Frosted Glass Authentication Card */}
      <div className="relative z-10 lg:w-[44%] flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md glass-panel rounded-3xl p-8">
          <div className="flex items-center gap-3.5 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-[#FF5E1E]/18 border border-[#FF5E1E]/30 text-[#FFB59D] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#F4F6FB]">เข้าสู่ระบบใช้งาน</h2>
              <p className="text-xs text-[#B5BDCB] mt-0.5">
                สำหรับผู้บริหาร แอดมิน และผู้แทนขาย CTEC
              </p>
            </div>
          </div>

          <p className="text-sm text-[#B5BDCB] leading-relaxed mb-6">
            เข้าสู่ระบบด้วยบัญชี Google ผู้ใช้งานใหม่จะต้องกรอกข้อมูลลงทะเบียน (ชื่อ-สกุล และตำแหน่ง) และรอผู้ดูแลระบบอนุมัติก่อนจึงจะเข้าถึงข้อมูลบริษัทได้
          </p>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/15 border border-rose-400/30 text-xs text-rose-200 leading-relaxed">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="btn-luxury-orange w-full min-h-[46px] flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap disabled:opacity-60"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M21.35 11.1h-9.18v2.98h5.27c-.23 1.48-1.71 4.35-5.27 4.35-3.17 0-5.76-2.63-5.76-5.88s2.59-5.88 5.76-5.88c1.81 0 3.02.77 3.71 1.43l2.53-2.44C16.79 4.15 14.69 3.2 12.17 3.2 7.09 3.2 3 7.34 3 12.55s4.09 9.35 9.17 9.35c5.29 0 8.8-3.72 8.8-8.95 0-.6-.06-1.06-.14-1.85z"
              />
            </svg>
            {loading ? 'กำลังตรวจสอบสิทธิ์...' : 'เข้าสู่ระบบด้วย Google'}
          </button>

          <div className="mt-6 pt-5 border-t border-white/[0.08] space-y-2 text-xs text-[#8E97AB]">
            <div className="flex items-center gap-2 text-[#DFE2EF] font-medium">
              <Lock className="w-3.5 h-3.5 text-[#FFCF90] shrink-0" />
              <span>มาตรฐานความปลอดภัยข้อมูลองค์กร</span>
            </div>
            <p className="leading-relaxed">
              ข้อมูลส่วนบุคคลถูกแยกจัดเก็บแบบจำกัดสิทธิ์ และทุกการเปลี่ยนแปลงสถานะการขายหรือสิทธิ์ผู้ใช้จะถูกบันทึกใน Audit Log
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
