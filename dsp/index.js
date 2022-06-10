//                                                 _          _       __  _        _ _ _ __  _  ____
//                                            ___ (_)__ _  __| |_ __ |_ \| |_ __ _| (_) '_ \(_)/ _  |
//                                           |__ \| |__` |/ _` | '_ \ _| | | '_ \__ | | |_) | | | | |
//                                            __) | |  | | (_| | |_) |_  | | |_) || | | .__/| | |_| |
// Idioteque                                 |___/|_|  |_|\__,_|_.__/  |_|_|_.__/__/|_|\___||_|\____|
import { ElementaryNodeRenderer as core, el } from '@nick-thompson/elementary';
import ds from '@nick-thompson/drumsynth';

const chords = './samples/idioteque.wav';
const vocals = './samples/chorus-vocals.wav';
const niceDrumRoom = './samples/NiceDrumRoom.wav';

const modulate = (x, rate, amount) => {
  return el.add(x, el.mul(amount, el.cycle(rate)));
}

function render(){
  // KEY Eb
  // SET TEMPO
  let gateLoop = el.train(0);
  let gate = el.train(276/60);
  let gateKick = el.train(552/60);

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
  let shaker = ds.hat(195.9977, 6271.927, 0.005, modulate(0.5, 4, 0.47), shakerSeq);
  let hat = ds.hat(391.9954, 6271.927, 0.005, modulate(0.5, 4, 0.47), hClosedSeq);
  let snare = ds.clap(783.9909, 0.01, 0.40, snareSeq);
  let delayedSnare = el.delay({size: 44100}, el.ms2samps(50), 0.525, snare);
  let reverbSnare2 = el.convolve({path: niceDrumRoom}, delayedSnare);
  let snareWD = el.add(snare, reverbSnare2);
  let kick = ds.kick(48.99943, 0.15, modulate(0.255, 1, 0.200), 0.25, 5, kickSeq);
  let highPassKick = el.highpass(48.99943, 0.5, kick);

  // OUTPUT GAIN
  let outDrums = el.add(
    el.mul(0.3, shaker),
    el.mul(0.2, hat), 
    el.mul(0.3, snareWD),
    // el.mul(0.3, snareA7WD),
    el.mul(0.4, highPassKick),
  )
  let outChordsL = el.mul(0.3, el.sample({path: chords, mode: 'loop', channel: 0}, gateLoop));
  let outChordsR = el.mul(0.3, el.sample({path: chords, mode: 'loop', channel: 1}, gateLoop));
  let vocalsL = el.mul(0.3, el.sample({path: vocals, mode: 'loop', channel: 0}, gateLoop));
  let vocalsR = el.mul(0.3, el.sample({path: vocals, mode: 'loop', channel: 1}, gateLoop));
  // let introL = el.mul(0.9, el.sample({path: introFX, mode: 'loop', channel: 0}, gateLoop));
  // let introR = el.mul(0.9, el.sample({path: introFX, mode: 'loop', channel: 1}, gateLoop));
  let output = el.add(
    outChordsL, outChordsR,
    el.mul(1.5, vocalsL), el.mul(1.5, vocalsR),
    // introL, introR,
    el.mul(0.1, outDrums)
  );

  core.render(
    output, output
  );

}

export default render;