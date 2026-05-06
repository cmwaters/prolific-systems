import { calculateWorkableArea } from './workableArea';
import type { GantryConfig } from './types';

self.onmessage = (event: MessageEvent<GantryConfig>) => {
  self.postMessage(calculateWorkableArea(event.data));
};
