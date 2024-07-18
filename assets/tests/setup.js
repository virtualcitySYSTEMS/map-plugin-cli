/* eslint-disable import/no-extraneous-dependencies, import/first */
import { vi } from 'vitest';

vi.hoisted(() => {
  global.jest = vi;
});

import ResizeObserver from 'resize-observer-polyfill';

global.ResizeObserver = ResizeObserver;

import 'jest-canvas-mock';

window.CESIUM_BASE_URL = '/node_modules/@vcmap-cesium/engine/Build/';
