import './style.css';

// DOM ELEMENTS
const bpmValue = document.getElementById('bpmValue');
const bpmSlider = document.getElementById('bpmSlider');
const sliderKnob = document.getElementById('sliderKnob');
const bpmMinus = document.getElementById('bpmMinus');
const bpmPlus = document.getElementById('bpmPlus');

const toggleBtn = document.getElementById('toggleBtn');

const beatsValue = document.getElementById('beatsValue');
const beatsMinus = document.getElementById('beatsMinus');
const beatsPlus = document.getElementById('beatsPlus');

const metronomeCard = document.getElementById('metronomeCard');

// CONSTANTS AND STATE
const MIN_BPM = 40;
const MAX_BPM = 300;

let bpm = 120;
let beatsPerMeasure = 4;

let audioCtx = null;
let isRunning = false;

// timing state
let nextBeatTime = 0;
let currentBeat = 0;

// scheduler settings
const lookahead = 25;          // ms (JS wakeup rate)
const scheduleAheadTime = 0.15; // sec (audio buffer)
let schedulerTimer = null;

// storage key
const STORAGE_KEY = 'metronomeSettings';

// SAVE SETTINGS FUNCTION
function saveSettings() {
    const settings = {
        bpm,
        beatsPerMeasure
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

// TIMER HELPER
function secondsPerBeat() {
    return 60 / bpm;
}

// AUDIO
function scheduleClick(time) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    const isAccent = currentBeat === 0;

    osc.frequency.value = isAccent ? 1600 : 1000;
    gain.gain.value = isAccent ? 0.35 : 0.2;

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(time);
    osc.stop(time + 0.05);

    // VISUAL FEEDBACK
    if (isAccent) {
        setTimeout(() => {
            metronomeCard.classList.remove('accent-glow');
            void metronomeCard.offsetWidth;
            metronomeCard.classList.add('accent-glow');
        }, (time - audioCtx.currentTime) * 1000);
    }

    currentBeat = (currentBeat + 1) % beatsPerMeasure;
}

// SCHEDULER
function scheduler() {
    const now = audioCtx.currentTime;

    while (nextBeatTime < now + scheduleAheadTime) {
        scheduleClick(nextBeatTime);
        nextBeatTime += secondsPerBeat();
    }
}

// METRONOME CONTROL
async function startMetronome() {
    if (!audioCtx) audioCtx = new AudioContext();

    if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
    }

    nextBeatTime = audioCtx.currentTime + 0.1;
    currentBeat = 0;

    schedulerTimer = setInterval(scheduler, lookahead);
    isRunning = true;

    toggleBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M6 4h4v16H6zm8 0h4v16h-4z"/>
    </svg>`;
}

function stopMetronome() {
    if (!isRunning) return;

    clearInterval(schedulerTimer);
    schedulerTimer = null;

    isRunning = false;
    currentBeat = 0;

    toggleBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z" />
    </svg>`;
}

// TOGGLE BUTTON
toggleBtn.addEventListener('click', () => {
    isRunning ? stopMetronome() : startMetronome();
});

// BPM CONTROL
function setBpm(newBpm) {
    bpm = Math.max(MIN_BPM, Math.min(MAX_BPM, newBpm));
    bpmValue.textContent = bpm;

    const percent = (bpm - MIN_BPM) / (MAX_BPM - MIN_BPM);
    sliderKnob.style.left = `${percent * 100}%`;

    // if (isRunning) {
    //     nextBeatTime = audioCtx.currentTime + secondsPerBeat();
    // }

    saveSettings();
}

bpmMinus.addEventListener('click', () => setBpm(bpm - 1));
bpmPlus.addEventListener('click', () => setBpm(bpm + 1));

bpmSlider.addEventListener('click', (e) => {
    const rect = bpmSlider.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    setBpm(Math.round(MIN_BPM + percent * (MAX_BPM - MIN_BPM)));
});
bpmSlider.addEventListener('wheel', (e) => {
    e.preventDefault();

    const direction = Math.sign(e.deltaY);
    const step = e.shiftKey ? 5 : 1;

    setBpm(bpm - direction * step);
}, { passive: false });

// BEATS PER MEASURE CONTROL
function setBeatsPerMeasure(value) {
    beatsPerMeasure = Math.max(1, Math.min(12, value));
    beatsValue.textContent = beatsPerMeasure;

    currentBeat = 0;

    saveSettings();
}

beatsMinus.addEventListener('click', () =>
    setBeatsPerMeasure(beatsPerMeasure - 1)
);
beatsPlus.addEventListener('click', () =>
    setBeatsPerMeasure(beatsPerMeasure + 1)
);

// KEYBOARD SHORTCUTS
document.addEventListener('keydown', (e) => {

    // Prevent scrolling for these keys
    if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)
    ) {
        e.preventDefault();
    }

    const bpmStep = e.shiftKey ? 5 : 1;

    switch (e.key) {
        case 'ArrowUp':
            setBpm(bpm + bpmStep);
            break;

        case 'ArrowDown':
            setBpm(bpm - bpmStep);
            break;

        case 'ArrowRight':
            setBeatsPerMeasure(beatsPerMeasure + 1);
            break;

        case 'ArrowLeft':
            setBeatsPerMeasure(beatsPerMeasure - 1);
            break;

        case ' ':
        case 'Spacebar':
            isRunning ? stopMetronome() : startMetronome();
            break;
    }
});

// LOAD SETTINGS
function loadSettings() {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return;

    try {
        const settings = JSON.parse(saved);

        if (settings.bpm) bpm = settings.bpm;
        if (settings.beatsPerMeasure) beatsPerMeasure = settings.beatsPerMeasure;
    } catch (err) {
        console.error('Failed to load settings', err);
    }
}

// INITIALIZATION
loadSettings();
setBpm(bpm);
setBeatsPerMeasure(beatsPerMeasure);