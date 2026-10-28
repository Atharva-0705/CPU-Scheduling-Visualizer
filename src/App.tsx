import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  Plus,
  Trash2,
  Download,
  Upload,
  BarChart3,
  Cpu,
  Layers,
  Clock,
  Award,
  Sparkles,
  Sliders,
  ChevronRight,
  Info,
  CheckCircle2,
  TrendingDown,
  RefreshCw,
  Zap,
} from 'lucide-react';

export type AlgorithmType = 'FCFS' | 'SJF' | 'RR' | 'PRIORITY';
export type PriorityOrder = 'LOWER_IS_HIGHER' | 'HIGHER_IS_HIGHER';

export interface Process {
  id: string;
  arrivalTime: number;
  burstTime: number;
  priority: number;
  color: string;
}

export interface GanttBlock {
  processId: string;
  startTime: number;
  endTime: number;
  duration: number;
  color?: string;
  isIdle?: boolean;
}

export interface ProcessResult {
  id: string;
  arrivalTime: number;
  burstTime: number;
  priority: number;
  completionTime: number;
  turnaroundTime: number;
  waitingTime: number;
  responseTime: number;
  color: string;
}

export interface SimulationResult {
  algorithm: AlgorithmType;
  algorithmName: string;
  gantt: GanttBlock[];
  processResults: ProcessResult[];
  avgWaitingTime: number;
  avgTurnaroundTime: number;
  avgResponseTime: number;
  totalTime: number;
  idleTime: number;
  cpuUtilization: number;
  throughput: number;
  timeQuantum?: number;
}

const COLOR_PALETTE = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
  '#6366f1', // indigo
  '#84cc16', // lime
];

const PRESETS: { name: string; description: string; processes: Process[]; recommendedTq?: number }[] = [
  {
    name: 'Standard Mix (Textbook)',
    description: 'Balanced mix of arrival times and burst times demonstrating all scheduling tradeoffs.',
    recommendedTq: 2,
    processes: [
      { id: 'P1', arrivalTime: 0, burstTime: 5, priority: 3, color: COLOR_PALETTE[0] },
      { id: 'P2', arrivalTime: 1, burstTime: 3, priority: 1, color: COLOR_PALETTE[1] },
      { id: 'P3', arrivalTime: 2, burstTime: 8, priority: 4, color: COLOR_PALETTE[2] },
      { id: 'P4', arrivalTime: 3, burstTime: 6, priority: 2, color: COLOR_PALETTE[3] },
    ],
  },
  {
    name: 'Convoy Effect (FCFS Trap)',
    description: 'A heavy first process blocks shorter processes, causing high average wait times in FCFS.',
    recommendedTq: 3,
    processes: [
      { id: 'P1', arrivalTime: 0, burstTime: 24, priority: 3, color: COLOR_PALETTE[0] },
      { id: 'P2', arrivalTime: 1, burstTime: 3, priority: 1, color: COLOR_PALETTE[1] },
      { id: 'P3', arrivalTime: 2, burstTime: 3, priority: 2, color: COLOR_PALETTE[2] },
      { id: 'P4', arrivalTime: 3, burstTime: 2, priority: 4, color: COLOR_PALETTE[3] },
    ],
  },
  {
    name: 'Round Robin Showcase',
    description: 'Simultaneous arrivals with varying burst times ideal for testing quantum responsiveness.',
    recommendedTq: 2,
    processes: [
      { id: 'P1', arrivalTime: 0, burstTime: 4, priority: 2, color: COLOR_PALETTE[0] },
      { id: 'P2', arrivalTime: 0, burstTime: 5, priority: 1, color: COLOR_PALETTE[1] },
      { id: 'P3', arrivalTime: 0, burstTime: 2, priority: 3, color: COLOR_PALETTE[2] },
      { id: 'P4', arrivalTime: 0, burstTime: 1, priority: 4, color: COLOR_PALETTE[3] },
      { id: 'P5', arrivalTime: 0, burstTime: 6, priority: 2, color: COLOR_PALETTE[4] },
    ],
  },
  {
    name: 'CPU Idle Gaps Test',
    description: 'Dispersed arrival times creating periods where the CPU is idle waiting for new arrivals.',
    recommendedTq: 3,
    processes: [
      { id: 'P1', arrivalTime: 0, burstTime: 3, priority: 2, color: COLOR_PALETTE[0] },
      { id: 'P2', arrivalTime: 6, burstTime: 4, priority: 1, color: COLOR_PALETTE[1] },
      { id: 'P3', arrivalTime: 12, burstTime: 2, priority: 3, color: COLOR_PALETTE[2] },
      { id: 'P4', arrivalTime: 18, burstTime: 5, priority: 1, color: COLOR_PALETTE[3] },
    ],
  },
  {
    name: 'Priority Inversion / Spread',
    description: 'Diverse priority levels demonstrating non-preemptive priority queue execution order.',
    recommendedTq: 2,
    processes: [
      { id: 'P1', arrivalTime: 0, burstTime: 4, priority: 3, color: COLOR_PALETTE[0] },
      { id: 'P2', arrivalTime: 1, burstTime: 5, priority: 1, color: COLOR_PALETTE[1] },
      { id: 'P3', arrivalTime: 2, burstTime: 2, priority: 5, color: COLOR_PALETTE[2] },
      { id: 'P4', arrivalTime: 3, burstTime: 1, priority: 2, color: COLOR_PALETTE[3] },
      { id: 'P5', arrivalTime: 4, burstTime: 6, priority: 4, color: COLOR_PALETTE[4] },
    ],
  },
];

/* ---------------- ALGORITHM LOGIC IMPLEMENTATIONS ---------------- */

export function runFCFS(processes: Process[]): SimulationResult {
  if (processes.length === 0) {
    return createEmptyResult('FCFS', 'First-Come, First-Served (FCFS)');
  }

  const sorted = [...processes].sort((a, b) => {
    if (a.arrivalTime !== b.arrivalTime) return a.arrivalTime - b.arrivalTime;
    return a.id.localeCompare(b.id, undefined, { numeric: true });
  });

  const gantt: GanttBlock[] = [];
  const results: ProcessResult[] = [];
  let currentTime = 0;
  let totalIdle = 0;

  sorted.forEach((p) => {
    if (currentTime < p.arrivalTime) {
      const idleDuration = p.arrivalTime - currentTime;
      gantt.push({
        processId: 'IDLE',
        startTime: currentTime,
        endTime: p.arrivalTime,
        duration: idleDuration,
        isIdle: true,
      });
      totalIdle += idleDuration;
      currentTime = p.arrivalTime;
    }

    const startTime = currentTime;
    const completionTime = startTime + p.burstTime;
    currentTime = completionTime;

    gantt.push({
      processId: p.id,
      startTime,
      endTime: completionTime,
      duration: p.burstTime,
      color: p.color,
    });

    const turnaroundTime = completionTime - p.arrivalTime;
    const waitingTime = turnaroundTime - p.burstTime;
    const responseTime = startTime - p.arrivalTime;

    results.push({
      id: p.id,
      arrivalTime: p.arrivalTime,
      burstTime: p.burstTime,
      priority: p.priority,
      completionTime,
      turnaroundTime,
      waitingTime,
      responseTime,
      color: p.color,
    });
  });

  return computeAggregateMetrics('FCFS', 'First-Come, First-Served (FCFS)', gantt, results, totalIdle);
}

export function runSJF(processes: Process[]): SimulationResult {
  if (processes.length === 0) {
    return createEmptyResult('SJF', 'Shortest Job First (SJF - Non-Preemptive)');
  }

  const n = processes.length;
  const completed = new Array(n).fill(false);
  const gantt: GanttBlock[] = [];
  const results: ProcessResult[] = [];

  let currentTime = 0;
  let completedCount = 0;
  let totalIdle = 0;

  while (completedCount < n) {
    // Find all processes that have arrived and are not completed
    const availableIndices: number[] = [];
    for (let i = 0; i < n; i++) {
      if (!completed[i] && processes[i].arrivalTime <= currentTime) {
        availableIndices.push(i);
      }
    }

    if (availableIndices.length === 0) {
      // CPU Idle until next arrival
      let nextArrival = Infinity;
      for (let i = 0; i < n; i++) {
        if (!completed[i] && processes[i].arrivalTime < nextArrival) {
          nextArrival = processes[i].arrivalTime;
        }
      }
      const idleDuration = nextArrival - currentTime;
      gantt.push({
        processId: 'IDLE',
        startTime: currentTime,
        endTime: nextArrival,
        duration: idleDuration,
        isIdle: true,
      });
      totalIdle += idleDuration;
      currentTime = nextArrival;
      continue;
    }

    // Pick process with shortest burst time
    availableIndices.sort((a, b) => {
      const pA = processes[a];
      const pB = processes[b];
      if (pA.burstTime !== pB.burstTime) return pA.burstTime - pB.burstTime;
      if (pA.arrivalTime !== pB.arrivalTime) return pA.arrivalTime - pB.arrivalTime;
      return pA.id.localeCompare(pB.id, undefined, { numeric: true });
    });

    const chosenIdx = availableIndices[0];
    const p = processes[chosenIdx];

    const startTime = currentTime;
    const completionTime = startTime + p.burstTime;
    currentTime = completionTime;
    completed[chosenIdx] = true;
    completedCount++;

    gantt.push({
      processId: p.id,
      startTime,
      endTime: completionTime,
      duration: p.burstTime,
      color: p.color,
    });

    const turnaroundTime = completionTime - p.arrivalTime;
    const waitingTime = turnaroundTime - p.burstTime;
    const responseTime = startTime - p.arrivalTime;

    results.push({
      id: p.id,
      arrivalTime: p.arrivalTime,
      burstTime: p.burstTime,
      priority: p.priority,
      completionTime,
      turnaroundTime,
      waitingTime,
      responseTime,
      color: p.color,
    });
  }

  // Sort results by original process id
  results.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  return computeAggregateMetrics('SJF', 'Shortest Job First (SJF - Non-Preemptive)', gantt, results, totalIdle);
}

export function runRoundRobin(processes: Process[], timeQuantum: number): SimulationResult {
  if (processes.length === 0) {
    return createEmptyResult('RR', `Round Robin (RR, TQ=${timeQuantum})`, timeQuantum);
  }

  const tq = Math.max(1, timeQuantum || 1);
  const n = processes.length;

  interface RRProcessState {
    process: Process;
    remainingTime: number;
    firstStartTime: number;
    completionTime: number;
    inQueue: boolean;
  }

  const states: RRProcessState[] = processes.map((p) => ({
    process: p,
    remainingTime: p.burstTime,
    firstStartTime: -1,
    completionTime: 0,
    inQueue: false,
  }));

  // Sort states by arrival time to handle initial queue
  const queue: number[] = [];
  const gantt: GanttBlock[] = [];
  let currentTime = 0;
  let completedCount = 0;
  let totalIdle = 0;

  // Add all processes that have arrived at t <= 0
  for (let i = 0; i < n; i++) {
    if (states[i].process.arrivalTime <= currentTime && !states[i].inQueue) {
      queue.push(i);
      states[i].inQueue = true;
    }
  }

  while (completedCount < n) {
    if (queue.length === 0) {
      // Find next earliest arrival
      let nextArrival = Infinity;
      for (let i = 0; i < n; i++) {
        if (states[i].remainingTime > 0 && states[i].process.arrivalTime < nextArrival) {
          nextArrival = states[i].process.arrivalTime;
        }
      }

      if (nextArrival !== Infinity && nextArrival > currentTime) {
        const idleDuration = nextArrival - currentTime;
        gantt.push({
          processId: 'IDLE',
          startTime: currentTime,
          endTime: nextArrival,
          duration: idleDuration,
          isIdle: true,
        });
        totalIdle += idleDuration;
        currentTime = nextArrival;
      }

      // Enqueue processes arrived at new currentTime
      for (let i = 0; i < n; i++) {
        if (states[i].remainingTime > 0 && states[i].process.arrivalTime <= currentTime && !states[i].inQueue) {
          queue.push(i);
          states[i].inQueue = true;
        }
      }

      if (queue.length === 0) break;
    }

    const currentIdx = queue.shift()!;
    states[currentIdx].inQueue = false;
    const current = states[currentIdx];

    if (current.firstStartTime === -1) {
      current.firstStartTime = currentTime;
    }

    const execTime = Math.min(current.remainingTime, tq);
    const startTime = currentTime;
    const endTime = startTime + execTime;

    gantt.push({
      processId: current.process.id,
      startTime,
      endTime,
      duration: execTime,
      color: current.process.color,
    });

    currentTime = endTime;
    current.remainingTime -= execTime;

    // Check for newly arrived processes while this process was executing
    for (let i = 0; i < n; i++) {
      if (
        i !== currentIdx &&
        states[i].remainingTime > 0 &&
        states[i].process.arrivalTime <= currentTime &&
        !states[i].inQueue &&
        !queue.includes(i)
      ) {
        queue.push(i);
        states[i].inQueue = true;
      }
    }

    if (current.remainingTime > 0) {
      queue.push(currentIdx);
      current.inQueue = true;
    } else {
      current.completionTime = currentTime;
      completedCount++;
    }
  }

  // Merge consecutive Gantt blocks if they belong to the same process (optional visual clarity, or keep discrete slices)
  const results: ProcessResult[] = states.map((s) => {
    const p = s.process;
    const turnaroundTime = s.completionTime - p.arrivalTime;
    const waitingTime = turnaroundTime - p.burstTime;
    const responseTime = s.firstStartTime - p.arrivalTime;

    return {
      id: p.id,
      arrivalTime: p.arrivalTime,
      burstTime: p.burstTime,
      priority: p.priority,
      completionTime: s.completionTime,
      turnaroundTime,
      waitingTime,
      responseTime,
      color: p.color,
    };
  });

  results.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  return computeAggregateMetrics('RR', `Round Robin (RR, TQ=${tq})`, gantt, results, totalIdle, tq);
}

export function runPriority(processes: Process[], priorityOrder: PriorityOrder): SimulationResult {
  if (processes.length === 0) {
    return createEmptyResult('PRIORITY', 'Priority Scheduling (Non-Preemptive)');
  }

  const n = processes.length;
  const completed = new Array(n).fill(false);
  const gantt: GanttBlock[] = [];
  const results: ProcessResult[] = [];

  let currentTime = 0;
  let completedCount = 0;
  let totalIdle = 0;

  while (completedCount < n) {
    const availableIndices: number[] = [];
    for (let i = 0; i < n; i++) {
      if (!completed[i] && processes[i].arrivalTime <= currentTime) {
        availableIndices.push(i);
      }
    }

    if (availableIndices.length === 0) {
      let nextArrival = Infinity;
      for (let i = 0; i < n; i++) {
        if (!completed[i] && processes[i].arrivalTime < nextArrival) {
          nextArrival = processes[i].arrivalTime;
        }
      }
      const idleDuration = nextArrival - currentTime;
      gantt.push({
        processId: 'IDLE',
        startTime: currentTime,
        endTime: nextArrival,
        duration: idleDuration,
        isIdle: true,
      });
      totalIdle += idleDuration;
      currentTime = nextArrival;
      continue;
    }

    // Sort available by priority
    availableIndices.sort((a, b) => {
      const pA = processes[a];
      const pB = processes[b];
      const priorityDiff =
        priorityOrder === 'LOWER_IS_HIGHER' ? pA.priority - pB.priority : pB.priority - pA.priority;

      if (priorityDiff !== 0) return priorityDiff;
      if (pA.arrivalTime !== pB.arrivalTime) return pA.arrivalTime - pB.arrivalTime;
      return pA.id.localeCompare(pB.id, undefined, { numeric: true });
    });

    const chosenIdx = availableIndices[0];
    const p = processes[chosenIdx];

    const startTime = currentTime;
    const completionTime = startTime + p.burstTime;
    currentTime = completionTime;
    completed[chosenIdx] = true;
    completedCount++;

    gantt.push({
      processId: p.id,
      startTime,
      endTime: completionTime,
      duration: p.burstTime,
      color: p.color,
    });

    const turnaroundTime = completionTime - p.arrivalTime;
    const waitingTime = turnaroundTime - p.burstTime;
    const responseTime = startTime - p.arrivalTime;

    results.push({
      id: p.id,
      arrivalTime: p.arrivalTime,
      burstTime: p.burstTime,
      priority: p.priority,
      completionTime,
      turnaroundTime,
      waitingTime,
      responseTime,
      color: p.color,
    });
  }

  results.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  return computeAggregateMetrics('PRIORITY', 'Priority Scheduling (Non-Preemptive)', gantt, results, totalIdle);
}

function createEmptyResult(algorithm: AlgorithmType, algorithmName: string, timeQuantum?: number): SimulationResult {
  return {
    algorithm,
    algorithmName,
    gantt: [],
    processResults: [],
    avgWaitingTime: 0,
    avgTurnaroundTime: 0,
    avgResponseTime: 0,
    totalTime: 0,
    idleTime: 0,
    cpuUtilization: 100,
    throughput: 0,
    timeQuantum,
  };
}

function computeAggregateMetrics(
  algorithm: AlgorithmType,
  algorithmName: string,
  gantt: GanttBlock[],
  results: ProcessResult[],
  idleTime: number,
  timeQuantum?: number
): SimulationResult {
  const totalTime = gantt.length > 0 ? gantt[gantt.length - 1].endTime : 0;
  const numProcesses = results.length;

  const totalWT = results.reduce((acc, r) => acc + r.waitingTime, 0);
  const totalTAT = results.reduce((acc, r) => acc + r.turnaroundTime, 0);
  const totalRT = results.reduce((acc, r) => acc + r.responseTime, 0);

  const avgWaitingTime = numProcesses > 0 ? Number((totalWT / numProcesses).toFixed(2)) : 0;
  const avgTurnaroundTime = numProcesses > 0 ? Number((totalTAT / numProcesses).toFixed(2)) : 0;
  const avgResponseTime = numProcesses > 0 ? Number((totalRT / numProcesses).toFixed(2)) : 0;

  const busyTime = totalTime - idleTime;
  const cpuUtilization = totalTime > 0 ? Number(((busyTime / totalTime) * 100).toFixed(1)) : 100;
  const throughput = totalTime > 0 ? Number((numProcesses / totalTime).toFixed(3)) : 0;

  return {
    algorithm,
    algorithmName,
    gantt,
    processResults: results,
    avgWaitingTime,
    avgTurnaroundTime,
    avgResponseTime,
    totalTime,
    idleTime,
    cpuUtilization,
    throughput,
    timeQuantum,
  };
}

/* ---------------- MAIN COMPONENT ---------------- */

export default function App() {
  const [processes, setProcesses] = useState<Process[]>(PRESETS[0].processes);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<AlgorithmType>('FCFS');
  const [timeQuantum, setTimeQuantum] = useState<number>(2);
  const [priorityOrder, setPriorityOrder] = useState<PriorityOrder>('LOWER_IS_HIGHER');

  // Interactive Form State for New Process
  const [newPid, setNewPid] = useState<string>('P5');
  const [newArrival, setNewArrival] = useState<number>(0);
  const [newBurst, setNewBurst] = useState<number>(4);
  const [newPriority, setNewPriority] = useState<number>(1);

  // Gantt Chart Interactive Scrubber / Playback
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackTime, setPlaybackTime] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [hoveredBlock, setHoveredBlock] = useState<GanttBlock | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto calculate next suggested PID
  useEffect(() => {
    const existingNums = processes
      .map((p) => parseInt(p.id.replace(/\D/g, ''), 10))
      .filter((n) => !isNaN(n));
    const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : 0;
    setNewPid(`P${maxNum + 1}`);
  }, [processes]);

  // Compute Active Single Algorithm Result
  const activeResult: SimulationResult = useMemo(() => {
    switch (selectedAlgorithm) {
      case 'FCFS':
        return runFCFS(processes);
      case 'SJF':
        return runSJF(processes);
      case 'RR':
        return runRoundRobin(processes, timeQuantum);
      case 'PRIORITY':
        return runPriority(processes, priorityOrder);
      default:
        return runFCFS(processes);
    }
  }, [processes, selectedAlgorithm, timeQuantum, priorityOrder]);

  // Compute Comparative Results for All 4 Algorithms simultaneously
  const comparativeResults: SimulationResult[] = useMemo(() => {
    return [
      runFCFS(processes),
      runSJF(processes),
      runRoundRobin(processes, timeQuantum),
      runPriority(processes, priorityOrder),
    ];
  }, [processes, timeQuantum, priorityOrder]);

  // Find optimal algorithm (lowest avg waiting time)
  const bestAlgorithm = useMemo(() => {
    if (comparativeResults.length === 0 || processes.length === 0) return null;
    let best = comparativeResults[0];
    for (const res of comparativeResults) {
      if (res.avgWaitingTime < best.avgWaitingTime) {
        best = res;
      }
    }
    return best;
  }, [comparativeResults, processes]);

  // Playback timer loop
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setPlaybackTime((prev) => {
          if (prev >= activeResult.totalTime) {
            setIsPlaying(false);
            return activeResult.totalTime;
          }
          return prev + 1;
        });
      }, 1000 / playbackSpeed);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, activeResult.totalTime, playbackSpeed]);

  // Reset playback if algorithm or process list changes
  useEffect(() => {
    setPlaybackTime(activeResult.totalTime);
    setIsPlaying(false);
  }, [selectedAlgorithm, processes, timeQuantum, priorityOrder, activeResult.totalTime]);

  const handleAddProcess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPid.trim()) return;

    // Check duplicate ID
    if (processes.some((p) => p.id.toLowerCase() === newPid.trim().toLowerCase())) {
      alert(`Process ID "${newPid}" already exists. Please choose a unique name.`);
      return;
    }

    const color = COLOR_PALETTE[processes.length % COLOR_PALETTE.length];
    const newProcess: Process = {
      id: newPid.trim().toUpperCase(),
      arrivalTime: Math.max(0, Number(newArrival) || 0),
      burstTime: Math.max(1, Number(newBurst) || 1),
      priority: Math.max(1, Number(newPriority) || 1),
      color,
    };

    setProcesses([...processes, newProcess]);
    setNewArrival(0);
    setNewBurst(4);
    setNewPriority(1);
  };

  const handleUpdateProcess = (index: number, field: keyof Process, value: string | number) => {
    const updated = [...processes];
    if (field === 'arrivalTime' || field === 'burstTime' || field === 'priority') {
      const numVal = Math.max(field === 'burstTime' ? 1 : 0, Number(value) || 0);
      updated[index] = { ...updated[index], [field]: numVal };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setProcesses(updated);
  };

  const handleDeleteProcess = (id: string) => {
    setProcesses(processes.filter((p) => p.id !== id));
  };

  const handleClearAll = () => {
    setProcesses([]);
  };

  const handleLoadPreset = (presetProcesses: Process[], recTq?: number) => {
    setProcesses(presetProcesses);
    if (recTq) setTimeQuantum(recTq);
  };

  const handleRandomize = () => {
    const count = Math.floor(Math.random() * 3) + 4; // 4 to 6
    const randomProcesses: Process[] = [];
    for (let i = 1; i <= count; i++) {
      randomProcesses.push({
        id: `P${i}`,
        arrivalTime: Math.floor(Math.random() * 7),
        burstTime: Math.floor(Math.random() * 8) + 1,
        priority: Math.floor(Math.random() * 5) + 1,
        color: COLOR_PALETTE[(i - 1) % COLOR_PALETTE.length],
      });
    }
    setProcesses(randomProcesses);
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(processes, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'cpu_processes.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            const valid = parsed.map((p, idx) => ({
              id: p.id || `P${idx + 1}`,
              arrivalTime: Math.max(0, Number(p.arrivalTime) || 0),
              burstTime: Math.max(1, Number(p.burstTime) || 1),
              priority: Math.max(1, Number(p.priority) || 1),
              color: p.color || COLOR_PALETTE[idx % COLOR_PALETTE.length],
            }));
            setProcesses(valid);
          }
        } catch {
          alert('Invalid JSON file format.');
        }
      };
    }
  };

  // Filter gantt blocks up to current playback time
  const visibleGantt = useMemo(() => {
    if (playbackTime >= activeResult.totalTime) {
      return activeResult.gantt;
    }
    const blocks: GanttBlock[] = [];
    for (const b of activeResult.gantt) {
      if (b.startTime >= playbackTime) break;
      if (b.endTime <= playbackTime) {
        blocks.push(b);
      } else {
        // partial execution block
        blocks.push({
          ...b,
          endTime: playbackTime,
          duration: playbackTime - b.startTime,
        });
        break;
      }
    }
    return blocks;
  }, [activeResult.gantt, activeResult.totalTime, playbackTime]);

  // Current CPU active process at playback time
  const currentRunningProcess = useMemo(() => {
    if (visibleGantt.length === 0) return null;
    const lastBlock = visibleGantt[visibleGantt.length - 1];
    if (lastBlock.isIdle) return { id: 'IDLE', color: '#64748b' };
    return processes.find((p) => p.id === lastBlock.processId) || null;
  }, [visibleGantt, processes]);

  return (
    <div id="cpu-visualizer-app" className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* Top Navigation Bar */}
      <header id="main-header" className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur sticky top-0 z-30 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
                CPU Scheduling Visualizer
                <span className="text-[11px] font-mono uppercase bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded">
                  v2.0
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Real-time simulation engine & comparative benchmark analytics
              </p>
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="flex items-center flex-wrap gap-2">
            <div className="flex items-center bg-slate-800/90 border border-slate-700/80 rounded-lg p-1 text-xs">
              <span className="text-slate-400 px-2 py-1 flex items-center gap-1 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Presets:
              </span>
              <select
                id="preset-selector"
                onChange={(e) => {
                  const idx = Number(e.target.value);
                  if (idx >= 0 && idx < PRESETS.length) {
                    handleLoadPreset(PRESETS[idx].processes, PRESETS[idx].recommendedTq);
                  }
                }}
                defaultValue="0"
                aria-label="Select benchmark preset scenario"
                className="bg-slate-900 text-slate-200 border-0 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 cursor-pointer outline-none"
              >
                {PRESETS.map((p, idx) => (
                  <option key={p.name} value={idx}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              id="randomize-btn"
              onClick={handleRandomize}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-colors shadow-sm"
              title="Generate random process workload"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
              Randomize
            </button>

            <button
              id="export-btn"
              onClick={handleExportJSON}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-colors shadow-sm"
              title="Export process set as JSON"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              Export
            </button>

            <label
              htmlFor="import-input"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-colors shadow-sm cursor-pointer"
              title="Import process set from JSON"
            >
              <Upload className="w-3.5 h-3.5 text-slate-400" />
              Import
              <input
                id="import-input"
                type="file"
                accept=".json"
                onChange={handleImportJSON}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Top Configuration Grid: Process Input Table + Algorithm Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Process Input & Management (7 cols) */}
          <section id="process-table-section" className="lg:col-span-7 bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">
                  Process Workload Queue ({processes.length})
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  id="clear-all-btn"
                  onClick={handleClearAll}
                  disabled={processes.length === 0}
                  className="text-xs text-rose-400 hover:text-rose-300 disabled:opacity-40 disabled:hover:text-rose-400 flex items-center gap-1 px-2 py-1 rounded hover:bg-rose-950/30 transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Clear All
                </button>
              </div>
            </div>

            {/* Editable Process Table */}
            <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/60 max-h-64 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 font-mono uppercase tracking-wider sticky top-0 z-10 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3 w-16">ID</th>
                    <th className="py-2.5 px-3">Arrival Time (AT)</th>
                    <th className="py-2.5 px-3">Burst Time (BT)</th>
                    <th className="py-2.5 px-3">Priority</th>
                    <th className="py-2.5 px-3 text-right w-12">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {processes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500 font-sans text-xs">
                        No processes in queue. Add processes below or load a preset scenario.
                      </td>
                    </tr>
                  ) : (
                    processes.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-slate-900/50 transition-colors">
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                              style={{ backgroundColor: p.color }}
                            />
                            <span className="font-bold text-slate-200">{p.id}</span>
                          </div>
                        </td>
                        <td className="py-1.5 px-3">
                          <input
                            type="number"
                            min="0"
                            value={p.arrivalTime}
                            onChange={(e) => handleUpdateProcess(idx, 'arrivalTime', e.target.value)}
                            aria-label={`Arrival time for ${p.id}`}
                            className="w-20 bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          />
                        </td>
                        <td className="py-1.5 px-3">
                          <input
                            type="number"
                            min="1"
                            value={p.burstTime}
                            onChange={(e) => handleUpdateProcess(idx, 'burstTime', e.target.value)}
                            aria-label={`Burst time for ${p.id}`}
                            className="w-20 bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          />
                        </td>
                        <td className="py-1.5 px-3">
                          <input
                            type="number"
                            min="1"
                            value={p.priority}
                            onChange={(e) => handleUpdateProcess(idx, 'priority', e.target.value)}
                            aria-label={`Priority for ${p.id}`}
                            className="w-20 bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-slate-200 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          />
                        </td>
                        <td className="py-1.5 px-3 text-right">
                          <button
                            onClick={() => handleDeleteProcess(p.id)}
                            className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition-colors"
                            title={`Remove ${p.id}`}
                            aria-label={`Delete ${p.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Inline Add Process Form */}
            <form
              id="add-process-form"
              onSubmit={handleAddProcess}
              className="bg-slate-950/80 p-3.5 rounded-lg border border-slate-800 flex flex-wrap items-end gap-3"
            >
              <div className="w-20">
                <label htmlFor="new-pid" className="block text-[11px] font-medium text-slate-400 mb-1">
                  PID
                </label>
                <input
                  id="new-pid"
                  type="text"
                  value={newPid}
                  onChange={(e) => setNewPid(e.target.value)}
                  placeholder="P1"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:ring-1 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div className="w-24">
                <label htmlFor="new-arrival" className="block text-[11px] font-medium text-slate-400 mb-1">
                  Arrival (AT)
                </label>
                <input
                  id="new-arrival"
                  type="number"
                  min="0"
                  value={newArrival}
                  onChange={(e) => setNewArrival(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:ring-1 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div className="w-24">
                <label htmlFor="new-burst" className="block text-[11px] font-medium text-slate-400 mb-1">
                  Burst (BT)
                </label>
                <input
                  id="new-burst"
                  type="number"
                  min="1"
                  value={newBurst}
                  onChange={(e) => setNewBurst(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:ring-1 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div className="w-24">
                <label htmlFor="new-priority" className="block text-[11px] font-medium text-slate-400 mb-1">
                  Priority
                </label>
                <input
                  id="new-priority"
                  type="number"
                  min="1"
                  value={newPriority}
                  onChange={(e) => setNewPriority(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:ring-1 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <button
                id="add-process-btn"
                type="submit"
                className="flex-1 min-w-[120px] bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-2 px-3 rounded flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Add Process
              </button>
            </form>
          </section>

          {/* Right Column: Algorithm Selector & Parameters (5 cols) */}
          <section id="algorithm-controls-section" className="lg:col-span-5 bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-400" />
                  <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">
                    Algorithm Configuration
                  </h2>
                </div>
              </div>

              {/* Algorithm Radio/Button Cards */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-400">
                  Select Active Scheduling Algorithm:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'FCFS', label: 'First-Come, First-Served', short: 'FCFS' },
                    { id: 'SJF', label: 'Shortest Job First (NP)', short: 'SJF' },
                    { id: 'RR', label: 'Round Robin', short: 'Round Robin' },
                    { id: 'PRIORITY', label: 'Priority Scheduling (NP)', short: 'Priority' },
                  ].map((algo) => {
                    const isSelected = selectedAlgorithm === algo.id;
                    return (
                      <button
                        key={algo.id}
                        id={`algo-btn-${algo.id}`}
                        onClick={() => setSelectedAlgorithm(algo.id as AlgorithmType)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          isSelected
                            ? 'bg-blue-950/50 border-blue-500 text-white ring-1 ring-blue-500'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs font-mono">{algo.short}</span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 truncate">{algo.label}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Conditional Algorithm Parameters */}
              {selectedAlgorithm === 'RR' && (
                <div className="bg-slate-950/80 p-3.5 rounded-lg border border-blue-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="time-quantum-input" className="text-xs font-semibold text-blue-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      Time Quantum (TQ)
                    </label>
                    <span className="font-mono text-xs font-bold text-white bg-blue-900/60 px-2 py-0.5 rounded border border-blue-700">
                      {timeQuantum} unit{timeQuantum > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      id="time-quantum-input"
                      type="range"
                      min="1"
                      max="10"
                      value={timeQuantum}
                      onChange={(e) => setTimeQuantum(Number(e.target.value))}
                      className="w-full accent-blue-500 cursor-pointer"
                    />
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={timeQuantum}
                      onChange={(e) => setTimeQuantum(Math.max(1, Number(e.target.value)))}
                      className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-center font-mono text-white outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Each process receives a maximum continuous CPU slice of {timeQuantum} units before being pre-empted to the back of the queue.
                  </p>
                </div>
              )}

              {selectedAlgorithm === 'PRIORITY' && (
                <div className="bg-slate-950/80 p-3.5 rounded-lg border border-slate-800 space-y-2">
                  <label className="block text-xs font-semibold text-slate-300">
                    Priority Convention:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPriorityOrder('LOWER_IS_HIGHER')}
                      className={`text-xs p-2 rounded border text-center transition-colors ${
                        priorityOrder === 'LOWER_IS_HIGHER'
                          ? 'bg-blue-950/60 border-blue-500 text-blue-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      Lower # = Higher Priority
                      <span className="block text-[10px] text-slate-400 mt-0.5">(1 is highest)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPriorityOrder('HIGHER_IS_HIGHER')}
                      className={`text-xs p-2 rounded border text-center transition-colors ${
                        priorityOrder === 'HIGHER_IS_HIGHER'
                          ? 'bg-blue-950/60 border-blue-500 text-blue-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      Higher # = Higher Priority
                      <span className="block text-[10px] text-slate-400 mt-0.5">(e.g. 5 &gt; 1)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Algorithm Insight / Explanation */}
            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 text-xs text-slate-400 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-300">
                  {selectedAlgorithm === 'FCFS' && 'First-Come, First-Served: '}
                  {selectedAlgorithm === 'SJF' && 'Shortest Job First: '}
                  {selectedAlgorithm === 'RR' && 'Round Robin: '}
                  {selectedAlgorithm === 'PRIORITY' && 'Priority Scheduling: '}
                </span>
                {selectedAlgorithm === 'FCFS' && 'Executes processes strictly in arrival order. Non-preemptive and simple, but vulnerable to the convoy effect.'}
                {selectedAlgorithm === 'SJF' && 'Selects the ready process with the shortest execution time. Mathematically optimal for minimizing average waiting time.'}
                {selectedAlgorithm === 'RR' && 'Allocates fixed time slices cyclically. Preemptive and responsive; ideal for multi-user interactive systems.'}
                {selectedAlgorithm === 'PRIORITY' && 'Selects the process with the highest assigned priority rank. Starvation can be mitigated via aging.'}
              </div>
            </div>
          </section>
        </div>

        {/* Gantt Chart & Interactive Visual Timeline */}
        <section id="gantt-chart-section" className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">
                  Gantt Chart Execution Timeline
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Detailed chronological execution of {activeResult.algorithmName} (Total makespan: {activeResult.totalTime} units)
              </p>
            </div>

            {/* Playback & Step Controls */}
            <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
              <button
                id="playback-reset-btn"
                onClick={() => {
                  setIsPlaying(false);
                  setPlaybackTime(0);
                }}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
                title="Reset to t=0"
                aria-label="Reset simulation to beginning"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                id="playback-step-back-btn"
                onClick={() => {
                  setIsPlaying(false);
                  setPlaybackTime((prev) => Math.max(0, prev - 1));
                }}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
                title="Step backward 1 unit"
                aria-label="Step backward 1 unit"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>
              <button
                id="playback-play-toggle-btn"
                onClick={() => {
                  if (playbackTime >= activeResult.totalTime) {
                    setPlaybackTime(0);
                  }
                  setIsPlaying(!isPlaying);
                }}
                className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center gap-1 transition-colors"
                aria-label={isPlaying ? 'Pause simulation' : 'Play simulation'}
              >
                {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>
              <button
                id="playback-step-forward-btn"
                onClick={() => {
                  setIsPlaying(false);
                  setPlaybackTime((prev) => Math.min(activeResult.totalTime, prev + 1));
                }}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
                title="Step forward 1 unit"
                aria-label="Step forward 1 unit"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>

              <div className="h-4 w-px bg-slate-800 mx-1" />

              <span className="font-mono text-slate-300 font-medium">
                t = {playbackTime} / {activeResult.totalTime}
              </span>

              <select
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                aria-label="Select playback speed"
                className="bg-slate-900 text-slate-300 border border-slate-800 rounded px-1.5 py-0.5 text-[11px] outline-none ml-1 cursor-pointer"
              >
                <option value={0.5}>0.5x</option>
                <option value={1}>1.0x</option>
                <option value={2}>2.0x</option>
                <option value={4}>4.0x</option>
              </select>
            </div>
          </div>

          {/* Active CPU State Badge during playback */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Current CPU State at t={playbackTime}:</span>
              {currentRunningProcess ? (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded font-mono font-bold text-white text-xs"
                  style={{
                    backgroundColor: currentRunningProcess.color || '#64748b',
                  }}
                >
                  <Zap className="w-3 h-3" />
                  {currentRunningProcess.id === 'IDLE' ? 'CPU IDLE (Waiting)' : `Executing ${currentRunningProcess.id}`}
                </span>
              ) : (
                <span className="text-slate-500 font-mono">No active workload</span>
              )}
            </div>

            <div className="flex items-center gap-4 text-slate-400 text-[11px]">
              <span>Makespan: <strong className="text-slate-200 font-mono">{activeResult.totalTime}</strong></span>
              <span>CPU Busy: <strong className="text-slate-200 font-mono">{activeResult.totalTime - activeResult.idleTime}</strong></span>
              <span>CPU Utilization: <strong className="text-emerald-400 font-mono">{activeResult.cpuUtilization}%</strong></span>
            </div>
          </div>

          {/* Horizontal Gantt Bar */}
          {activeResult.gantt.length === 0 ? (
            <div className="h-20 flex items-center justify-center bg-slate-950/60 rounded-lg border border-slate-800 text-slate-500 text-xs">
              No processes to simulate.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative w-full overflow-x-auto pb-4 pt-2">
                {/* Gantt Blocks Container */}
                <div className="min-w-[600px] flex h-14 rounded-lg overflow-hidden border border-slate-700/80 bg-slate-950 relative shadow-inner">
                  {visibleGantt.map((block, idx) => {
                    const totalMakespan = Math.max(1, activeResult.totalTime);
                    const widthPercent = (block.duration / totalMakespan) * 100;

                    return (
                      <div
                        key={`${block.processId}-${block.startTime}-${idx}`}
                        style={{
                          width: `${widthPercent}%`,
                          backgroundColor: block.isIdle ? '#1e293b' : block.color || '#3b82f6',
                        }}
                        onMouseEnter={() => setHoveredBlock(block)}
                        onMouseLeave={() => setHoveredBlock(null)}
                        className={`h-full relative flex flex-col items-center justify-center text-xs font-mono font-bold transition-all border-r border-slate-900/60 cursor-pointer ${
                          block.isIdle
                            ? 'text-slate-400 bg-stripes'
                            : 'text-white hover:brightness-110'
                        }`}
                        title={`${block.processId}: [${block.startTime} → ${block.endTime}] (${block.duration} units)`}
                      >
                        <span className="tracking-wide drop-shadow-sm text-xs truncate px-1">
                          {block.processId}
                        </span>
                        <span className="text-[10px] opacity-80 font-normal">
                          Δ{block.duration}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Timeline Numbers / Ticks */}
                <div className="min-w-[600px] relative h-6 mt-1 flex text-[11px] font-mono text-slate-400">
                  {activeResult.gantt.map((block, idx) => {
                    const totalMakespan = Math.max(1, activeResult.totalTime);
                    const leftPercent = (block.startTime / totalMakespan) * 100;

                    return (
                      <div
                        key={`tick-start-${idx}`}
                        style={{ left: `${leftPercent}%` }}
                        className="absolute transform -translate-x-1/2 flex flex-col items-center"
                      >
                        <span className="w-0.5 h-1.5 bg-slate-700 mb-0.5" />
                        <span>{block.startTime}</span>
                      </div>
                    );
                  })}
                  {/* Final ending timestamp */}
                  {activeResult.gantt.length > 0 && (
                    <div
                      style={{ left: '100%' }}
                      className="absolute transform -translate-x-1/2 flex flex-col items-center font-bold text-slate-300"
                    >
                      <span className="w-0.5 h-1.5 bg-slate-500 mb-0.5" />
                      <span>{activeResult.totalTime}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Hover Tooltip / Detail Callout */}
              {hoveredBlock && (
                <div className="bg-slate-950 border border-slate-700 p-2.5 rounded-lg text-xs flex items-center justify-between gap-4 font-mono text-slate-300">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: hoveredBlock.isIdle ? '#64748b' : hoveredBlock.color }}
                    />
                    <strong className="text-white">
                      {hoveredBlock.isIdle ? 'CPU IDLE' : hoveredBlock.processId}
                    </strong>
                  </div>
                  <div>Start Time: <strong className="text-white">{hoveredBlock.startTime}</strong></div>
                  <div>End Time: <strong className="text-white">{hoveredBlock.endTime}</strong></div>
                  <div>Duration: <strong className="text-white">{hoveredBlock.duration} units</strong></div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Results Data Table & Key Metrics Summary */}
        <section id="results-table-section" className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">
                Detailed Process Results ({activeResult.algorithmName})
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-400">
              TAT = CT - AT | WT = TAT - BT | RT = First CPU - AT
            </span>
          </div>

          {/* Results Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/60">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 font-mono uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-4">Process</th>
                  <th className="py-2.5 px-3">Arrival Time (AT)</th>
                  <th className="py-2.5 px-3">Burst Time (BT)</th>
                  <th className="py-2.5 px-3">Priority</th>
                  <th className="py-2.5 px-3 font-semibold text-slate-200">Completion Time (CT)</th>
                  <th className="py-2.5 px-3 font-semibold text-blue-300">Turnaround Time (TAT)</th>
                  <th className="py-2.5 px-3 font-semibold text-emerald-300">Waiting Time (WT)</th>
                  <th className="py-2.5 px-3 font-semibold text-amber-300">Response Time (RT)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {activeResult.processResults.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-500 font-sans text-xs">
                      No simulation data available.
                    </td>
                  </tr>
                ) : (
                  activeResult.processResults.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                            style={{ backgroundColor: r.color }}
                          />
                          <span className="font-bold text-slate-200">{r.id}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">{r.arrivalTime}</td>
                      <td className="py-2.5 px-3 text-slate-300">{r.burstTime}</td>
                      <td className="py-2.5 px-3 text-slate-400">{r.priority}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-100">{r.completionTime}</td>
                      <td className="py-2.5 px-3 font-bold text-blue-300">{r.turnaroundTime}</td>
                      <td className="py-2.5 px-3 font-bold text-emerald-300">{r.waitingTime}</td>
                      <td className="py-2.5 px-3 font-bold text-amber-300">{r.responseTime}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Aggregate Performance Metric Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-lg">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                Avg Waiting Time (WT)
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-xl font-bold font-mono text-emerald-400">
                  {activeResult.avgWaitingTime}
                </span>
                <span className="text-xs text-slate-500">units</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Average time spent in ready queue</p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-lg">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                Avg Turnaround Time (TAT)
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-xl font-bold font-mono text-blue-400">
                  {activeResult.avgTurnaroundTime}
                </span>
                <span className="text-xs text-slate-500">units</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Total time from arrival to completion</p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-lg">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                Avg Response Time (RT)
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-xl font-bold font-mono text-amber-400">
                  {activeResult.avgResponseTime}
                </span>
                <span className="text-xs text-slate-500">units</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Time until first CPU allocation</p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-lg">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                CPU Utilization & Makespan
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-xl font-bold font-mono text-slate-100">
                  {activeResult.cpuUtilization}%
                </span>
                <span className="text-xs text-slate-500">({activeResult.totalTime} units)</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Throughput: {activeResult.throughput} proc/unit</p>
            </div>
          </div>
        </section>

        {/* ---------------- COMPARATIVE ANALYSIS SECTION (BOTTOM) ---------------- */}
        <section id="comparative-analysis-section" className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-semibold text-slate-100 tracking-tight">
                  Multi-Algorithm Comparative Benchmark
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Simultaneous comparative evaluation of all 4 algorithms on the active workload ({processes.length} processes)
              </p>
            </div>

            {bestAlgorithm && (
              <div className="inline-flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/60 px-3.5 py-1.5 rounded-full text-xs text-emerald-300 shadow-sm">
                <TrendingDown className="w-4 h-4 text-emerald-400" />
                <span>
                  Winner: <strong className="text-white font-mono">{bestAlgorithm.algorithmName}</strong> (Avg WT: {bestAlgorithm.avgWaitingTime})
                </span>
              </div>
            )}
          </div>

          {/* Side-by-Side Comparison Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {comparativeResults.map((res) => {
              const isBest = bestAlgorithm?.algorithm === res.algorithm;
              const isCurrent = selectedAlgorithm === res.algorithm;

              return (
                <div
                  key={res.algorithm}
                  className={`rounded-xl p-4.5 transition-all relative flex flex-col justify-between ${
                    isBest
                      ? 'bg-slate-900 border-2 border-emerald-500/80 ring-2 ring-emerald-500/20 shadow-lg'
                      : 'bg-slate-950/70 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Top Badge */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-mono font-bold uppercase text-slate-300">
                        {res.algorithm}
                      </span>
                      {isBest && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full shadow-sm">
                          ★ Lowest Wait Time
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-semibold text-white truncate">
                      {res.algorithmName}
                    </h3>
                  </div>

                  {/* Primary Metrics Grid */}
                  <div className="my-4 space-y-2 font-mono">
                    <div className="flex items-center justify-between text-xs py-1 border-b border-slate-800/80">
                      <span className="text-slate-400 font-sans">Avg Waiting Time:</span>
                      <span className={`font-bold ${isBest ? 'text-emerald-400 text-sm' : 'text-slate-200'}`}>
                        {res.avgWaitingTime} units
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs py-1 border-b border-slate-800/80">
                      <span className="text-slate-400 font-sans">Avg Turnaround:</span>
                      <span className="text-slate-200 font-semibold">{res.avgTurnaroundTime} units</span>
                    </div>

                    <div className="flex items-center justify-between text-xs py-1 border-b border-slate-800/80">
                      <span className="text-slate-400 font-sans">Avg Response:</span>
                      <span className="text-slate-200 font-semibold">{res.avgResponseTime} units</span>
                    </div>

                    <div className="flex items-center justify-between text-xs py-1 border-b border-slate-800/80">
                      <span className="text-slate-400 font-sans">CPU Utilization:</span>
                      <span className="text-slate-300">{res.cpuUtilization}%</span>
                    </div>

                    <div className="flex items-center justify-between text-xs py-1">
                      <span className="text-slate-400 font-sans">Total Makespan:</span>
                      <span className="text-slate-400">{res.totalTime} units</span>
                    </div>
                  </div>

                  {/* Mini Gantt Preview */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono block">
                      Execution Sequence Preview:
                    </span>
                    <div className="h-4 w-full rounded overflow-hidden flex bg-slate-900 border border-slate-800">
                      {res.gantt.map((b, idx) => (
                        <div
                          key={idx}
                          style={{
                            width: `${(b.duration / Math.max(1, res.totalTime)) * 100}%`,
                            backgroundColor: b.isIdle ? '#334155' : b.color || '#3b82f6',
                          }}
                          className="h-full border-r border-slate-950/40"
                          title={`${b.processId} (${b.duration} units)`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Action to switch to this algorithm */}
                  <button
                    onClick={() => setSelectedAlgorithm(res.algorithm)}
                    className={`mt-4 w-full py-1.5 px-3 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                      isCurrent
                        ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {isCurrent ? 'Viewing Details Above' : 'Inspect Algorithm Details'}
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Visual Comparison Bar Chart for Waiting Time & Turnaround Time */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              Visual Benchmark Comparison (Lower is Better)
            </h3>

            <div className="space-y-4 pt-1 font-mono text-xs">
              {comparativeResults.map((res) => {
                const maxAvgWT = Math.max(...comparativeResults.map((r) => r.avgWaitingTime), 1);
                const maxAvgTAT = Math.max(...comparativeResults.map((r) => r.avgTurnaroundTime), 1);
                const isWinner = bestAlgorithm?.algorithm === res.algorithm;

                const wtWidth = (res.avgWaitingTime / maxAvgWT) * 100;
                const tatWidth = (res.avgTurnaroundTime / maxAvgTAT) * 100;

                return (
                  <div key={`bar-${res.algorithm}`} className="space-y-1.5 bg-slate-900/40 p-3 rounded-lg border border-slate-800/60">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200 flex items-center gap-2">
                        {res.algorithmName}
                        {isWinner && (
                          <span className="bg-emerald-950 text-emerald-300 border border-emerald-600/50 text-[10px] px-1.5 py-0.2 rounded font-sans">
                            Optimal
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-4 text-slate-400">
                        <span>Avg WT: <strong className="text-emerald-400">{res.avgWaitingTime}</strong></span>
                        <span>Avg TAT: <strong className="text-blue-400">{res.avgTurnaroundTime}</strong></span>
                      </div>
                    </div>

                    {/* WT Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 w-16 font-sans">Wait Time:</span>
                        <div className="flex-1 h-3 bg-slate-800/80 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${Math.max(4, wtWidth)}%` }}
                            className={`h-full rounded-full transition-all ${
                              isWinner ? 'bg-emerald-500' : 'bg-emerald-600/70'
                            }`}
                          />
                        </div>
                      </div>

                      {/* TAT Bar */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 w-16 font-sans">Turnaround:</span>
                        <div className="flex-1 h-3 bg-slate-800/80 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${Math.max(4, tatWidth)}%` }}
                            className="h-full rounded-full bg-blue-500/80 transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
