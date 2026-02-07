(function () {
    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function gaussian(x, center, width) {
        const d = (x - center) / width;
        return Math.exp(-0.5 * d * d);
    }

    const wordLibrary = [
        { text: 'hello', profile: { low: 0.5, mid: 0.7, high: 0.2, pace: 0.95, crisp: 0.3, punch: 0.25 } },
        { text: 'welcome', profile: { low: 0.6, mid: 0.75, high: 0.25, pace: 0.85, crisp: 0.25, punch: 0.2 } },
        { text: 'vision', profile: { low: 0.35, mid: 0.65, high: 0.45, pace: 0.9, crisp: 0.45, punch: 0.2 } },
        { text: 'future', profile: { low: 0.4, mid: 0.7, high: 0.35, pace: 0.95, crisp: 0.4, punch: 0.25 } },
        { text: 'signal', profile: { low: 0.45, mid: 0.7, high: 0.35, pace: 0.9, crisp: 0.45, punch: 0.35 } },
        { text: 'flow', profile: { low: 0.75, mid: 0.55, high: 0.15, pace: 0.8, crisp: 0.15, punch: 0.2 } },
        { text: 'pulse', profile: { low: 0.65, mid: 0.6, high: 0.2, pace: 1.05, crisp: 0.25, punch: 0.5 } },
        { text: 'motion', profile: { low: 0.5, mid: 0.8, high: 0.25, pace: 0.95, crisp: 0.3, punch: 0.25 } },
        { text: 'gravity', profile: { low: 0.8, mid: 0.55, high: 0.15, pace: 0.75, crisp: 0.2, punch: 0.35 } },
        { text: 'ignite', profile: { low: 0.3, mid: 0.65, high: 0.6, pace: 1.05, crisp: 0.6, punch: 0.4 } },
        { text: 'digital', profile: { low: 0.45, mid: 0.75, high: 0.35, pace: 0.9, crisp: 0.45, punch: 0.25 } },
        { text: 'kinetic', profile: { low: 0.35, mid: 0.7, high: 0.55, pace: 1.0, crisp: 0.55, punch: 0.3 } },
        { text: 'ocean', profile: { low: 0.8, mid: 0.55, high: 0.1, pace: 0.7, crisp: 0.1, punch: 0.2 } },
        { text: 'stream', profile: { low: 0.55, mid: 0.7, high: 0.25, pace: 0.9, crisp: 0.3, punch: 0.2 } },
        { text: 'ignite', profile: { low: 0.3, mid: 0.65, high: 0.6, pace: 1.1, crisp: 0.65, punch: 0.4 } },
        { text: 'arc', profile: { low: 0.4, mid: 0.55, high: 0.5, pace: 1.2, crisp: 0.7, punch: 0.5 } },
        { text: 'shadow', profile: { low: 0.7, mid: 0.6, high: 0.2, pace: 0.85, crisp: 0.2, punch: 0.25 } },
        { text: 'light', profile: { low: 0.35, mid: 0.65, high: 0.55, pace: 1.0, crisp: 0.55, punch: 0.3 } },
        { text: 'echo', profile: { low: 0.5, mid: 0.6, high: 0.3, pace: 0.9, crisp: 0.3, punch: 0.2 } },
        { text: 'spectrum', profile: { low: 0.45, mid: 0.7, high: 0.4, pace: 0.85, crisp: 0.4, punch: 0.25 } },
    ];

    function createWordPattern(word) {
        const vowels = word.text.match(/[aeiouy]/gi);
        const baseSyllables = vowels ? vowels.length : Math.max(1, Math.floor(word.text.length / 3));
        const syllableCount = clamp(baseSyllables + (Math.random() > 0.7 ? 1 : 0), 1, 6);
        const pattern = [];
        for (let i = 0; i < syllableCount; i += 1) {
            const emphasis = 0.35 + Math.random() * 0.65;
            pattern.push(emphasis);
        }
        const duration = lerp(0.7, 1.6, clamp(word.profile.pace, 0.6, 1.3) - 0.6);
        return { pattern, duration };
    }

    function createVoiceProfileEngine(options) {
        const barCount = options.barCount;
        const getHeight = options.getHeight;

        let audioContext = null;
        let analyser = null;
        let source = null;
        let stream = null;
        let freqData = null;
        let timeData = null;
        let prevFreqData = null;
        let micEnabled = false;

        let wordIndex = Math.floor(Math.random() * wordLibrary.length);
        let lastWord = {
            meta: wordLibrary[wordIndex],
            ...createWordPattern(wordLibrary[wordIndex]),
        };
        let lastWordStart = 0;
        let lastSignalTime = 0;

        const shapes = {
            low: (x) => gaussian(x, 0.22, 0.18),
            mid: (x) => gaussian(x, 0.5, 0.2),
            high: (x) => gaussian(x, 0.78, 0.18),
        };

        async function start() {
            if (audioContext) {
                if (audioContext.state === 'suspended') {
                    await audioContext.resume();
                }
                return;
            }

            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                return;
            }

            try {
                if (!micEnabled) {
                    stream = await navigator.mediaDevices.getUserMedia({
                        audio: {
                            echoCancellation: true,
                            noiseSuppression: true,
                            autoGainControl: true,
                        },
                    });
                    micEnabled = true;
                }

                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                analyser = audioContext.createAnalyser();
                analyser.fftSize = 1024;
                analyser.smoothingTimeConstant = 0.75;

                if (!stream) {
                    return;
                }
                source = audioContext.createMediaStreamSource(stream);
                source.connect(analyser);

                freqData = new Uint8Array(analyser.frequencyBinCount);
                timeData = new Uint8Array(analyser.fftSize);
                prevFreqData = new Uint8Array(analyser.frequencyBinCount);
            } catch (err) {
                audioContext = null;
                analyser = null;
                source = null;
                stream = null;
                micEnabled = false;
            }
        }

        function stop() {
            if (audioContext && audioContext.state === 'running') {
                audioContext.suspend();
            }
        }

        function getBandEnergy(freqStart, freqEnd, binHz) {
            if (!freqData) return 0;
            const startIndex = Math.floor(freqStart / binHz);
            const endIndex = Math.min(freqData.length - 1, Math.floor(freqEnd / binHz));
            let total = 0;
            for (let i = startIndex; i <= endIndex; i += 1) {
                total += freqData[i];
            }
            const count = Math.max(1, endIndex - startIndex + 1);
            return total / (count * 255);
        }

        function getRms() {
            if (!timeData) return 0;
            let sum = 0;
            for (let i = 0; i < timeData.length; i += 1) {
                const v = (timeData[i] - 128) / 128;
                sum += v * v;
            }
            return Math.sqrt(sum / timeData.length);
        }

        function getSpectralFlux() {
            if (!freqData || !prevFreqData) return 0;
            let flux = 0;
            for (let i = 0; i < freqData.length; i += 1) {
                const diff = freqData[i] - prevFreqData[i];
                if (diff > 0) flux += diff;
                prevFreqData[i] = freqData[i];
            }
            return flux / (freqData.length * 255);
        }

        function update(time, isPlaying) {
            const heights = new Array(barCount).fill(4);
            if (!isPlaying) return heights;

            let low = 0.12;
            let mid = 0.08;
            let high = 0.06;
            let rms = 0;
            let flux = 0;
            let signalActive = false;

            if (analyser) {
                analyser.getByteFrequencyData(freqData);
                analyser.getByteTimeDomainData(timeData);

                const binHz = (audioContext.sampleRate / 2) / analyser.frequencyBinCount;
                low = getBandEnergy(80, 240, binHz);
                mid = getBandEnergy(240, 2200, binHz);
                high = getBandEnergy(2200, 8000, binHz);
                rms = getRms();
                flux = getSpectralFlux();

                const energy = (low + mid + high) / 3;
                signalActive = energy > 0.05 || rms > 0.03;
                if (signalActive) lastSignalTime = time;
            }

            const timeSinceSignal = time - lastSignalTime;
            const useSynthetic = !signalActive || timeSinceSignal > 0.4;

            if (time - lastWordStart > lastWord.duration) {
                wordIndex = (wordIndex + 1) % wordLibrary.length;
                lastWord = {
                    meta: wordLibrary[wordIndex],
                    ...createWordPattern(wordLibrary[wordIndex]),
                };
                lastWordStart = time;
            }

            const wordElapsed = time - lastWordStart;
            const wordProgress = clamp(wordElapsed / lastWord.duration, 0, 1);
            const syllablePos = wordProgress * lastWord.pattern.length;
            const syllableIndex = Math.min(lastWord.pattern.length - 1, Math.floor(syllablePos));
            const syllablePhase = syllablePos - syllableIndex;
            const syllableShape = Math.sin(Math.PI * syllablePhase);
            const syntheticEnvelope = lastWord.pattern[syllableIndex] * syllableShape;

            const speechEnvelope = useSynthetic
                ? syntheticEnvelope
                : clamp(rms * 4.5, 0, 1) * lerp(0.6, 1.15, clamp(flux * 3, 0, 1));

            const profile = lastWord.meta.profile;
            const vowelBias = lerp(0.6, 1.4, profile.low);
            const midBias = lerp(0.6, 1.4, profile.mid);
            const highBias = lerp(0.6, 1.4, profile.high);
            const crispBias = lerp(0.6, 1.6, profile.crisp);
            const punchBias = lerp(0.6, 1.6, profile.punch);

            const vowelWeight = clamp((low * vowelBias + mid * midBias) * 1.2, 0, 1);
            const fricativeWeight = clamp(high * 1.6 * highBias * crispBias, 0, 1);
            const plosiveWeight = clamp(flux * 3.5 * punchBias, 0, 1);
            const nasalWeight = clamp(low * (1 - high) * 1.4 * vowelBias, 0, 1);

            const totalWeight = vowelWeight + fricativeWeight + plosiveWeight + nasalWeight + 0.001;

            const lowEnergy = (vowelWeight * 0.9 + plosiveWeight * 0.7 + nasalWeight) / totalWeight;
            const midEnergy = (vowelWeight + plosiveWeight * 0.6 + fricativeWeight * 0.5) / totalWeight;
            const highEnergy = (fricativeWeight + plosiveWeight * 0.5) / totalWeight;

            const maxHeight = getHeight() * 0.42;
            const baseHeight = 4;

            for (let i = 0; i < barCount; i += 1) {
                const x = i / (barCount - 1);
                const lowShape = shapes.low(x) * lowEnergy;
                const midShape = shapes.mid(x) * midEnergy;
                const highShape = shapes.high(x) * highEnergy;
                const band = lowShape + midShape + highShape;
                const spread = band / (lowEnergy + midEnergy + highEnergy + 0.001);

                const motion = lerp(0.6, 1.25, clamp((low + mid + high) * 1.2, 0, 1));
                const height = baseHeight + (spread * speechEnvelope * motion * maxHeight);
                const jitter = (Math.random() - 0.5) * 6 * (speechEnvelope * 0.6);

                heights[i] = Math.max(baseHeight, height + jitter);
            }

            return heights;
        }

        return {
            start,
            stop,
            update,
        };
    }

    window.createVoiceProfileEngine = createVoiceProfileEngine;
})();
