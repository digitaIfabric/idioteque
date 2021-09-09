const chokidar = require('chokidar');

const watcher = chokidar.watch("./dsp/");
let didLoad = false;

elementary.core.on('load',() => { 
  // Here, we install a listener for the load event immediately. It will likely
  // come before any file changes and kick off the initial render. If a file change
  // does happen before the load event, we should block the watcher from rendering
  didLoad = true;
  require("./dsp/index.js").render();
});

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

    // If we've already loaded, safe to render again
    if (didLoad) {
      require("./dsp/index.js").render();
    }
  });
});