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

    function createWordPattern() {
        const syllableCount = Math.floor(4 + Math.random() * 6);
        const pattern = [];
        for (let i = 0; i < syllableCount; i += 1) {
            pattern.push(0.35 + Math.random() * 0.65);
        }
        const duration = lerp(0.7, 1.8, Math.random());
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

        let lastWord = createWordPattern();
        let lastWordStart = 0;
        let lastSignalTime = 0;

        const shapes = {
            low: (x) => gaussian(x, 0.22, 0.18),
            mid: (x) => gaussian(x, 0.5, 0.2),
            high: (x) => gaussian(x, 0.78, 0.18),
        };

        async function start() {
            if (audioContext && audioContext.state === 'suspended') {
                await audioContext.resume();
                return;
            }
            if (audioContext) return;

            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                return;
            }

            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                    },
                });

                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                analyser = audioContext.createAnalyser();
                analyser.fftSize = 1024;
                analyser.smoothingTimeConstant = 0.75;

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
            }
        }

        function stop() {
            if (audioContext && audioContext.state !== 'closed') {
                audioContext.close();
            }
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
            }
            audioContext = null;
            analyser = null;
            source = null;
            stream = null;
            freqData = null;
            timeData = null;
            prevFreqData = null;
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

            if (useSynthetic && time - lastWordStart > lastWord.duration) {
                lastWord = createWordPattern();
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

            const vowelWeight = clamp((low + mid) * 1.2, 0, 1);
            const fricativeWeight = clamp(high * 1.6, 0, 1);
            const plosiveWeight = clamp(flux * 3.5, 0, 1);
            const nasalWeight = clamp(low * (1 - high) * 1.4, 0, 1);

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
