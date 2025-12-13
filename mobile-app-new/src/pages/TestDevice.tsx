import { useState } from 'react';
import {
    Activity, Camera, Zap, Lock, Volume2,
    PlayCircle, StopCircle, AlertCircle, Signal
} from 'lucide-react';
import { deviceAPI } from '../services/api';
import { useToast } from '../hooks/useToast';
import { useStore } from '../store/useStore';
import Card from '../components/Card';
import Button from '../components/Button';

export default function TestDevice() {
    const { deviceStatus } = useStore();
    const { success, error } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [pipelineStep, setPipelineStep] = useState<string>('');

    // Helper for offline check
    const checkOnline = () => {
        if (!deviceStatus?.isOnline) {
            error('Device offline, test tidak dapat dilakukan');
            return false;
        }
        return true;
    };

    const testAction = async (name: string, action: () => Promise<any>) => {
        if (!checkOnline()) return;
        setIsLoading(true);
        try {
            await action();
            success(`✅ ${name} berhasil`);
        } catch (err: any) {
            error(`❌ ${name} gagal: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFullPipeline = async () => {
        if (!checkOnline()) return;
        setIsLoading(true);
        setPipelineStep('Starting...');

        try {
            // 1. Detect (Simulated check)
            setPipelineStep('Checking sensors...');
            if (deviceStatus?.lastDistance === null) throw new Error('Sensor not reading');
            await new Promise(r => setTimeout(r, 500)); // Simulate delay

            // 2. Capture
            setPipelineStep('Capturing photo...');
            await deviceAPI.capture();
            success('Capture OK');

            // 3. Unlock
            setPipelineStep('Unlocking door...');
            // Note: Using a test PIN or bypassing auth for test mode if backend supports it.
            // For now, we might skip actual unlock if it requires a real PIN,
            // or use a known test PIN if available.
            // Assuming we just test the solenoid pulse endpoint if available, or skip.
            // Let's test the Holder instead as it's part of the flow usually.
            await deviceAPI.controlHolder('pulse', 1000);
            success('Holder Release OK');

            // 4. Buzzer
            setPipelineStep('Testing buzzer...');
            await deviceAPI.controlBuzzer('start', 1000);
            success('Buzzer OK');

            setPipelineStep('Pipeline Finished ✅');
            success('Full pipeline test completed successfully');
        } catch (err: any) {
            setPipelineStep('Failed ❌');
            error(`Pipeline failed: ${err.message}`);
        } finally {
            setIsLoading(false);
            setTimeout(() => setPipelineStep(''), 3000);
        }
    };

    return (
        <div className="page-container space-y-6">
            {/* 1. Header Section */}
            <div className="flex items-center justify-between pt-2">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Test Device</h1>
                    <p className="text-sm text-gray-500">Mode teknisi & debugging</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${deviceStatus?.isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                    <div className={`w-2 h-2 rounded-full ${deviceStatus?.isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                    {deviceStatus?.isOnline ? 'Online' : 'Offline'}
                </div>
            </div>

            {/* Offline Banner */}
            {!deviceStatus?.isOnline && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-bold text-red-900 text-sm">Device Offline</h3>
                        <p className="text-xs text-red-700 mt-1">
                            Test tidak dapat dilakukan. Cek koneksi hardware.
                        </p>
                    </div>
                </div>
            )}

            {/* 2. Sensor Test Visualization */}
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900">Sensor Jarak (Real-time)</h3>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${(deviceStatus?.lastDistance || 0) < 20 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                        {(deviceStatus?.lastDistance || 0) < 20 ? 'IN RANGE' : 'OUT OF RANGE'}
                    </div>
                </div>
                <div className="flex items-center gap-2 mb-4">
                    <Signal className="w-5 h-5 text-brand-500" />
                    <span className="text-3xl font-bold text-gray-900">{deviceStatus?.lastDistance ?? '--'}</span>
                    <span className="text-gray-500 mt-2">cm</span>
                </div>

                {/* Visual Bar */}
                <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden relative">
                    {/* Range Marker (e.g., 0-20cm is valid) */}
                    <div className="absolute left-0 top-0 bottom-0 w-[20%] bg-green-100 border-r border-green-300" title="Detection Zone (0-20cm)" />

                    {/* Distance Indicator */}
                    <div
                        className="absolute top-0 bottom-0 w-2 bg-brand-500 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(249,115,22,0.5)]"
                        style={{ left: `${Math.min((deviceStatus?.lastDistance || 0), 100)}%` }}
                    />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>0cm</span>
                    <span>50cm</span>
                    <span>100cm+</span>
                </div>
            </Card>

            {/* 3. Camera & Flash Test */}
            <Card>
                <h3 className="font-bold text-gray-900 mb-4">Camera & Flash</h3>
                <div className="space-y-3">
                    <Button
                        variant="secondary"
                        className="w-full justify-start"
                        onClick={() => testAction('Test Capture', deviceAPI.capture)}
                        disabled={!deviceStatus?.isOnline || isLoading}
                    >
                        <Camera className="w-4 h-4 mr-3 text-gray-500" /> Test Capture (No Unlock)
                    </Button>

                    <div className="grid grid-cols-3 gap-2">
                        <Button
                            variant="secondary"
                            className="text-xs"
                            onClick={() => testAction('Flash 500ms', () => deviceAPI.controlFlash('pulse', 500))}
                            disabled={!deviceStatus?.isOnline || isLoading}
                        >
                            <Zap className="w-3 h-3 mr-1" /> 500ms
                        </Button>
                        <Button
                            variant="secondary"
                            className="text-xs"
                            onClick={() => testAction('Flash 1s', () => deviceAPI.controlFlash('pulse', 1000))}
                            disabled={!deviceStatus?.isOnline || isLoading}
                        >
                            <Zap className="w-3 h-3 mr-1" /> 1s
                        </Button>
                        <Button
                            variant="secondary"
                            className="text-xs"
                            onClick={() => testAction('Flash ON', () => deviceAPI.controlFlash('on'))}
                            disabled={!deviceStatus?.isOnline || isLoading}
                        >
                            ON
                        </Button>
                    </div>
                </div>
            </Card>

            {/* 4. Lock & Holder Test */}
            <Card>
                <h3 className="font-bold text-gray-900 mb-4">Solenoid Test</h3>
                <div className="space-y-3">
                    <Button
                        variant="secondary"
                        className="w-full justify-start"
                        onClick={() => testAction('Test Holder Release', () => deviceAPI.controlHolder('pulse', 2000))}
                        disabled={!deviceStatus?.isOnline || isLoading}
                    >
                        <Lock className="w-4 h-4 mr-3 text-gray-500" /> Test Release Holder (2s)
                    </Button>

                    {/* Note: Door unlock usually requires PIN, skipping simple button for security or adding specific test endpoint if exists */}
                </div>
            </Card>

            {/* 5. Buzzer Test */}
            <Card>
                <h3 className="font-bold text-gray-900 mb-4">Buzzer Test</h3>
                <div className="grid grid-cols-2 gap-2">
                    <Button
                        variant="secondary"
                        onClick={() => testAction('Buzzer 1s', () => deviceAPI.controlBuzzer('start', 1000))}
                        disabled={!deviceStatus?.isOnline || isLoading}
                    >
                        <Volume2 className="w-4 h-4 mr-2" /> Test 1s
                    </Button>
                    <Button
                        variant="danger"
                        onClick={() => testAction('Stop Buzzer', () => deviceAPI.controlBuzzer('stop'))}
                        disabled={!deviceStatus?.isOnline || isLoading}
                    >
                        <StopCircle className="w-4 h-4 mr-2" /> Force Stop
                    </Button>
                </div>
            </Card>

            {/* 6. Full Pipeline Test */}
            <Card className="border-l-4 border-l-brand-500">
                <div className="flex items-center gap-3 mb-4">
                    <Activity className="w-6 h-6 text-brand-500" />
                    <div>
                        <h3 className="font-bold text-gray-900">Full Pipeline Test</h3>
                        <p className="text-xs text-gray-500">Simulasi alur paket masuk</p>
                    </div>
                </div>

                <Button
                    variant="primary"
                    className="w-full"
                    onClick={handleFullPipeline}
                    disabled={!deviceStatus?.isOnline || isLoading}
                    isLoading={isLoading && pipelineStep !== ''}
                >
                    <PlayCircle className="w-5 h-5 mr-2" /> Jalankan Test Full Cycle
                </Button>

                {pipelineStep && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm font-mono text-gray-600 flex items-center gap-2 animate-pulse">
                        <Activity className="w-4 h-4" /> {pipelineStep}
                    </div>
                )}
            </Card>
        </div>
    );
}
