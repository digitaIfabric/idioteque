//                                                 _          _       __  _        _ _ _ __  _  ____
//                                            ___ (_)__ _  __| |_ __ |_ \| |_ __ _| (_) '_ \(_)/ _  |
//                                           |__ \| |__` |/ _` | '_ \ _| | | '_ \__ | | |_) | | | | |
//                                            __) | |  | | (_| | |_) |_  | | |_) || | | .__/| | |_| |
// Idioteque                                 |___/|_|  |_|\__,_|_.__/  |_|_|_.__/__/|_|\___||_|\____|
const core = require('elementary-core');
const el = require('@nick-thompson/elementary');
const ds = require('@nick-thompson/drumsynth');

// ds.kick(props, pitch, click, attack, decay, drive, gate)
// @param {Object} [props] – Optional
// @param {core.Node|number} pitch - The base frequency of the kick drum in Hz
// @param {core.Node|number} click - The speed of the pitch envelope, tuned for [0.005s, 1s]
// @param {core.Node|number} attack - Attack time in seconds, tuned for [0.005s, 0.4s]
// @param {core.Node|number} decay - Decay time in seconds, tuned for [0.005s, 4.0s]
// @param {core.Node|number} drive - A gain multiplier going into the saturator. Tuned for [1, 10]
// @param {core.Node|number} gate - The pulse train which triggers the amp envelope
// @returns {core.Node}
// ds.clap(props, tone, attack, decay, gate)
// @param {Object} [props] – Optional
// @param {core.Node|number} tone - Bandpass filter cutoff frequency, tuned for [400Hz, 3500Hz]
// @param {core.Node|number} attack - Attack time in seconds, tuned for [0s, 0.2s]
// @param {core.Node|number} decay - Decay time in seconds, tuned for [0s, 4.0s]
// @param {core.Node|number} gate - The pulse train which triggers the amp envelope
// @returns {core.Node}
// ds.hat(props, pitch, tone, attack, decay, gate)
// @param {Object} [props] – Optional
// @param {core.Node|number} pitch - Base frequency in the range [317Hz, 3170Hz]
// @param {core.Node|number} tone - Bandpass filter cutoff frequency, tuned for [800Hz, 18kHz]
// @param {core.Node|number} attack - Attack time in seconds, tuned for [0.005s, 0.2s]
// @param {core.Node|number} decay - Decay time in seconds, tuned for [0.005s, 4.0s]
// @param {core.Node|number} gate - The pulse train which triggers the amp envelope
// @returns {core.Node}

const chords = 'idioteque.wav';
const introFX = 'introFX.aif';
const drumRoom = 'DrumRoom.aif';
const niceDrumRoom = 'NiceDrumRoom.wav';
const largeRoom = 'BigDenseStudio.aif';


const modulate = (x, rate, amount) => {
  return el.add(x, el.mul(amount, el.cycle(rate)));
}

core.on('load', () => {
  // TEMPO
  let gate = el.train(276/60);
  let gateChords = el.train(0.11475);
  let gateIntro = el.train(0.0500);
  let gateKick = el.train(552/60);

  // DRUM SEQUENCE
  let shakerSeq =    el.seq({seq: [0, 1, 0, 1, 0, 1, 0, 1]}, gate);
  let hClosedSeq =   el.seq({seq: [0, 0, 1, 0, 0, 0, 1, 0]}, gate);
  let snareSeq =     el.seq({seq: [0, 0, 1, 0, 0, 0, 1, 0]}, gate);
  let kickSeq =      el.seq({seq: [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0 ,0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0], hold: true}, gateKick);

  // DRUM SOUNDS
  let shaker = ds.hat(195.9977, 6271.927, 0.005, modulate(0.5, 4, 0.47), shakerSeq);
  let hat = ds.hat(391.9954, 6271.927, 0.005, modulate(0.5, 4, 0.47), hClosedSeq);
  let snare = ds.clap(783.9909, 0.005, 0.40, snareSeq);
  let snareA7 = ds.clap(3520.000, 0.005, 0.40, snareSeq);
  let delayedSnare = el.delay({size: 44100}, el.ms2samps(50), 0.525, snare);
  let reverbSnare = el.convolve({path: drumRoom}, delayedSnare);
  let reverbSnare2 = el.convolve({path: niceDrumRoom}, reverbSnare);
  let reverbSnare3 = el.convolve({path: largeRoom}, reverbSnare2);
  let snareWD = el.add(snare, reverbSnare3);
  let delayedSnareA7 = el.delay({size: 44100}, el.ms2samps(50), 0.525, snareA7);
  let reverbSnareA7 = el.convolve({path: drumRoom}, delayedSnareA7);
  let reverbSnare2A7 = el.convolve({path: niceDrumRoom}, reverbSnareA7);
  let reverbSnare3A7 = el.convolve({path: largeRoom}, reverbSnare2A7);
  let snareA7WD = el.add(snareA7, reverbSnare3A7);
  let kick = ds.kick(48.99943, 0.15, modulate(0.255, 1, 0.200), 0.25, 5, kickSeq);
  let highPassKick = el.highpass(48.99943, 0.5, kick);

  // OUTPUT GAIN
  let outDrums = el.add(
    el.mul(0.3, shaker),
    el.mul(0.2, hat), 
    el.mul(0.3, snareWD),
    el.mul(0.3, snareA7WD),
    el.mul(0.4, highPassKick),
  )
  let outChordsL = el.mul(0.5, el.sample({path: chords, channel: 0}, gateChords));
  let outChordsR = el.mul(0.5, el.sample({path: chords, channel: 1}, gateChords));
  let introL = el.mul(0.9, el.sample({path: introFX, channel: 0}, gateIntro));
  let introR = el.mul(0.9, el.sample({path: introFX, channel: 1}, gateIntro));
  let output = el.add(
    outChordsL, 
    outChordsR, 
    // introL,
    // introR,  
    el.mul(0.9, outDrums)
  );

  // RENDER
  core.render(
    output,
    output
  );
});
