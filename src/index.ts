// @ts-ignore
import {ElementaryNodeRenderer as core, el} from '@nick-thompson/elementary';
import { hotImport } from 'hot-import';

core.on('load', async function() {
  const hotMod = await hotImport('/dsp');
});

core.initialize();