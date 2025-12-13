import { useEffect, useState } from 'react';
import { Image as ImageIcon, Camera, Filter } from 'lucide-react';
import { packageAPI, deviceAPI } from '../services/api';
import { toast } from '../hooks/useToast';

// Import new components
import PhotoItem from '../components/PhotoItem';
import Lightbox from '../components/Lightbox';
import EmptyState from '../components/EmptyState';
import SkeletonCard from '../components/SkeletonCard';
import ConfirmDialog from '../components/ConfirmDialog';

type FilterType = 'today' | '7days' | 'all';

export default function Gallery() {
  const [packages, setPackages] = useState<any[]>([]);
  const [filteredPackages, setFilteredPackages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      setIsLoading(true);
      const response = await packageAPI.getPackages(100, 0);
      setPackages(response.packages || []);
      toast.success(`${response.packages?.length || 0} foto dimuat`);
    } catch (error) {
      console.error('Load packages error:', error);
      toast.error('Gagal memuat galeri');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Filter packages based on selected filter
  useEffect(() => {
    if (!packages.length) {
      setFilteredPackages([]);
      return;
    }
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    let filtered = packages;
    
    if (filter === 'today') {
      filtered = packages.filter(p => new Date(p.timestamp) >= today);
    } else if (filter === '7days') {
      filtered = packages.filter(p => new Date(p.timestamp) >= sevenDaysAgo);
    }
    
    setFilteredPackages(filtered);
  }, [packages, filter]);

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      await packageAPI.deletePackage(deleteId);
      setPackages(packages.filter(p => p.id !== deleteId));
      setDeleteId(null);
      toast.success('✅ Foto berhasil dihapus');
    } catch (error: any) {
      toast.error(error.message || 'Gagal menghapus foto');
    }
  };
  
  const handleShare = async (photoUrl: string) => {
    // Share via WhatsApp or system share
    const fullUrl = `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://13.213.57.228:9090'}${photoUrl}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SmartParcel Photo',
          text: 'Foto dari SmartParcel',
          url: fullUrl
        });
        toast.success('Berhasil dibagikan');
      } catch {
        // Share cancelled by user - silent fail
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(fullUrl);
      toast.success('📋 Link foto disalin ke clipboard');
    }
  };
  
  const handleCapture = async () => {
    try {
      await deviceAPI.capture();
      toast.success('📸 Perintah capture dikirim!');
      // Reload after a delay
      setTimeout(loadPackages, 2000);
    } catch (error) {
      toast.error('Gagal mengirim perintah');
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
              <ImageIcon className="w-6 h-6 pulse-soft" />
              <h1 className="text-2xl font-bold tracking-tight">Galeri Foto</h1>
            </div>
            <p className="text-sm opacity-90">
              {filter !== 'all' && packages.length > 0 ? (
                <span className="font-semibold">{filteredPackages.length} dari {packages.length}</span>
              ) : (
                <span className="font-semibold">{packages.length}</span>
              )} foto total
            </p>
          </div>
          <button
            onClick={handleCapture}
            className="p-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl transition-smooth hover-lift active-press border border-white/30"
            title="Ambil foto baru"
            aria-label="Ambil foto baru"
          >
            <Camera className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {/* Filter Chips - PREMIUM */}
      {packages.length > 0 && (
        <div className="flex items-center gap-3 fade-in">
          <div className="w-10 h-10 bg-[var(--card)] rounded-xl flex items-center justify-center border border-[var(--border)] shadow-[var(--shadow-sm)]">
            <Filter className="w-4 h-4 text-[var(--muted)]" />
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setFilter('today')}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-smooth whitespace-nowrap shadow-[var(--shadow-sm)] ${
                filter === 'today'
                  ? 'bg-[var(--brand-600)] text-white shadow-[var(--shadow-md)] scale-105'
                  : 'bg-[var(--card)] text-[var(--ink-light)] hover:bg-[var(--gray-100)] dark:hover:bg-[var(--gray-800)] border border-[var(--border)]'
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => setFilter('7days')}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-smooth whitespace-nowrap shadow-[var(--shadow-sm)] ${
                filter === '7days'
                  ? 'bg-[var(--brand-600)] text-white shadow-[var(--shadow-md)] scale-105'
                  : 'bg-[var(--card)] text-[var(--ink-light)] hover:bg-[var(--gray-100)] dark:hover:bg-[var(--gray-800)] border border-[var(--border)]'
              }`}
            >
              7 Hari
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-smooth whitespace-nowrap shadow-[var(--shadow-sm)] ${
                filter === 'all'
                  ? 'bg-[var(--brand-600)] text-white shadow-[var(--shadow-md)] scale-105'
                  : 'bg-[var(--card)] text-[var(--ink-light)] hover:bg-[var(--gray-100)] dark:hover:bg-[var(--gray-800)] border border-[var(--border)]'
              }`}
            >
              Semua
            </button>
          </div>
        </div>
      )}
      
      {/* Loading State */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} lines={2} className="h-48" />)}
        </div>
      ) : filteredPackages.length === 0 ? (
        /* Empty State */
        <div className="scale-in">
          <EmptyState
            icon={<ImageIcon className="w-12 h-12" />}
            title={filter === 'all' ? 'Belum ada foto' : 'Tidak ada foto'}
            subtitle={filter === 'all' ? 'Foto paket akan muncul di sini' : `Tidak ada foto untuk filter "${filter === 'today' ? 'Hari Ini' : '7 Hari'}"`}
            action={{
              label: 'Ambil Foto Sekarang',
              onClick: handleCapture
            }}
          />
        </div>
      ) : (
        /* Photo Grid - PREMIUM */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 fade-in">
          {filteredPackages.map((pkg, index) => (
            <div key={pkg.id} className="hover-lift transition-smooth">
              <PhotoItem
                src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://13.213.57.228:9090'}${pkg.photoUrl}`}
                thumbSrc={pkg.thumbUrl ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://13.213.57.228:9090'}${pkg.thumbUrl}` : undefined}
                timestamp={new Date(pkg.timestamp).toLocaleString('id-ID', { 
                  day: '2-digit', 
                  month: 'short', 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
                status="success"
                onClick={() => setLightboxIndex(index)}
              />
            </div>
          ))}
        </div>
      )}
      
      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          photos={filteredPackages.map(p => ({
            id: p.id,
            src: `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://13.213.57.228:9090'}${p.photoUrl}`,
            timestamp: new Date(p.timestamp).toLocaleString('id-ID')
          }))}
          currentIndex={lightboxIndex}
          isOpen={true}
          onClose={() => setLightboxIndex(null)}
          onShare={() => handleShare(filteredPackages[lightboxIndex].photoUrl)}
        />
      )}
      
      {/* Delete Confirmation Dialog */}
      {deleteId && (
        <ConfirmDialog
          title="Hapus Foto"
          message="Foto yang dihapus tidak dapat dikembalikan. Lanjutkan?"
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
          type="danger"
        />
      )}
    </div>
  );
}
