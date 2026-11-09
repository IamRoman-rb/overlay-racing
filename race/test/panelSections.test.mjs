import test from 'node:test';
import assert from 'node:assert/strict';
import { getSectionOrder, sectionPlacement, PANEL_SECTIONS } from '../src/utils/panelSections.js';

test('orden de las secciones del PANEL', () => {
  const all = PANEL_SECTIONS.map(s => s.id);
  assert.deepEqual(getSectionOrder({}), all);
  const order = getSectionOrder({ panelSectionOrder: ['closing', 'flags', 'graphics', 'viejo', 'flags'] });
  assert.deepEqual(order.slice(0, 3), ['closing', 'flags', 'graphics']);
  assert.equal(order.length, all.length);
  assert.deepEqual(sectionPlacement({ panelSectionHidden: ['voting'] }, 'voting'), { order: all.indexOf('voting'), display: 'none' });
});
