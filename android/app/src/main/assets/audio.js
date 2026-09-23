(() => {
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  }

  function playSound(type, muted = false) {
    if (muted) return;
    initAudio();
    if (!audioCtx) return;

    const now = audioCtx.currentTime;
    try {
      if (type === 'flap') {
        playTone(360, 740, 0.1, 0.25, 0.12, 'triangle');
      } else if (type === 'score') {
        playSequence([659.25, 880], 0.08, 0.2, 0.28, 'sine');
      } else if (type === 'hit') {
        playTone(140, 30, 0.15, 0.35, 0.18, 'square');
      } else if (type === 'die') {
        playTone(450, 80, 0.35, 0.25, 0.38, 'sawtooth');
      } else if (type === 'swoosh') {
        playTone(220, 440, 0.1, 0.15, 0.1, 'sine');
      } else if (type === 'coin') {
        playSequence([987.77, 1318.51], 0.08, 0.22, 0.28, 'sine');
      } else if (type === 'buy') {
        playSequence([523.25, 659.25, 783.99, 1046.5], 0.05, 0.18, 0.25, 'triangle');
      } else if (type === 'error') {
        playTone(130, 80, 0.09, 0.2, 0.2, 'sawtooth');
      }
    } catch (e) {
      // Audio is optional and can fail in restricted browser contexts.
    }

    function playTone(startFrequency, endFrequency, rampTime, volume, duration, oscillatorType) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = oscillatorType;
      osc.frequency.setValueAtTime(startFrequency, now);
      osc.frequency.exponentialRampToValueAtTime(endFrequency, now + rampTime);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + duration);
    }

    function playSequence(frequencies, interval, volume, duration, oscillatorType) {
      frequencies.forEach((frequency, index) => {
        const start = now + index * interval;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = oscillatorType;
        osc.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(volume, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(start);
        osc.stop(start + duration);
      });
    }
  }

  window.FlyingBirdAudio = Object.freeze({ initAudio, playSound });
})();
