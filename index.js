import {default as core} from '@elemaudio/node-renderer';
import chokidar from 'chokidar';
import render from './dsp/index.js';

const watcher = chokidar.watch("./dsp/");
const modulePath = './dsp/index.js';

let didLoad = false;

core.on('load',() => { 
  // Here, we install a listener for the load event immediately. It will likely
  // come before any file changes and kick off the initial render. If a file change
  // does happen before the load event, we should block the watcher from rendering
  didLoad = true;
  render();
});

core.initialize();


watcher.on("ready", function(path) {
    watcher.on("change", async function(path) {
      console.log(`Change file ${path}`);
        async function importFresh(modulePath) {
            const cacheBustingModulePath = `${modulePath}?update=${Date.now()}`
            return (await import(cacheBustingModulePath)).default
        }
        if (didLoad) {
            // Here, we install a listener for the load event immediately. It will likely
            // come before any file changes and kick off the initial render. If a file change
            // does happen before the load event, we should block the watcher from rendering
            const render = await importFresh(modulePath);
            render();
        }
    })
});
