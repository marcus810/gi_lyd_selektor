// statsAudioMonitor.ts
export function startAudioStatsMonitor(pc: any, intervalMs = 500) {
  const prev = new Map<string, { t: number; energy: number }>();

  const tick = async () => {
    try {
      const stats = await (pc as any).getStats();

      if (stats && typeof stats.forEach === 'function') {
        stats.forEach((report: any) => handleReport(report));
      } else if (Array.isArray(stats)) {
        stats.forEach((report: any) => handleReport(report));
      } else {
        Object.values(stats ?? {}).forEach((report: any) => handleReport(report));
      }
    } catch (e) {
      console.warn('getStats error', e);
    }
  };

  function handleReport(report: any) {
    // console.log('stats report', report); // one-time inspect if needed
    if ((report.type === 'inbound-rtp') &&
        (report.kind === 'audio' || report.mediaType === 'audio' || String(report.id).includes('audio'))) {

      const energy = report.totalAudioEnergy ?? report.totalAudioEnergyReceived ?? report.totalEnergy ?? report.totalSamplesReceived ?? 0;
      const ts = report.timestamp ?? Date.now();
      const id = report.id ?? 'inbound-audio';
      const prevStat = prev.get(id);

      if (prevStat && typeof energy === 'number') {
        const dt = (ts - prevStat.t) / 1000.0;
        const dEnergy = Math.max(0, energy - prevStat.energy);
        const avgPower = dt > 0 ? dEnergy / dt : 0;
        const approxRms = Math.sqrt(Math.max(avgPower, 0));
        // console.log(`[AUDIO-STATS] id=${id} dt=${dt.toFixed(3)}s dEnergy=${dEnergy.toFixed(6)} avgPower=${avgPower.toFixed(6)} approxRms=${approxRms.toFixed(6)}`);
      }
      prev.set(id, { t: ts, energy: energy || 0 });
    }
  }

  const timer = setInterval(tick, intervalMs);
  return () => clearInterval(timer); // stop function
}
