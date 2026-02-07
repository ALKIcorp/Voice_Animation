const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const playBtn = document.getElementById('playBtn');
const stopBtn = document.getElementById('stopBtn');
const activeModeLabel = document.getElementById('activeModeLabel');
const prevBtn = document.getElementById('prevMode');
const nextBtn = document.getElementById('nextMode');
const liveToggle = document.getElementById('liveToggle');

let isPlaying = false;
let width;
let height;

const modes = [
    { id: 'vocal', name: 'Vocal Engine' },
    { id: 'voice_profile', name: 'Custom Voice Profile' },
    { id: 'stutter', name: 'Stutter Trap' },
    { id: 'ghost', name: 'Ghost Signal' },
    { id: 'overdrive', name: 'Overdrive' },
    { id: 'minimal', name: 'Pure Minimal' },
    { id: 'seismic', name: 'Seismic Sub' },
    { id: 'glitch', name: 'Glitch Fragment' },
    { id: 'harmonic', name: 'Harmonic Flow' },
    { id: 'binary', name: 'Binary Peak' },
    { id: 'chaos', name: 'Pure Chaos' },
    { id: 'spark', name: 'Neural Spark' },
    { id: 'tide', name: 'Deep Tide' },
    { id: 'echo', name: 'Echo Chamber' },
    { id: 'pulse', name: 'Silicon Pulse' },
    { id: 'razor', name: 'Razor Edge' },
    { id: 'nebula', name: 'Nebula Drift' },
    { id: 'crush', name: 'Bit Crush' },
    { id: 'velocity', name: 'High Velocity' },
    { id: 'static', name: 'Radio Static' },
    { id: 'zenith', name: 'Peak Zenith' },
];

let currentModeIndex = 0;
const barCount = 80;
let bars = new Array(barCount).fill(0).map(() => ({ h: 4, targetH: 4, v: 0 }));
const voiceProfileEngine = window.createVoiceProfileEngine
    ? window.createVoiceProfileEngine({ barCount, getHeight: () => height })
    : null;
const liveSignalToggle = window.createLiveSignalToggle
    ? window.createLiveSignalToggle({
        liveToggle,
        modes,
        getIsPlaying: () => isPlaying,
        setIsPlaying: (value) => { isPlaying = value; },
        getCurrentModeIndex: () => currentModeIndex,
        setCurrentModeIndex: (value) => { currentModeIndex = value; },
        updateModeDisplay: () => updateModeDisplay(),
        getVoiceProfileEngine: () => voiceProfileEngine,
        setStatusLive: (enabled) => {
            if (enabled) {
                statusDot.className = 'w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse';
                statusText.innerText = 'Signal Live';
                statusText.classList.replace('opacity-20', 'opacity-100');
                statusText.classList.add('text-cyan-400');
                playBtn.classList.add('opacity-10', 'pointer-events-none');
                stopBtn.classList.remove('opacity-30');
            }
        },
    })
    : null;

function init() {
    resize();
    window.addEventListener('resize', resize);
    updateModeDisplay();
    animate();
}

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}

function updateModeDisplay() {
    const isLive = liveSignalToggle ? liveSignalToggle.isActive() : false;
    activeModeLabel.innerText = isLive ? 'Live Signal' : modes[currentModeIndex].name;
}

nextBtn.onclick = () => {
    if (liveSignalToggle && liveSignalToggle.isActive()) return;
    currentModeIndex = (currentModeIndex + 1) % modes.length;
    updateModeDisplay();
};

prevBtn.onclick = () => {
    if (liveSignalToggle && liveSignalToggle.isActive()) return;
    currentModeIndex = (currentModeIndex - 1 + modes.length) % modes.length;
    updateModeDisplay();
};

playBtn.onclick = () => {
    isPlaying = true;
    if (voiceProfileEngine) {
        voiceProfileEngine.start();
    }
    statusDot.className = 'w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse';
    statusText.innerText = 'Signal Live';
    statusText.classList.replace('opacity-20', 'opacity-100');
    statusText.classList.add('text-cyan-400');
    playBtn.classList.add('opacity-10', 'pointer-events-none');
    stopBtn.classList.remove('opacity-30');
};

stopBtn.onclick = () => {
    isPlaying = false;
    if (voiceProfileEngine) {
        voiceProfileEngine.stop();
    }
    statusDot.className = 'w-1.5 h-1.5 rounded-full bg-red-600';
    statusText.innerText = 'Standby';
    statusText.classList.replace('opacity-100', 'opacity-20');
    statusText.classList.remove('text-cyan-400');
    playBtn.classList.remove('opacity-10', 'pointer-events-none');
    stopBtn.classList.add('opacity-30');
};

function getModulation(i, time) {
    if (!isPlaying) return 4;
    const centerFactor = 1 - (Math.abs(i - barCount / 2) / (barCount / 2));
    const mode = modes[currentModeIndex].id;
    let val = 0;

    switch (mode) {
        case 'vocal':
            val = (40 + Math.sin(time * 8 + i * 0.2) * 30 + (Math.random() * 40));
            if (Math.random() > 0.95) val += Math.random() * 250;
            return val * centerFactor;
        case 'stutter':
            val = (Math.random() > 0.85) ? Math.random() * 250 : 8;
            return val * (centerFactor + 0.1);
        case 'ghost':
            val = 60 + Math.sin(time * 4 + i * 0.1) * 60;
            return val * centerFactor;
        case 'overdrive':
            val = 180 + Math.sin(time * 25 + i) * 120 + (Math.random() * 60);
            return Math.min(450, val * centerFactor);
        case 'minimal':
            return 8 + (Math.random() > 0.995 ? 120 : 0);
        case 'seismic':
            val = 20 + Math.pow(Math.sin(time * 4 + i * 0.05), 6) * 300;
            return val * centerFactor;
        case 'glitch':
            if (Math.random() > 0.92) return Math.random() * height * 0.5;
            return 4 + (Math.random() * 15);
        case 'harmonic':
            val = 100 * Math.sin(time * 6) * Math.cos(i * 0.15) + 120;
            return val * centerFactor;
        case 'binary':
            return (Math.sin(time * 12 + i * 0.4) > 0.4) ? 180 * centerFactor : 4;
        case 'chaos':
            return Math.random() * 350 * centerFactor;
        case 'spark':
            return (Math.random() > 0.9) ? Math.random() * 300 : 2;
        case 'tide':
            val = 150 + Math.sin(time * 1.5 + i * 0.05) * 140;
            return val * centerFactor;
        case 'echo':
            val = 40 + (Math.sin(time * 5) > 0.8 ? 200 : 0);
            return val * centerFactor;
        case 'pulse':
            val = 20 + Math.pow(Math.sin(time * Math.PI), 10) * 300;
            return val * centerFactor;
        case 'razor':
            val = (i % 4 === 0) ? Math.random() * 400 : 2;
            return val * centerFactor;
        case 'nebula':
            val = 50 + Math.sin(time + i * 0.1) * 30 + Math.cos(time * 0.5 + i * 0.2) * 50;
            return val * centerFactor;
        case 'crush':
            val = Math.floor(Math.random() * 5) * 60;
            return val * centerFactor;
        case 'velocity':
            val = 100 + Math.sin(time * 15 - i * 0.5) * 80;
            return val * centerFactor;
        case 'static':
            return (Math.random() * 100 + 50) * centerFactor;
        case 'zenith':
            val = height * 0.3 * (0.8 + Math.random() * 0.2);
            return val * centerFactor;
        default:
            return 4;
    }
}

function updatePhysics() {
    const time = Date.now() * 0.001;
    const mode = modes[currentModeIndex].id;

    if ((mode === 'voice_profile' || (liveSignalToggle && liveSignalToggle.isActive())) && voiceProfileEngine) {
        const heights = voiceProfileEngine.update(time, isPlaying);
        bars.forEach((bar, i) => {
            bar.targetH = Math.max(4, heights[i] || 4);
            const diff = bar.targetH - bar.h;
            const tension = 0.35;
            const friction = 0.75;
            bar.v += diff * tension;
            bar.v *= friction;
            bar.h += bar.v;
        });
        return;
    }

    bars.forEach((bar, i) => {
        bar.targetH = Math.max(4, getModulation(i, time));
        let tension = 0.5;
        let friction = 0.55;

        if (mode === 'ghost' || mode === 'nebula' || mode === 'tide') {
            tension = 0.08;
            friction = 0.9;
        }

        if (mode === 'stutter' || mode === 'glitch' || mode === 'spark' || mode === 'razor') {
            tension = 0.9;
            friction = 0.35;
        }

        const diff = bar.targetH - bar.h;
        bar.v += diff * tension;
        bar.v *= friction;
        bar.h += bar.v;
    });
}

function draw() {
    ctx.clearRect(0, 0, width, height);
    const centerX = width / 2;
    const centerY = height / 2;
    const barW = 2;
    const gap = 6;
    const totalW = (barW + gap) * barCount;

    ctx.translate(centerX - totalW / 2, centerY);
    bars.forEach((bar, i) => {
        const x = i * (barW + gap);
        const h = bar.h;
        const alpha = isPlaying ? 0.2 + (h / 450) : 0.08;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillRect(x, -h / 2, barW, h);
        if (isPlaying && h > 180) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.fillRect(x, -h / 2, barW, h);
        }
    });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function animate() {
    updatePhysics();
    draw();
    requestAnimationFrame(animate);
}

init();
