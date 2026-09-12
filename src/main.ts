import './styles.css';
import { mountApp } from './ui/app-controller.js';
import { getPagePreset } from './pages/presets.js';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Missing #app root');
const pagePreset = getPagePreset(window.location.pathname);
mountApp(root, {
  title: pagePreset.heading,
  intro: pagePreset.description,
  format: pagePreset.format,
  width: pagePreset.width,
  height: pagePreset.height,
  maxSize: pagePreset.maxSize,
  maxSizeUnit: pagePreset.maxSizeUnit,
  referenceUrl: pagePreset.referenceUrl,
  referenceLabel: pagePreset.referenceLabel,
  verificationText: pagePreset.verificationText,
});
