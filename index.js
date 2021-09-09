const chokidar = require('chokidar');

const watcher = chokidar.watch("./dsp/");

watcher.on("ready", function() {
  watcher.on("all", function() {
    Object.keys(require.cache).forEach(function(id) {
      //Get the local path to the module
      const localId = id.substr(process.cwd().length);

      //Ignore anything not in dsp/
      if(!localId.match(/^\/dsp\//)) return;

      //Remove the module from the cache
      delete require.cache[id];
    });
    // Kick off your new render
    require("./dsp/index.js").render();
  });
});