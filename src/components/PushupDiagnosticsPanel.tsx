import React, { useState } from 'react';
import { DiagnosticsState } from '../utils/pushupEngine';
import { Terminal, Copy, Check, ChevronDown, ChevronUp, AlertCircle, Activity, Compass } from 'lucide-react';

interface PushupDiagnosticsPanelProps {
  diagnostics: DiagnosticsState;
  onRecalibrate?: () => void;
}

export const PushupDiagnosticsPanel: React.FC<PushupDiagnosticsPanelProps> = ({
  diagnostics,
  onRecalibrate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed bottom-24 left-4 z-40 max-w-[calc(100vw-2rem)] sm:max-w-sm pointer-events-auto font-mono text-[11px]">
      {/* Action Buttons: DEV MODE on Left & Calibrate on Right */}
      <div className="flex items-center gap-2">
        {/* DEV MODE Toggle Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-950/80 backdrop-blur-md border border-zinc-700/80 text-zinc-300 hover:text-white shadow-lg text-xs cursor-pointer transition-all hover:border-emerald-500/50"
          title="Toggle Developer Mode Diagnostics"
        >
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-bold">DEV MODE</span>
          <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-[10px] text-emerald-300">
            {diagnostics.fps} FPS
          </span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />}
        </button>

        {/* Quick Calibrate Button */}
        {onRecalibrate && (
          <button
            onClick={onRecalibrate}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl backdrop-blur-md border shadow-lg text-xs font-bold cursor-pointer transition-all ${
              diagnostics.calibrationPhase !== 'CALIBRATED' && diagnostics.calibrationPhase !== 'NOT_CALIBRATED'
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 animate-pulse'
                : 'bg-zinc-950/80 border-zinc-700/80 hover:border-emerald-500/50 text-zinc-300 hover:text-white'
            }`}
            title="Calibrate Pushup Target Depth"
          >
            <Compass className={`w-3.5 h-3.5 text-emerald-400 ${
              diagnostics.calibrationPhase !== 'CALIBRATED' && diagnostics.calibrationPhase !== 'NOT_CALIBRATED' ? 'animate-spin' : ''
            }`} />
            <span>Calibrate</span>
          </button>
        )}
      </div>

      {/* Collapsible Panel */}
      {isOpen && (
        <div className="mt-2 p-3 rounded-2xl bg-zinc-950/95 backdrop-blur-xl border border-zinc-700/90 shadow-2xl text-zinc-300 max-h-[75vh] w-[90vw] max-w-xs sm:max-w-sm overflow-y-auto space-y-2.5 animate-in fade-in slide-in-from-top-2">
          {/* Header & Export */}
          <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800">
            <span className="font-bold text-white flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-emerald-400" /> Real-Time Engine
            </span>
            <button
              onClick={handleCopyJSON}
              className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy JSON'}
            </button>
          </div>

          {/* State Machine Status */}
          <div className="grid grid-cols-2 gap-1.5 bg-zinc-900/60 p-2 rounded-xl border border-zinc-800">
            <div>
              <span className="text-[9px] text-zinc-400 uppercase">State</span>
              <p className="font-black text-xs text-amber-300">{diagnostics.state}</p>
            </div>
            <div>
              <span className="text-[9px] text-zinc-400 uppercase">Reps Counted</span>
              <p className="font-black text-xs text-emerald-400">{diagnostics.totalReps}</p>
            </div>
            <div>
              <span className="text-[9px] text-zinc-400 uppercase">Bottom Accepted</span>
              <p className={`font-bold ${diagnostics.bottomAccepted ? 'text-emerald-400' : 'text-zinc-500'}`}>
                {diagnostics.bottomAccepted ? 'TRUE' : 'FALSE'}
              </p>
            </div>
            <div>
              <span className="text-[9px] text-zinc-400 uppercase">Top Reached</span>
              <p className={`font-bold ${diagnostics.topReached ? 'text-cyan-400' : 'text-zinc-500'}`}>
                {diagnostics.topReached ? 'TRUE' : 'FALSE'}
              </p>
            </div>
          </div>

          {/* Movement Waveform Signal */}
          <div className="bg-zinc-900/60 p-2 rounded-xl border border-zinc-800 space-y-1">
            <div className="flex justify-between items-center text-[10px] text-zinc-400 font-bold border-b border-zinc-800 pb-1 mb-1">
              <span>MOVEMENT WAVEFORM</span>
              <span className={diagnostics.sampleAccepted ? 'text-emerald-400' : 'text-rose-400'}>
                {diagnostics.sampleAccepted ? 'ACCEPTED' : 'REJECTED'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Smoothed Movement:</span>
              <span className="font-bold text-emerald-300 font-mono">{diagnostics.smoothedMovement.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Normalized (0≈TOP):</span>
              <span className="font-mono text-zinc-300">{diagnostics.normalizedMovement.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Raw Movement:</span>
              <span className="font-mono text-zinc-400">{diagnostics.rawMovement.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Velocity:</span>
              <span className="font-mono text-cyan-300">{diagnostics.movementVelocity.toFixed(2)}/s</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-zinc-800/60 text-[10px]">
              <span className="text-zinc-400">Smoothed Depth:</span>
              <span className="font-bold text-zinc-200">{(diagnostics.smoothedDepth * 100).toFixed(1)}%</span>
            </div>
          </div>

          {/* Relative Torso Movement & Frame Position Invariance */}
          <div className="bg-zinc-900/60 p-2 rounded-xl border border-zinc-800 text-[10px] space-y-1">
            <div className="flex justify-between items-center text-[10px] text-zinc-400 font-bold border-b border-zinc-800 pb-1 mb-1">
              <span>TORSO RELATIVE DELTA</span>
              <span className="text-cyan-400 font-mono text-[9px]">FRAME-INVARIANT</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Initial Starting Plank:</span>
              <span className="font-mono text-cyan-300">
                {diagnostics.initialStartingHeight !== undefined ? diagnostics.initialStartingHeight.toFixed(3) : 'Calibrating'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Highest (Plank) / Lowest (Dip):</span>
              <span className="font-mono text-zinc-300">
                {diagnostics.highestTorsoPoint?.toFixed(3) ?? '-'} / {diagnostics.lowestTorsoPoint?.toFixed(3) ?? '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Current Torso Delta:</span>
              <span className="font-mono text-emerald-400 font-bold">
                {diagnostics.torsoDelta !== undefined ? `+${(diagnostics.torsoDelta * 100).toFixed(1)}%` : '0%'}
              </span>
            </div>
            <div className="flex justify-between pt-1 border-t border-zinc-800/60">
              <span className="text-zinc-400">Relative Torso Progress:</span>
              <span className="font-mono text-emerald-300 font-bold">
                {diagnostics.relativeTorsoMovement !== undefined ? `${(diagnostics.relativeTorsoMovement * 100).toFixed(0)}%` : '0%'}
              </span>
            </div>
          </div>

          {/* Reference Scale & Calibration */}
          <div className="bg-zinc-900/60 p-2 rounded-xl border border-zinc-800 text-[10px] space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Calibration:</span>
              <span className={diagnostics.isCalibrated ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                {diagnostics.isCalibrated ? 'SAVED IN MEMORY' : diagnostics.calibrationPhase}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Session Body Scale:</span>
              <span className="font-mono text-emerald-400 font-bold">{diagnostics.sessionBodyScale.toFixed(3)} (FROZEN)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">hTop / hBottom:</span>
              <span>{diagnostics.hTop} / {diagnostics.hBottom}</span>
            </div>
            {onRecalibrate && (
              <button
                onClick={onRecalibrate}
                className="w-full mt-1.5 py-1 px-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-bold text-[10px] cursor-pointer"
              >
                Recalibrate Target Depth
              </button>
            )}
          </div>

          {/* Bilateral Tracking & Orientation */}
          <div className="bg-zinc-900/60 p-2 rounded-xl border border-zinc-800 text-[10px] space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Tracking Mode:</span>
              <span className={`font-bold px-1.5 py-0.5 rounded text-[9px] ${
                diagnostics.trackingMode === 'bilateral'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {diagnostics.trackingMode.toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Tracking Confidence:</span>
              <span className="font-mono text-zinc-300">{(diagnostics.trackingConfidence * 100).toFixed(0)}%</span>
            </div>
            {diagnostics.viewAngle && (
              <div className="flex justify-between">
                <span className="text-zinc-400">Camera View:</span>
                <span className="font-bold text-cyan-300 uppercase">{diagnostics.viewAngle} View</span>
              </div>
            )}
            {diagnostics.elbowAngle !== undefined && (
              <div className="flex justify-between">
                <span className="text-zinc-400">Elbow Flexion:</span>
                <span className="font-mono text-emerald-300 font-bold">{diagnostics.elbowAngle}°</span>
              </div>
            )}
            {diagnostics.armExtensionRatio !== undefined && (
              <div className="flex justify-between">
                <span className="text-zinc-400">Arm Extension:</span>
                <span className="font-mono text-cyan-300 font-bold">{Math.round(diagnostics.armExtensionRatio * 100)}%</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-zinc-400">Device Orientation:</span>
              <span>{diagnostics.orientationAngle}°</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Pose Angle:</span>
              <span className={diagnostics.isPoseHorizontal ? 'text-emerald-400' : 'text-amber-400'}>
                {diagnostics.isPoseHorizontal ? 'Horizontal Plank' : 'Vertical Standing'}
              </span>
            </div>
          </div>

          {/* Active Status / Rejection Reason */}
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-[10px] flex items-start gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
            <span className="leading-tight">{diagnostics.activeRejectionReason}</span>
          </div>

          {/* Recent Transitions */}
          {diagnostics.recentTransitions.length > 0 && (
            <div className="text-[9px] text-zinc-400 space-y-0.5 border-t border-zinc-800 pt-1.5">
              <span className="font-bold text-zinc-300">Transitions Log:</span>
              <div className="space-y-0.5 max-h-20 overflow-y-auto font-mono">
                {diagnostics.recentTransitions.slice(0, 5).map((t, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{t.from} → {t.to}</span>
                    <span className="text-zinc-500">{new Date(t.timestampMs).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
