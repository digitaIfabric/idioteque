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

const modulate = (x, rate, amount) => {
  return el.add(x, el.mul(amount, el.cycle(rate)));
}

core.on('load', () => {
  // TEMPO
  let gate = el.train(276/60);
  let gateChords = el.train(0.11475);
  let gateKick = el.train(552/60);

  // DRUM SEQUENCE
  let shakerSeq =    el.seq({seq: [0, 1, 0, 1, 0, 1, 0, 1]}, gate);
  let hClosedSeq =   el.seq({seq: [0, 0, 1, 0, 0, 0, 1, 0]}, gate);
  let snareSeq =     el.seq({seq: [0, 0, 1, 0, 0, 0, 1, 0]}, gate);
  let kickSeq =      el.seq({seq: [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0 ,0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0], hold: true}, gateKick);

  // DRUM SOUNDS
  let shaker = ds.hat(164.8138, 5274.041, 0.005, modulate(0.5, 4, 0.47), shakerSeq);
  let hat = ds.hat(329.6276, 5274.041, 0.005, modulate(0.5, 4, 0.47), hClosedSeq);
  let snare = ds.clap(1318.510, 0.005, 0.204, snareSeq);
  let kick = ds.kick(38.89087, 0.075, modulate(0.255, 1, 0.200), 0.7, 5, kickSeq);

  // OUTPUT GAIN
  let outDrums = el.add(
    el.mul(0.5, shaker),
    el.mul(0.1, hat),
    el.mul(0.8, snare),
    el.mul(0.5, kick),
  )
  let outChords = el.mul(0.5, el.sample({path: chords}, gateChords));

  // RENDER
  core.render(
    el.add(
      outChords,        
      el.mul(0.5, outDrums)
    ),
    el.add(
      outChords,
      el.mul(0.5, outDrums)
    )
  );
});