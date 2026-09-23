import { useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Bell, Check, CircleGauge, Compass, Crosshair, HardHat, HeartPulse, LockKeyhole, MapPin, Power, RefreshCw, RotateCcw, ShieldCheck, Siren, TriangleAlert, UserRound, Video, Wind, Zap } from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Mascot, MascotProvider, useMascot } from '@/components/mascot';
import { getGetSimulatorStateQueryKey, getHealthCheckQueryKey, useApplySimulatorAction, useGetSimulatorState, useHealthCheck } from '@workspace/api-client-react';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

function MetricGauge({ label, value, unit, accent = '#e5a629', icon: Icon = Activity }: { label: string; value: string; unit: string; accent?: string; icon?: typeof Activity }) {
  return (
    <div className="flex items-center gap-3" data-testid={`metric-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#31484f] bg-[#15252b]" style={{ color: accent }}><Icon size={17} /></div>
      <div>
        <div className="section-label">{label}</div>
        <div className="display-font text-2xl leading-none text-[#e9eee8]">{value}<span className="ml-1 font-sans text-xs text-[#82969d]">{unit}</span></div>
      </div>
    </div>
  );
}

function StatusPill({ label, tone }: { label: string; tone: 'amber' | 'teal' | 'red' | 'slate' }) {
  const styles = { amber: 'border-[#a87924]/50 bg-[#3a2d16] text-[#e5a629]', teal: 'border-[#267e73]/60 bg-[#153430] text-[#42c3ad]', red: 'border-[#a7423f]/60 bg-[#3b1f20] text-[#f06a5f]', slate: 'border-[#3c5057] bg-[#1a2930] text-[#aab7b4]' }[tone];
  return <span className={`mono-font inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[.11em] ${styles}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{label}</span>;
}

function ReadinessRow({ icon: Icon, label, checked, onClick, detail }: { icon: typeof HardHat; label: string; checked: boolean; onClick: () => void; detail: string }) {
  return (
    <button type="button" onClick={onClick} className="group flex w-full items-center gap-3 border-b border-[#263a40] py-3 text-left last:border-0" data-testid={`toggle-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${checked ? 'border-[#267e73] bg-[#153430] text-[#42c3ad]' : 'border-[#52606a] bg-[#19272d] text-[#87989b] group-hover:border-[#e5a629]'}`}><Icon size={16} /></div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-[#dbe5df]">{label}</div>
        <div className="mono-font text-[10px] uppercase tracking-[.08em] text-[#82969d]">{detail}</div>
      </div>
      <div className={`flex h-5 w-5 items-center justify-center rounded-full border ${checked ? 'border-[#42c3ad] bg-[#42c3ad] text-[#0b171b]' : 'border-[#53666d] text-transparent'}`}><Check size={13} strokeWidth={3} /></div>
    </button>
  );
}

function TerrainMap({ x, y, obstacles, distance, dangerDistance }: { x: number; y: number; obstacles: Array<{ id: string; x: number; y: number; distance: number; severity: string }>; distance: number; dangerDistance: number }) {
  const scaleX = (value: number) => 12 + ((value + 100) / 200) * 76;
  const scaleY = (value: number) => 86 - ((value + 100) / 200) * 72;
  return (
    <div className="relative h-56 overflow-hidden rounded-xl border border-[#2b4249] bg-[#0b171c] scan-lines" data-testid="terrain-map">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        <path d="M0 76L18 68 30 74 45 55 58 64 74 40 100 50V100H0Z" fill="#13272c" />
        <path d="M0 76L18 68 30 74 45 55 58 64 74 40 100 50" fill="none" stroke="#37535a" strokeWidth=".7" strokeDasharray="2 2" />
        <path d="M5 26L96 82M16 10L76 96M84 9L20 93" stroke="#1e383e" strokeWidth=".45" />
        <circle cx={scaleX(x)} cy={scaleY(y)} r="4.5" fill="#e5a629" opacity=".18" />
        <circle cx={scaleX(x)} cy={scaleY(y)} r="2.8" fill="#e5a629" stroke="#f4c35c" strokeWidth=".8" />
        <path d={`M${scaleX(x)} ${scaleY(y) - 7}l-2 3h4z`} fill="#e5a629" />
        {obstacles.map((obstacle) => (
          <g key={obstacle.id}>
            <circle cx={scaleX(obstacle.x)} cy={scaleY(obstacle.y)} r="4.2" fill={obstacle.severity === 'danger' ? '#f06a5f' : '#d6a438'} opacity=".18" />
            <circle cx={scaleX(obstacle.x)} cy={scaleY(obstacle.y)} r="1.8" fill={obstacle.severity === 'danger' ? '#f06a5f' : '#d6a438'} />
          </g>
        ))}
      </svg>
      <div className="absolute left-3 top-3 flex items-center gap-2"><Crosshair size={13} className="text-[#e5a629]" /><span className="section-label">LIVE TERRAIN / XY GRID</span></div>
      <div className="absolute bottom-3 left-3 flex gap-3 mono-font text-[9px] uppercase tracking-wider text-[#82969d]"><span className="flex items-center gap-1"><i className="h-1.5 w-1.5 rounded-full bg-[#e5a629]" />machine</span><span className="flex items-center gap-1"><i className="h-1.5 w-1.5 rounded-full bg-[#d6a438]" />caution</span><span className="flex items-center gap-1"><i className="h-1.5 w-1.5 rounded-full bg-[#f06a5f]" />danger</span></div>
      <div className={`absolute right-3 top-3 rounded border px-2 py-1 text-right ${distance <= dangerDistance ? 'border-[#a7423f] bg-[#3b1f20]' : 'border-[#a87924] bg-[#3a2d16]'}`}><div className="section-label">nearest object</div><div className={`mono-font text-sm font-semibold ${distance <= dangerDistance ? 'text-[#f06a5f]' : 'text-[#e5a629]'}`}>{distance.toFixed(1)} m</div></div>
    </div>
  );
}

function SensorCard({ sensor }: { sensor: { id: string; label: string; value: number; unit: string; threshold: number; status: string; direction: string } }) {
  const isAlert = sensor.status === 'alert';
  const isWarning = sensor.status === 'warning';
  const color = isAlert ? '#f06a5f' : isWarning ? '#e5a629' : '#42c3ad';
  const progress = Math.min(100, Math.max(7, (sensor.value / Math.max(sensor.threshold * 1.2, 1)) * 100));
  return (
    <div className="hmi-panel rounded-xl p-4" data-testid={`sensor-card-${sensor.id}`}>
      <div className="mb-4 flex items-start justify-between"><div><div className="section-label">{sensor.label}</div><div className="mt-1 display-font text-3xl text-[#e9eee8]">{sensor.value.toFixed(sensor.unit === 'bar' ? 2 : 1)}<span className="ml-1 font-sans text-xs text-[#82969d]">{sensor.unit}</span></div></div><StatusPill label={sensor.status} tone={isAlert ? 'red' : isWarning ? 'amber' : 'teal'} /></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#1c3036]"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: color }} /></div>
      <div className="mt-2 flex justify-between mono-font text-[9px] uppercase tracking-wider text-[#82969d]"><span>threshold {sensor.threshold}{sensor.unit}</span><span className="flex items-center gap-1" style={{ color }}>{sensor.direction === 'high' ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}{sensor.direction} trip</span></div>
    </div>
  );
}

function Dashboard() {
  const queryClient = useQueryClient();
  const stateQuery = useGetSimulatorState({ query: { queryKey: getGetSimulatorStateQueryKey(), refetchInterval: 2000 } });
  const healthQuery = useHealthCheck({ query: { staleTime: 30000, queryKey: getHealthCheckQueryKey() } });
  const actionMutation = useApplySimulatorAction();
  const [manualPpe, setManualPpe] = useState(false);
  const [manualSeatbelt, setManualSeatbelt] = useState(false);
  const state = stateQuery.data;
  const ppeReady = Boolean(manualPpe || state?.safety.ppeDetected);
  const seatbeltReady = Boolean(manualSeatbelt || state?.safety.seatbeltFastened);
  const nearestDanger = Boolean(state && state.terrain.nearestObstacleDistance <= state.terrain.dangerDistance);
  const warningSensor = state?.sensors.some((sensor) => sensor.status === 'warning') ?? false;
  const alertSensor = state?.sensors.some((sensor) => sensor.status === 'alert') ?? false;
  const engine = state?.machine.engine ?? 'offline';
  const canStart = ppeReady && seatbeltReady && engine === 'ready';
  const mood = nearestDanger || state?.machine.engine === 'braking' || alertSensor ? 'alert' : warningSensor ? 'warning' : canStart ? 'greeting' : 'idle';
  const mascotMessage = mood === 'alert'
    ? 'I have your back. Brake response is active and the nearest object needs your attention.'
    : mood === 'warning'
      ? 'One or more readings are approaching a trip point. I will keep watching while you work.'
      : mood === 'greeting'
        ? "All set, let's go!"
        : "Let's get you geared up before we start";
  const { mascotState, message, setMascotState } = useMascot();
  useEffect(() => {
    setMascotState(mood, mascotMessage);
  }, [mood, mascotMessage, setMascotState]);
    const visibleEvents = useMemo(() => state?.eventLog.slice(0, 8) ?? [], [state?.eventLog]);
  const runAction = (action: 'start_engine' | 'stop_engine' | 'demo_brake' | 'reset') => {
    actionMutation.mutate({ data: { action } }, { onSuccess: (nextState) => queryClient.setQueryData(getGetSimulatorStateQueryKey(), nextState) });
  };
  const sectionMeta = useMemo(
    () => [
      { id: 'section-overview', label: 'overview' as const },
      { id: 'section-safety', label: 'safety' as const },
      { id: 'section-telemetry', label: 'telemetry' as const },
      { id: 'section-log', label: 'log' as const },
    ],
    [],
  );
  const [activeSection, setActiveSection] = useState<'overview' | 'safety' | 'telemetry' | 'log'>('overview');
  useEffect(() => {
    const handleScroll = () => {
      const offset = 140;
      let current = sectionMeta[0].label;
      for (const { id, label } of sectionMeta) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top - offset <= 0) {
          current = label;
        }
      }
      setActiveSection(current);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sectionMeta]);
  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  if (stateQuery.isLoading) {
    return (
      <div className="min-h-[100dvh] bg-[#081015] p-6 text-[#82969d]">
        <div className="mx-auto max-w-[1500px] animate-pulse">
          <div className="mb-8 h-10 w-64 rounded bg-[#15252b]" />

          <div className="grid gap-5 lg:grid-cols-3">
            <div className="h-96 rounded-2xl bg-[#102027]" />
            <div className="h-96 rounded-2xl bg-[#102027]" />
            <div className="h-96 rounded-2xl bg-[#102027]" />
          </div>
        </div>
      </div>
    );
  }
  if (stateQuery.isError || !state) {
    return <div className="flex min-h-[100dvh] items-center justify-center bg-[#081015] p-6"><div className="hmi-panel max-w-md rounded-2xl p-8 text-center"><TriangleAlert className="mx-auto mb-4 text-[#f06a5f]" size={34} /><h1 className="display-font text-3xl text-[#e9eee8]">Simulator link unavailable</h1><p className="mt-2 text-sm text-[#82969d]">The assistant could not read the machine state. Check the cab connection and try again.</p><button type="button" onClick={() => stateQuery.refetch()} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#e5a629] px-4 py-2 text-sm font-bold text-[#0b171b]" data-testid="button-retry-state"><RefreshCw size={16} /> Retry connection</button></div></div>;
  }
  return (
    <div className="min-h-[100dvh] bg-[#081015] text-[#e9eee8]">
      <div className="mx-auto flex min-h-[100dvh] max-w-[1600px]">
        <aside className="hidden w-[218px] shrink-0 flex-col border-r border-[#1c3036] bg-[#091217] px-5 py-6 md:flex">
          <div className="mb-12 flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#a87924] bg-[#3a2d16] text-[#e5a629]"><CircleGauge size={19} /></div><div><div className="display-font text-lg font-semibold tracking-wide">SMART OP</div><div className="mono-font text-[9px] tracking-[.17em] text-[#82969d]">FIELD SYSTEMS</div></div></div>
          <div className="section-label mb-3">Operator console</div>
          <nav className="space-y-1">
            <button type="button" onClick={() => scrollToSection('section-overview')} className="flex w-full items-center gap-3 rounded-lg border border-[#a87924]/40 bg-[#3a2d16] px-3 py-3 text-left text-sm font-semibold text-[#e5a629]" data-testid="button-nav-overview"><Activity size={17} /> Overview <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#e5a629]" /></button>
            <button type="button"  onClick={() => scrollToSection('section-safety')} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm text-[#82969d] hover:bg-[#15252b] hover:text-[#dbe5df]" data-testid="button-nav-safety"><ShieldCheck size={17} /> Safety checks</button>
            <button type="button" onClick={() => scrollToSection('section-telemetry')} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm text-[#82969d] hover:bg-[#15252b] hover:text-[#dbe5df]" data-testid="button-nav-telemetry"><Activity size={17} /> Telemetry</button>
            <button type="button" onClick={() => scrollToSection('section-telemetry')} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm text-[#82969d] hover:bg-[#15252b] hover:text-[#dbe5df]" data-testid="button-nav-log"><Bell size={17} /> Event log</button>
          </nav>
          <div className="mt-auto border-t border-[#1c3036] pt-5"><div className="section-label mb-3">Machine profile</div><div className="text-sm font-semibold text-[#dbe5df]">CAT 320 GC</div><div className="mono-font mt-1 text-[10px] text-[#82969d]">UNIT 04 / NORTH BENCH</div><div className="mt-4 flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${healthQuery.isSuccess ? 'bg-[#42c3ad]' : 'bg-[#f06a5f]'}`} /><span className="mono-font text-[10px] uppercase tracking-wider text-[#82969d]">{healthQuery.isSuccess ? 'link nominal' : 'link check'}</span></div></div>
        </aside>
        <main className="hmi-grid min-w-0 flex-1 overflow-hidden">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1c3036] bg-[#0b171c]/90 px-5 py-4 backdrop-blur sm:px-8">
            <div><div className="section-label">Operator session / 04</div><h1 className="display-font mt-1 text-2xl font-semibold tracking-wide sm:text-3xl">Machine overview</h1></div>
            <div className="flex items-center gap-3"><StatusPill label={engine === 'running' ? 'engine running' : engine} tone={engine === 'braking' ? 'red' : engine === 'running' ? 'teal' : engine === 'ready' ? 'amber' : 'slate'} /><div className="hidden h-8 border-l border-[#2b4249] sm:block" /><div className="flex items-center gap-2 text-right"><div className="hidden sm:block"><div className="mono-font text-[10px] uppercase tracking-wider text-[#82969d]">last sync</div><div className="mono-font text-xs text-[#dbe5df]">{new Date(state.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div></div><div className={`h-2 w-2 rounded-full ${healthQuery.isSuccess ? 'data-pulse bg-[#42c3ad]' : 'bg-[#f06a5f]'}`} /></div></div>
          </header>
          <div className="mx-auto max-w-[1400px] space-y-5 p-5 sm:p-8">
            {nearestDanger && <div className="dash-in flex items-center justify-between gap-4 rounded-xl border border-[#a7423f] bg-[#3b1f20] px-4 py-3 text-[#f4cbc5]" data-testid="alert-terrain-danger"><div className="flex items-center gap-3"><Siren size={20} className="text-[#f06a5f]" /><div><div className="mono-font text-[10px] font-semibold uppercase tracking-[.16em] text-[#f06a5f]">Terrain warning</div><div className="text-sm font-semibold">Object inside emergency braking distance — keep hands on controls.</div></div></div><button type="button" onClick={() => runAction('demo_brake')} disabled={actionMutation.isPending} className="shrink-0 rounded-lg border border-[#e06d62] px-3 py-2 text-xs font-bold text-[#f6c4bd] hover:bg-[#512526] disabled:opacity-50" data-testid="button-emergency-brake-alert">BRAKE NOW</button></div>}
            <section id="section-overview" className="grid gap-5 xl:grid-cols-[1.2fr_.8fr] scroll-mt-24">
              <div className="hmi-panel relative overflow-hidden rounded-2xl p-5 sm:p-7">
                <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#e5a629]/5 blur-3xl" /><div className="relative flex flex-wrap items-start justify-between gap-4"><div><div className="section-label">Co-pilot status</div><div className="mt-1 flex items-center gap-2"><h2 className="display-font text-2xl text-[#e9eee8]">{mood === 'alert' ? 'Hold position' : mood === 'warning' ? 'Stay observant' : mood === 'greeting' ? 'All systems ready' : 'Awaiting operator'}</h2><span className="rounded-full border border-[#2b4249] px-2 py-1 mono-font text-[9px] uppercase tracking-wider text-[#82969d]">AI assist</span></div></div><div className="mono-font text-right text-[10px] uppercase tracking-wider text-[#82969d]"><div>unit 04</div><div className="mt-1 text-[#dbe5df]">cat 320 gc</div></div></div>
                <div className="flex items-center justify-center py-5 sm:py-2"><Mascot mascotState={mascotState} message={message} /></div>
                <div className="grid grid-cols-3 gap-3 border-t border-[#263a40] pt-5"><MetricGauge label="Ground speed" value={state.machine.speed.toFixed(1)} unit="km/h" icon={Zap} /><MetricGauge label="Heading" value={String(Math.round(state.machine.heading)).padStart(3, '0')} unit="deg" icon={Compass} accent="#42c3ad" /><MetricGauge label="Position" value={`${Math.round(state.terrain.machineX)},${Math.round(state.terrain.machineY)}`} unit="xy" icon={MapPin} accent="#aab7b4" /></div>
              </div>
              <div id="section-safety" className="hmi-panel rounded-2xl p-5 sm:p-7 scroll-mt-24">
                <div className="mb-4 flex items-start justify-between"><div><div className="section-label">Operator-ready gate</div><h2 className="display-font mt-1 text-2xl text-[#e9eee8]">Pre-start check</h2></div><LockKeyhole size={19} className={canStart ? 'text-[#42c3ad]' : 'text-[#e5a629]'} /></div>
                <div className="mb-4 overflow-hidden rounded-xl border border-[#2b4249] bg-[#0b171c]"><div className="flex aspect-[2.5/1] items-center justify-center bg-[linear-gradient(140deg,rgba(40,62,67,.22),rgba(10,22,27,.8))]"><div className="text-center"><Video className="mx-auto mb-2 text-[#63777f]" size={28} /><div className="section-label">cab camera placeholder</div><div className="mono-font mt-1 text-[9px] text-[#52676e]">manual confirmation available</div></div></div><div className="flex items-center justify-between border-t border-[#263a40] px-3 py-2"><span className="mono-font text-[9px] uppercase tracking-wider text-[#82969d]">ppe vision / standby</span><button type="button" onClick={() => setManualPpe((value) => !value)} className="text-[10px] font-bold uppercase tracking-wider text-[#e5a629] hover:text-[#f3c65d]" data-testid="button-manual-ppe">{ppeReady ? 'confirmed' : 'confirm manually'}</button></div></div>
                <ReadinessRow icon={HardHat} label="Helmet + hi-vis detected" detail={ppeReady ? 'manual / vision pass' : 'awaiting confirmation'} checked={ppeReady} onClick={() => setManualPpe((value) => !value)} />
                <ReadinessRow icon={LockKeyhole} label="Seatbelt fastened" detail={seatbeltReady ? 'restraint locked' : 'click belt to confirm'} checked={seatbeltReady} onClick={() => setManualSeatbelt((value) => !value)} />
                <button type="button" onClick={() => runAction(engine === 'running' ? 'stop_engine' : 'start_engine')} disabled={engine === 'running' ? actionMutation.isPending : !canStart || actionMutation.isPending} className={`mt-5 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold tracking-wide transition ${engine === 'running' ? 'border border-[#a7423f] bg-[#3b1f20] text-[#f06a5f] hover:bg-[#512526]' : canStart ? 'bg-[#e5a629] text-[#0b171b] hover:bg-[#f2bf4b]' : 'cursor-not-allowed bg-[#22343a] text-[#63777f]'}`} data-testid="button-engine-control"><Power size={18} />{actionMutation.isPending ? 'sending command...' : engine === 'running' ? 'stop engine' : 'start engine'}</button>
                {!canStart && engine !== 'running' && <div className="mt-3 text-center mono-font text-[9px] uppercase tracking-wider text-[#82969d]">Both confirmations required to enable ignition</div>}
              </div>
            </section>
            <section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
              <div className="hmi-panel rounded-2xl p-5 sm:p-6"><div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><div className="section-label">Perimeter awareness</div><h2 className="display-font mt-1 text-2xl text-[#e9eee8]">Terrain watch</h2></div><div className="flex items-center gap-3"><div className="text-right"><div className="section-label">brake envelope</div><div className="mono-font text-sm text-[#dbe5df]">{state.terrain.dangerDistance.toFixed(1)} m</div></div><button type="button" onClick={() => runAction('demo_brake')} disabled={actionMutation.isPending} className="flex items-center gap-2 rounded-lg border border-[#a87924] bg-[#3a2d16] px-3 py-2 text-xs font-bold text-[#e5a629] hover:bg-[#4a3718] disabled:opacity-50" data-testid="button-demo-brake"><Siren size={14} /> demo brake</button></div></div><TerrainMap x={state.terrain.machineX} y={state.terrain.machineY} obstacles={state.terrain.obstacles} distance={state.terrain.nearestObstacleDistance} dangerDistance={state.terrain.dangerDistance} /><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><MetricGauge label="Nearest" value={state.terrain.nearestObstacleDistance.toFixed(1)} unit="m" icon={Crosshair} accent={nearestDanger ? '#f06a5f' : '#e5a629'} /><MetricGauge label="Objects" value={String(state.terrain.obstacles.length)} unit="tracked" icon={AlertTriangle} accent="#aab7b4" /><MetricGauge label="X coord" value={String(Math.round(state.terrain.machineX))} unit="m" icon={MapPin} accent="#42c3ad" /><MetricGauge label="Y coord" value={String(Math.round(state.terrain.machineY))} unit="m" icon={MapPin} accent="#42c3ad" /></div></div>
              <div id="section-telemetry" className="hmi-panel rounded-2xl p-5 sm:p-6 scroll-mt-24"><div className="mb-5 flex items-start justify-between"><div><div className="section-label">Cabin environment</div><h2 className="display-font mt-1 text-2xl text-[#e9eee8]">Live telemetry</h2></div><Wind className="text-[#42c3ad]" size={20} /></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">{state.sensors.map((sensor) => <SensorCard key={sensor.id} sensor={sensor} />)}</div></div>
            </section>
            <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
              <div className="hmi-panel rounded-2xl p-5 sm:p-6"><div className="mb-4 flex items-center justify-between"><div><div className="section-label">Machine vitals</div><h2 className="display-font mt-1 text-2xl text-[#e9eee8]">Drive status</h2></div><HeartPulse className="text-[#e5a629]" size={20} /></div><div className="grid grid-cols-2 gap-3"><div className="rounded-xl border border-[#2b4249] bg-[#122229] p-4"><div className="section-label">engine state</div><div className="mt-2 flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${engine === 'running' ? 'bg-[#42c3ad]' : engine === 'braking' ? 'bg-[#f06a5f]' : 'bg-[#e5a629]'}`} /><span className="display-font text-2xl uppercase text-[#e9eee8]">{engine}</span></div></div><div className="rounded-xl border border-[#2b4249] bg-[#122229] p-4"><div className="section-label">operator safety</div><div className="mt-2 flex items-center gap-2"><ShieldCheck size={17} className={ppeReady && seatbeltReady ? 'text-[#42c3ad]' : 'text-[#e5a629]'} /><span className="display-font text-2xl text-[#e9eee8]">{ppeReady && seatbeltReady ? 'PASS' : 'CHECK'}</span></div></div></div><div className="mt-4 flex items-center justify-between border-t border-[#263a40] pt-4"><span className="mono-font text-[10px] uppercase tracking-wider text-[#82969d]">machine heading</span><span className="mono-font text-sm text-[#e5a629]">{Math.round(state.machine.heading)}° / {state.machine.speed.toFixed(1)} km/h</span></div></div>
              <div id="section-log" className="hmi-panel rounded-2xl p-5 sm:p-6 scroll-mt-24"><div className="mb-3 flex items-start justify-between"><div><div className="section-label">Shift record</div><h2 className="display-font mt-1 text-2xl text-[#e9eee8]">Event log</h2></div><button type="button" onClick={() => runAction('reset')} disabled={actionMutation.isPending} className="flex items-center gap-1.5 rounded-lg border border-[#2b4249] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#aab7b4] hover:border-[#e5a629] hover:text-[#e5a629]" data-testid="button-reset-simulator"><RotateCcw size={13} /> reset sim</button></div><div className="max-h-[235px] overflow-auto pr-1">{visibleEvents.length === 0 ? <div className="flex h-28 items-center justify-center text-sm text-[#82969d]">No events recorded this shift.</div> : visibleEvents.map((event) => { const tone = event.level === 'alert' ? 'red' : event.level === 'warning' ? 'amber' : 'teal'; return <div className="flex gap-3 border-b border-[#263a40] py-3 last:border-0" key={event.id} data-testid={`event-row-${event.id}`}><div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${tone === 'red' ? 'bg-[#f06a5f]' : tone === 'amber' ? 'bg-[#e5a629]' : 'bg-[#42c3ad]'}`} /><div className="min-w-0 flex-1"><div className="text-xs leading-snug text-[#dbe5df]">{event.message}</div><div className="mono-font mt-1 text-[9px] uppercase tracking-wider text-[#63777f]">{new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} / {event.level}</div></div></div>; })}</div></div>
            </section>
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#1c3036] py-2 mono-font text-[9px] uppercase tracking-[.14em] text-[#52676e]"><span>smart operator assistant / field systems</span><span className="flex items-center gap-2"><UserRound size={12} /> operator 04 <span className="text-[#42c3ad]">● secured</span></span></footer>
          </div>
        </main>
      </div>
    </div>
  );
}

function Router() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><Switch><Route path="/" component={Dashboard} /><Route>{() => <Dashboard />}</Route></Switch></ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><MascotProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter></MascotProvider><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;
