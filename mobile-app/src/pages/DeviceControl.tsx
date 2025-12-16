import { useEffect, useState } from 'react';
import { RotateCw, Settings as SettingsIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import { deviceAPI } from '../services/api';
import { toast } from '../hooks/useToast';
import { useStore } from '../store/useStore';

// Import new components
import StatusChip from '../components/StatusChip';
import OfflineBanner from '../components/OfflineBanner';
import RangeField from '../components/RangeField';
import DurationField from '../components/DurationField';
import StickyApplyBar from '../components/StickyApplyBar';
import SectionCard from '../components/SectionCard';
import SkeletonCard from '../components/SkeletonCard';

export default function DeviceControl() {
  const { deviceStatus } = useStore();
  
  const [settings, setSettings] = useState<any>({
    ultra: { min: 12, max: 25 },
    lock: { ms: 5000 },
    buzzer: { ms: 60000 },
    doorLock: { ms: 3000 }
  });
  const [originalSettings, setOriginalSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [lastApplied, setLastApplied] = useState<Date | null>(null);
  
  // Track if settings have changed
  const isDirty = originalSettings && JSON.stringify(settings) !== JSON.stringify(originalSettings);
  
  // Validation
  const isMinMaxValid = settings.ultra.min < settings.ultra.max;

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsPageLoading(true);
      const response = await deviceAPI.getSettings();
      setSettings(response.settings);
      setOriginalSettings(response.settings);
      toast.success('Pengaturan dimuat');
    } catch (error) {
      console.error('Load settings error:', error);
      toast.error('Gagal memuat pengaturan');
    } finally {
      setIsPageLoading(false);
    }
  };
  
  const handleReset = () => {
    if (originalSettings) {
      setSettings(originalSettings);
      toast.info('Pengaturan direset');
    }
  };

  const handleSave = async () => {
    if (!isMinMaxValid) {
      toast.error('Jarak minimum harus lebih kecil dari maksimum');
      return;
    }
    
    try {
      setIsLoading(true);
      await deviceAPI.updateSettings(settings);
      setOriginalSettings(settings);
      setLastApplied(new Date());
      toast.success('✅ Pengaturan berhasil diterapkan!');
    } catch (error: any) {
      toast.error(error.message || 'Gagal menyimpan pengaturan');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-[var(--bg)] p-4 pb-24 space-y-4 page-enter">
      {/* Header Card - PREMIUM */}
      <div className="gradient-brand rounded-2xl p-6 text-white shadow-[var(--shadow-xl)] hover-lift transition-smooth overflow-hidden relative">
        <div className="absolute inset-0 shimmer-premium opacity-10 pointer-events-none" />
        
        <div className="flex items-start justify-between relative z-10">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <SettingsIcon className="w-6 h-6 pulse-soft" />
              <h1 className="text-2xl font-bold tracking-tight">Kontrol Device</h1>
            </div>
            <p className="text-sm opacity-90">Konfigurasi parameter ESP32</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusChip 
              status={deviceStatus?.isOnline ? 'online' : 'offline'}
              className="bg-white/20 backdrop-blur-sm border border-white/30"
            />
            <button
              onClick={loadSettings}
              disabled={isLoading}
              className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl transition-smooth hover-lift active-press disabled:opacity-50 border border-white/30"
              title="Refresh pengaturan"
              aria-label="Refresh pengaturan"
            >
              <RotateCw className={`w-4 h-4 ${isLoading ? 'rotate-smooth' : ''}`} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Offline Banner */}
      {!deviceStatus?.isOnline && (
        <OfflineBanner 
          message="Device offline - Perubahan tidak akan diterapkan"
          onRetry={loadSettings}
        />
      )}
      
      {/* Last Applied Indicator - PREMIUM */}
      {lastApplied && !isDirty && (
        <div className="bg-[var(--success)]/10 border-2 border-[var(--success)]/20 rounded-xl p-4 flex items-center gap-3 scale-in shadow-[var(--shadow-sm)]">
          <div className="w-10 h-10 bg-[var(--success)]/20 rounded-xl flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-[var(--success)] pulse-soft" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[var(--success)]">Pengaturan diterapkan</p>
            <p className="text-xs text-[var(--success)]/70">
              {lastApplied.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isPageLoading ? (
        <div className="space-y-4">
          <SkeletonCard lines={4} />
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Ultrasonic Settings with RangeField */}
          <SectionCard
            title="Sensor Jarak (HC-SR04)"
            subtitle="Window deteksi paket masuk"
          >
            <RangeField
              label="Range Jarak Deteksi"
              minValue={settings.ultra.min}
              maxValue={settings.ultra.max}
              onMinChange={(val) => setSettings({
                ...settings,
                ultra: { ...settings.ultra, min: val }
              })}
              onMaxChange={(val) => setSettings({
                ...settings,
                ultra: { ...settings.ultra, max: val }
              })}
              min={0}
              max={400}
              step={1}
              unit="cm"
              help="Paket akan terdeteksi jika jarak dalam range ini"
            />
            
            {/* Visual indicator - PREMIUM */}
            <div className="mt-4 p-4 bg-[var(--info-light)] dark:bg-[var(--info)]/10 border-2 border-[var(--info)]/20 rounded-xl shadow-[var(--shadow-sm)]">
              <p className="text-sm font-semibold text-[var(--info)] mb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Rekomendasi
              </p>
              <p className="text-sm text-[var(--ink)] font-medium">
                Min: <strong className="text-[var(--brand-600)]">12cm</strong> • Max: <strong className="text-[var(--brand-600)]">25cm</strong>
              </p>
              <p className="text-xs text-[var(--muted)] mt-1">
                Range ini optimal untuk deteksi paket berukuran sedang
              </p>
            </div>
          </SectionCard>

          {/* Solenoid Holder Settings with DurationField */}
          <SectionCard
            title="Penahan Paket (Solenoid)"
            subtitle="Durasi membuka penahan saat paket diambil"
          >
            <DurationField
              label="Durasi Buka"
              value={settings.lock.ms}
              onChange={(val) => setSettings({
                ...settings,
                lock: { ms: val }
              })}
              min={1000}
              max={60000}
              step={500}
              help="Waktu solenoid tetap terbuka (1.000 ms = 1 detik)"
            />
          </SectionCard>

          {/* Buzzer Settings with DurationField */}
          <SectionCard
            title="Buzzer"
            subtitle="Durasi bunyi notifikasi saat paket datang"
          >
            <DurationField
              label="Durasi Bunyi"
              value={settings.buzzer.ms}
              onChange={(val) => setSettings({
                ...settings,
                buzzer: { ms: val }
              })}
              min={1000}
              max={300000}
              step={1000}
              help="Buzzer akan berbunyi selama durasi ini (1.000 ms = 1 detik)"
            />
          </SectionCard>

          {/* Door Lock Settings with DurationField */}
          <SectionCard
            title="Kunci Pintu"
            subtitle="Durasi membuka kunci pintu saat unlock"
          >
            <DurationField
              label="Durasi Buka"
              value={settings.doorLock?.ms || 3000}
              onChange={(val) => setSettings({
                ...settings,
                doorLock: { ms: val }
              })}
              min={1000}
              max={30000}
              step={500}
              help="Kunci pintu tetap terbuka selama durasi ini (maks 30 detik)"
            />
          </SectionCard>
          
          {/* Validation Warning - PREMIUM */}
          {!isMinMaxValid && (
            <div className="shake">
              <div className="p-4 bg-[var(--danger-light)] dark:bg-[var(--danger)]/10 border-2 border-[var(--danger)]/20 rounded-xl flex items-start gap-3 shadow-[var(--shadow-md)]">
                <div className="w-10 h-10 bg-[var(--danger)]/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-[var(--danger)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--danger)]">Validasi Gagal</p>
                  <p className="text-sm text-[var(--ink)] mt-1">
                    Jarak minimum harus lebih kecil dari jarak maksimum
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Sticky Apply Bar - only shows when there are changes */}
      <StickyApplyBar
        isDirty={isDirty}
        isLoading={isLoading}
        onReset={handleReset}
        onCancel={handleReset}
        onApply={handleSave}
      />
    </div>
  );
}
