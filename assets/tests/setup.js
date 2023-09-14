/* eslint-disable import/no-extraneous-dependencies, import/first */
import { vi } from 'vitest';

vi.hoisted(() => {
  global.jest = vi;
});

import ResizeObserver from 'resize-observer-polyfill';

global.ResizeObserver = ResizeObserver;

import 'jest-canvas-mock';
import Vue from 'vue';

Vue.config.productionTip = false;

window.CESIUM_BASE_URL = '/node_modules/@vcmap-cesium/engine/Build/';
