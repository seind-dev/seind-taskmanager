import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { DataStore, InMemoryStore } from '../../main/dataStore';
import type { AppSettings, Theme } from '../../shared/types';

/**
 * Feature: task-reminder-app, Property 9: Ayarlar Gidiş-Dönüş
 * Validates: Requirements 7.4
 *
 * For any geçerli ayar değeri (tema seçimi dahil), ayar kaydedilip yeniden
 * yüklendiğinde orijinal değer ile eşdeğer olmalıdır.
 */

// --- Generators ---

const themeArb: fc.Arbitrary<Theme> = fc.constantFrom('dark', 'light');

const appSettingsArb: fc.Arbitrary<AppSettings> = fc.record({
  autoLaunch: fc.boolean(),
  theme: themeArb,
  startMinimized: fc.boolean(),
});

/** Generates a partial settings update with at least one field */
const partialSettingsArb: fc.Arbitrary<Partial<AppSettings>> = fc
  .record(
    {
      autoLaunch: fc.boolean(),
      theme: themeArb,
      startMinimized: fc.boolean(),
    },
    { requiredKeys: [] },
  )
  .filter((s) => Object.keys(s).length > 0);

// --- Tests ---

describe('Property 9: Ayarlar Gidiş-Dönüş (Settings Round-Trip)', () => {
  let store: DataStore;

  beforeEach(() => {
    store = new DataStore(new InMemoryStore());
  });

  it('full settings update round-trips correctly', () => {
    fc.assert(
      fc.property(appSettingsArb, (settings) => {
        store = new DataStore(new InMemoryStore());

        // Save all settings at once
        store.updateSettings(settings);

        // Retrieve and verify
        const retrieved = store.getSettings();

        expect(retrieved.autoLaunch).toBe(settings.autoLaunch);
        expect(retrieved.theme).toBe(settings.theme);
        expect(retrieved.startMinimized).toBe(settings.startMinimized);
      }),
      { numRuns: 100 },
    );
  });

  it('partial settings update preserves unchanged fields', () => {
    fc.assert(
      fc.property(appSettingsArb, partialSettingsArb, (initial, partialUpdate) => {
        store = new DataStore(new InMemoryStore());

        // Set initial settings
        store.updateSettings(initial);

        // Apply partial update
        store.updateSettings(partialUpdate);

        // Retrieve and verify
        const retrieved = store.getSettings();

        // Updated fields should reflect new values
        if (partialUpdate.autoLaunch !== undefined) {
          expect(retrieved.autoLaunch).toBe(partialUpdate.autoLaunch);
        } else {
          expect(retrieved.autoLaunch).toBe(initial.autoLaunch);
        }

        if (partialUpdate.theme !== undefined) {
          expect(retrieved.theme).toBe(partialUpdate.theme);
        } else {
          expect(retrieved.theme).toBe(initial.theme);
        }

        if (partialUpdate.startMinimized !== undefined) {
          expect(retrieved.startMinimized).toBe(partialUpdate.startMinimized);
        } else {
          expect(retrieved.startMinimized).toBe(initial.startMinimized);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('settings survive multiple sequential updates', () => {
    fc.assert(
      fc.property(
        fc.array(appSettingsArb, { minLength: 1, maxLength: 10 }),
        (settingsList) => {
          store = new DataStore(new InMemoryStore());

          // Apply each settings update in sequence
          for (const settings of settingsList) {
            store.updateSettings(settings);
          }

          // The last update should be what we get back
          const lastSettings = settingsList[settingsList.length - 1];
          const retrieved = store.getSettings();

          expect(retrieved.autoLaunch).toBe(lastSettings.autoLaunch);
          expect(retrieved.theme).toBe(lastSettings.theme);
          expect(retrieved.startMinimized).toBe(lastSettings.startMinimized);
        },
      ),
      { numRuns: 100 },
    );
  });
});
