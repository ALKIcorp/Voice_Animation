(function () {
    function createLiveSignalToggle(options) {
        const liveToggle = options.liveToggle;
        const modes = options.modes;
        const getIsPlaying = options.getIsPlaying;
        const setIsPlaying = options.setIsPlaying;
        const getCurrentModeIndex = options.getCurrentModeIndex;
        const setCurrentModeIndex = options.setCurrentModeIndex;
        const updateModeDisplay = options.updateModeDisplay;
        const getVoiceProfileEngine = options.getVoiceProfileEngine;
        const setStatusLive = options.setStatusLive;

        let liveRecordingActive = false;
        let previousModeIndex = 0;

        async function enableLive() {
            liveRecordingActive = true;
            previousModeIndex = getCurrentModeIndex();
            let liveIndex = modes.findIndex((mode) => mode.id === 'voice_profile');
            if (liveIndex < 0) liveIndex = 0;
            setCurrentModeIndex(liveIndex);

            if (!getIsPlaying()) {
                setIsPlaying(true);
                setStatusLive(true);
            }

            const engine = getVoiceProfileEngine();
            if (engine) {
                await engine.start();
            }

            liveToggle.innerText = 'On';
            liveToggle.classList.add('text-cyan-400');
            updateModeDisplay();
        }

        function disableLive() {
            liveRecordingActive = false;
            setCurrentModeIndex(previousModeIndex);

            const engine = getVoiceProfileEngine();
            if (engine) {
                engine.stop();
            }

            liveToggle.innerText = 'Off';
            liveToggle.classList.remove('text-cyan-400');
            updateModeDisplay();
        }

        async function toggle() {
            if (liveRecordingActive) {
                disableLive();
            } else {
                await enableLive();
            }
        }

        if (liveToggle) {
            liveToggle.addEventListener('click', toggle);
        }

        return {
            isActive: () => liveRecordingActive,
            disable: disableLive,
        };
    }

    window.createLiveSignalToggle = createLiveSignalToggle;
})();
