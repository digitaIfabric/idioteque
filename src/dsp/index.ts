// @ts-ignore
import {ElementaryNodeRenderer as core, el} from '@nick-thompson/elementary';

function render(){
  core.render(el.cycle(440), el.cycle(441));
}

module.exports.default = render;