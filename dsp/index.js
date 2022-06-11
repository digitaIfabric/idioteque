//                                                 _          _       __  _        _ _ _ __  _  ____
//                                            ___ (_)__ _  __| |_ __ |_ \| |_ __ _| (_) '_ \(_)/ _  |
//                                           |__ \| |__` |/ _` | '_ \ _| | | '_ \__ | | |_) | | | | |
//                                            __) | |  | | (_| | |_) |_  | | |_) || | | .__/| | |_| |
// Idioteque                                 |___/|_|  |_|\__,_|_.__/  |_|_|_.__/__/|_|\___||_|\____|
import { ElementaryNodeRenderer as core, el } from '@nick-thompson/elementary';
import { Note, Scale } from '@tonaljs/tonal';

let TEMPO = 138;
let KEY = 'Eb';
let SCALE = KEY + ' major';
let muteSwitch = 0;
let timeSwitch = 1;

// SAMPLES
const chords = './samples/idioteque.wav';
const vocals = './samples/chorus-vocals.wav';
const intro = './samples/intro.wav';

/** A quick helper for a sine wave oscillator with a phase offset. */
function cycle(freq, phaseOffset) {
  let t = el.add(el.phasor(freq), phaseOffset);
  let p = el.sub(t, el.floor(t));

  return el.sin(el.mul(2 * Math.PI, p));
}

/**
 * Hi hat drum synthesis via phase modulation.
 *
 * Here we have a carrier sine wave modulated by another sine wave, which is in turn
 * modulated by white noise. The carrier frequency is tuned for a value between 317Hz
 * and 3170Hz, borrowing slightly from the tuning of the DR110. The first modulator runs
 * at exactly twice the frequency of the carrier to introduce square-like harmonics.
 *
 * @param {core.Node|number} pitch - Base frequency in the range [317Hz, 3170Hz]
 * @param {core.Node|number} tone - Bandpass filter cutoff frequency, tuned for [800Hz, 18kHz]
 * @param {core.Node|number} attack - Attack time in seconds, tuned for [0.005s, 0.2s]
 * @param {core.Node|number} decay - Decay time in seconds, tuned for [0.005s, 4.0s]
 * @param {core.Node|number} gate - The pulse train which triggers the amp envelope
 * @returns {core.Node}
 */
function hat(pitch, tone, attack, decay, gate) {
  // Synthesis
  let m2 = el.noise();
  let m1 = cycle(el.mul(2, pitch), el.mul(2, m2));
  let m0 = cycle(pitch, el.mul(2, m1));

  // Then we run the result through a bandpass filter set according to tone
  // between 800Hz and 18kHz.
  let f = el.bandpass(tone, 1.214, m0);

  // Finally we have the amp envelope with an attack in [5ms, 200ms] and a
  // decay in [5ms, 4000ms]
  let env = el.adsr(attack, decay, 0.0, 0.1, gate);

  return el.mul(f, env);
}

/*
* Kick drum synthesis via a pitched sine sweep
*
* @param {core.Node|number} pitch - The base frequency of the kick drum in Hz
* @param {core.Node|number} click - The speed of the pitch envelope, tuned for [0.005s, 1s]
* @param {core.Node|number} attack - Attack time in seconds, tuned for [0.005s, 0.4s]
* @param {core.Node|number} decay - Decay time in seconds, tuned for [0.005s, 4.0s]
* @param {core.Node|number} drive - A gain multiplier going into the saturator. Tuned for [1, 10]
* @param {core.Node|number} gate - The pulse train which triggers the amp envelope
* @returns {core.Node}
*/
function kick(pitch, click, attack, decay, drive, gate) {
  // First up we have our amp envelope
  let env = el.adsr(attack, decay, 0.0, 0.1, gate);

  // Then we have a pitch envelope with 0 attack and decay in [5ms, 4s].
  // The `el.adsr` node uses exponential segments which is great for our purposes
  // here, but you could also weight the curve more or less aggressively by squaring
  // or taking the square root of the pitchenv signal.
  let pitchenv = el.adsr(0.005, click, 0.0, 0.1, gate);

  // Then our synthesis: a sine tone at our base pitch, whose frequency is quickly
  // modulated by the pitchenv to sweep from 5*pitch to 1*pitch over `click` seconds.
  // The resulting sound is multiplied straight through our amp envelope.
  let clean = el.mul(
    env,
    el.cycle(
      el.mul(
        // The pitch envelope runs from a multiplier of 5 to
        // a multiplier of 1 on the original pitch
        el.add(1, el.mul(4, pitchenv)),
        pitch,
      )
    )
  );

  // Then you can drive it into a soft clipper with a gain multiplier in [1, 10]
  return el.tanh(el.mul(clean, drive));
}

/**
 * Clap synthesis via filtered white noise.
 *
 * @param {core.Node|number} tone - Bandpass filter cutoff frequency, tuned for [400Hz, 3500Hz]
 * @param {core.Node|number} attack - Attack time in seconds, tuned for [0s, 0.2s]
 * @param {core.Node|number} decay - Decay time in seconds, tuned for [0s, 4.0s]
 * @param {core.Node|number} gate - The pulse train which triggers the amp envelope
 * @returns {core.Node}
 */
 function clap(tone, attack, decay, gate) {
  // Layered white noise synthesis
  let no = el.noise();

  let e1 = el.adsr(el.add(0.035, attack), el.add(0.06, decay), 0.0, 0.1, gate);
  let e2 = el.adsr(el.add(0.025, attack), el.add(0.05, decay), 0.0, 0.1, gate);
  let e3 = el.adsr(el.add(0.015, attack), el.add(0.04, decay), 0.0, 0.1, gate);
  let e4 = el.adsr(el.add(0.005, attack), el.add(0.02, decay), 0.0, 0.1, gate);

  // Then we run the result through a bandpass filter set according to tone
  // between 400Hz and 3500Hz, and slightly saturate.
  return el.tanh(
    el.bandpass(
      tone,
      1.214,
      el.add(
        el.mul(no, e1),
        el.mul(no, e2),
        el.mul(no, e3),
        el.mul(no, e4),
      ),
    )
  );
}

const modulate = (x, rate, amount) => {
  return el.add(x, el.mul(amount, el.cycle(rate)));
}

const CHORD_FREQS = [
              [
                Note.freq('G2'),
                Note.freq('D3'),
                Note.freq('Bb3'),
                Note.freq('Eb4')
              ],
              [ 
                Note.freq('Eb3'),
                Note.freq('Bb3'),
                Note.freq('D4'),
                Note.freq('G4')
              ],
              [
                Note.freq('D3'),
                Note.freq('G3'),
                Note.freq('Eb4'),
                Note.freq('Bb4')
              ],
              [
                Note.freq('Bb3'),
                Note.freq('Eb4'),
                Note.freq('G4'),
                Note.freq('D5')
              ]
            ];

function voice(fq) {
    return el.cycle(
        el.add(
            fq,
            el.mul(
                el.mul(el.add(2, el.cycle(0.1)), el.mul(fq, 0)),
                el.cycle(fq),
            ),
        ),
    );
}

function chord(voice) {
  return el.cycle(
      el.add(
          voice.freq
      ),
)   ;
}

let voices1 = [
  {gate: TEMPO/60*0.5, freq: CHORD_FREQS[0][0], key: 'v1'},
  {gate: TEMPO/60*0.5, freq: CHORD_FREQS[0][1], key: 'v2'},
  {gate: TEMPO/60*0.5, freq: CHORD_FREQS[0][2], key: 'v3'},
  {gate: TEMPO/60*0.5, freq: CHORD_FREQS[0][3], key: 'v4'},
];

let voices2 = [
  {gate: TEMPO/60*0.5, freq: CHORD_FREQS[1][0], key: 'v5'},
  {gate: TEMPO/60*0.5, freq: CHORD_FREQS[1][1], key: 'v6'},
  {gate: TEMPO/60*0.5, freq: CHORD_FREQS[1][2], key: 'v7'},
  {gate: TEMPO/60*0.5, freq: CHORD_FREQS[1][3], key: 'v8'},
];

let voices3 = [
  {gate: TEMPO/60*0.5, freq: CHORD_FREQS[2][0], key: 'v9'},
  {gate: TEMPO/60*0.5, freq: CHORD_FREQS[2][1], key: 'v10'},
  {gate: TEMPO/60*0.5, freq: CHORD_FREQS[2][2], key: 'v11'},
  {gate: TEMPO/60*0.5, freq: CHORD_FREQS[2][3], key: 'v12'},
];

let voices4 = [
  {gate: TEMPO/60*0.5, freq: CHORD_FREQS[3][0], key: 'v13'},
  {gate: TEMPO/60*0.5, freq: CHORD_FREQS[3][1], key: 'v14'},
  {gate: TEMPO/60*0.5, freq: CHORD_FREQS[3][2], key: 'v15'},
  {gate: TEMPO/60*0.5, freq: CHORD_FREQS[3][3], key: 'v16'},
];

let chI   = el.mul(0.25, el.add(voices1.map(chord)));
let chII  = el.mul(0.25, el.add(voices2.map(chord)));
let chIII = el.mul(0.25, el.add(voices3.map(chord)));
let chIV  = el.mul(0.25, el.add(voices4.map(chord)));

function render(){
  // GET RANDOM NOTES
  let KEY_NOTES = Scale.get(SCALE).notes;
  const KEY_NOTES_6 = KEY_NOTES.map(note => note + '6' );
  const KEY_NOTES_7 = KEY_NOTES.map(note => note + '7' );
  const KEY_NOTES_6_7 = [...KEY_NOTES_6, ...KEY_NOTES_6, ...KEY_NOTES_7, KEY_NOTES_7[0]];
  const FREQUENCIES = KEY_NOTES_6_7.map(note => Note.freq(note)); 
  const FREQ_SHUFFLE = FREQUENCIES
          .map(value => ({ value, sort: Math.random() }))
          .sort((a, b) => a.sort - b.sort)
          .map(({ value }) => value)

  // SET TEMPO
  let gateLoop = el.train(0);
  let gate = el.train(TEMPO*2/60);
  let gateKick = el.train(TEMPO*4/60);
  let gateChords = el.train(TEMPO/60 * 1/4);
  let T = timeSwitch ? 1 : 1/2;
  let gateArp = el.train(TEMPO/60 * T);
  
  // ARPEGGIO  
  let envArp = el.adsr(0.002, 0.005, 0.5, 1.5, gateArp);
  let left = el.mul(envArp, voice(el.seq({key: 'arp', seq: FREQ_SHUFFLE, hold: true}, gateArp)));
  let T2 = timeSwitch ? 9/10 : 8/10;
  let T3 = timeSwitch ? 3/4 : 3/4;
  let delayedLeft = el.delay({size: 44100}, el.ms2samps((60000/TEMPO) * T3), T2, left);
  let arp = el.mul(0.5, delayedLeft);

  let env = el.adsr(0.002, 0.005, 0.9, 1, gateLoop);
  let note1 = el.mul(env, voice(el.seq({key: 'arp1', seq: [CHORD_FREQS[0][0], 0, 0, 0, 0], hold: true}, gateChords)));
  let note2 = el.mul(env, voice(el.seq({key: 'arp2', seq: [CHORD_FREQS[0][1], 0, 0, 0, 0], hold: true}, gateChords)));
  let note3 = el.mul(env, voice(el.seq({key: 'arp3', seq: [CHORD_FREQS[0][2], 0, 0, 0, 0], hold: true}, gateChords)));
  let note4 = el.mul(env, voice(el.seq({key: 'arp4', seq: [CHORD_FREQS[0][3], 0, 0, 0, 0], hold: true}, gateChords)));
  let note5 = el.mul(env, voice(el.seq({key: 'arp5', seq: [0, CHORD_FREQS[1][0], 0, 0, 0], hold: true}, gateChords)));
  let note6 = el.mul(env, voice(el.seq({key: 'arp6', seq: [0, CHORD_FREQS[1][1], 0, 0, 0], hold: true}, gateChords)));
  let note7 = el.mul(env, voice(el.seq({key: 'arp7', seq: [0, CHORD_FREQS[1][2], 0, 0, 0], hold: true}, gateChords)));
  let note8 = el.mul(env, voice(el.seq({key: 'arp8', seq: [0, CHORD_FREQS[1][3], 0, 0, 0], hold: true}, gateChords)));
  let note9 = el.mul(env, voice(el.seq({key: 'arp9', seq: [0, 0, CHORD_FREQS[2][0], 0, 0], hold: true}, gateChords)));
  let note10 = el.mul(env, voice(el.seq({key: 'arp10', seq: [0, 0, CHORD_FREQS[2][1], 0, 0], hold: true}, gateChords)));
  let note11 = el.mul(env, voice(el.seq({key: 'arp11', seq: [0, 0, CHORD_FREQS[2][2], 0, 0], hold: true}, gateChords)));
  let note12 = el.mul(env, voice(el.seq({key: 'arp12', seq: [0, 0, CHORD_FREQS[2][3], 0, 0], hold: true}, gateChords)));
  let note13 = el.mul(env, voice(el.seq({key: 'arp13', seq: [0, 0, 0, CHORD_FREQS[3][0], CHORD_FREQS[3][0]], hold: true}, gateChords)));
  let note14 = el.mul(env, voice(el.seq({key: 'arp14', seq: [0, 0, 0, CHORD_FREQS[3][1], CHORD_FREQS[3][1]], hold: true}, gateChords)));
  let note15 = el.mul(env, voice(el.seq({key: 'arp15', seq: [0, 0, 0, CHORD_FREQS[3][2], CHORD_FREQS[3][2]], hold: true}, gateChords)));
  let note16 = el.mul(env, voice(el.seq({key: 'arp16', seq: [0, 0, 0, CHORD_FREQS[3][3], CHORD_FREQS[3][3]], hold: true}, gateChords)));

  // CHORD SEQUENCE
  let chordI   = (chI, el.seq({key: 's5', seq:  [1, 0, 0, 0]}, gateChords));
  let chordII  = (chII, el.seq({key: 's6', seq: [0, 1, 0, 0]}, gateChords));
  let chordIII = (chIII, el.seq({key: 's7', seq:[0, 0, 1, 0]}, gateChords));
  let chordIV  = (chIV, el.seq({key: 's7', seq: [0, 0, 0, 1]}, gateChords));

  // DRUM SEQUENCE
  let shakerSeq =    el.seq({key: 's1', seq: [0, 1, 0, 1, 0, 1, 0, 1]}, gate);
  let hClosedSeq =   el.seq({key: 's2', seq: [0, 0, 1, 0, 0, 0, 1, 0]}, gate);
  let snareSeq =     el.seq({key: 's3', seq: [0, 0, 1, 0, 0, 0, 1, 0]}, gate);
  let kickSeq =      el.seq({key: 's4', seq: [1, 1, 0, 0, 0, 0, 0, 0, 
                                              0, 0, 1, 1, 0, 0, 1, 0, 
                                              1, 1, 0, 0, 0, 1, 1, 0, 
                                              1, 1, 0, 0, 0, 0, 0, 0, 
                                              0, 0, 1, 1, 0, 0, 1, 0, 
                                              1, 1, 0, 0, 0, 1, 1, 0, 
                                              1, 1, 0, 0 ,0, 0, 0, 0, 
                                              0, 0, 1, 1, 0, 0, 1, 0, 
                                              1, 1, 0, 0, 0, 1, 1, 0, 
                                              1, 1, 0, 0, 0, 0, 0, 0], hold: true}, gateKick);

  // DRUM SOUNDS
  let shaker = hat(195.9977, 6271.927, 0.005, modulate(0.5, 4, 0.47), shakerSeq);
  let hihat = hat(391.9954, 6271.927, 0.005, modulate(0.5, 4, 0.47), hClosedSeq);
  let snare = clap(783.9909, 0.01, 0.4, snareSeq);
  let delayedSnare = el.delay({size: 44100}, el.ms2samps(50), 0.52, snare);
  let snareWD = el.add(snare, delayedSnare);
  let kickSignal = kick(48.99943, 0.15, modulate(0.255, 1, 0.200), 0.25, 5, kickSeq);
  let highPassKick = el.highpass(48.99943, 0.5, kickSignal);

  // OUTPUT GAIN
  let outChords = el.add(
    el.mul(0.1, note1),
    el.mul(0.1, note2),
    el.mul(0.1, note3),
    el.mul(0.1, note4),
    el.mul(0.1, note5),
    el.mul(0.1, note6),
    el.mul(0.1, note7),
    el.mul(0.1, note8),
  );
  let outChords2 = el.add(
    el.mul(0.1, note9),
    el.mul(0.1, note10),
    el.mul(0.1, note11),
    el.mul(0.1, note12),
    el.mul(0.1, note13),
    el.mul(0.1, note14),
    el.mul(0.1, note15),
    el.mul(0.1, note16),
  );
  // Then we'll apply a lowpass filter at 800Hz, with LFO modulation at 1.1Hz that sweeps
  // along [-400, 400], thereby modulating our lowpass cutoff between [400Hz, 1200Hz].
  let filtered = el.lowpass(modulate(800, 1.1, 400), 1.4, outChords);
  let delayed = el.delay({size: 44100}, el.ms2samps(60000/TEMPO), 0.3, filtered);
  let wetdryChords = el.add(filtered, delayed);

  let filtered2 = el.lowpass(modulate(800, 1.1, 400), 1.4, outChords2);
  let delayed2 = el.delay({size: 44100}, el.ms2samps(60000/TEMPO), 0.3, filtered2);
  let wetdryChords2 = el.add(filtered, delayed2);

  let outDrums = el.add(
    el.mul(0.3, shaker),
    el.mul(0.2, hihat), 
    el.mul(0.3, snareWD),
    el.mul(0.4, highPassKick),
  );
  let outChordsL = el.mul(0.8, el.sample({path: chords, mode: 'loop', channel: 0}, gateLoop));
  let outChordsR = el.mul(0.8, el.sample({path: chords, mode: 'loop', channel: 1}, gateLoop));
  let vocalsL = el.mul(1.5, el.sample({path: vocals, mode: 'loop', channel: 0}, gateLoop));
  let vocalsR = el.mul(1.5, el.sample({path: vocals, mode: 'loop', channel: 1}, gateLoop));
  let introL = el.mul(2.5, el.sample({path: intro, mode: 'gate', channel: 0}, gateLoop));
  let introR = el.mul(2.5, el.sample({path: intro, mode: 'gate', channel: 1}, gateLoop));
  let arpeggio = muteSwitch ? el.mul(0, arp) : timeSwitch ? el.add(arp) : el.add(arp);

  let output = el.add(
    introL, introR,
    wetdryChords, wetdryChords2,
    // outChordsL, outChordsR,
    // vocalsL, vocalsR,
    // el.mul(0.15, arpeggio),
    el.mul(0.8, outDrums)
  );

  core.render(
    output, output
  );

}

export default render;