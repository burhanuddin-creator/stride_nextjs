import type { AvailabilityDay, SchedulingConfig } from '../../types/scheduling';
import type { SchedulingService } from './types';

const ZONE = 'America/Chicago';

const dateIn = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const timeIn = (d: Date) => new Intl.DateTimeFormat('en-US', { timeZone: ZONE, hour: 'numeric', minute: '2-digit' }).format(d);
const weekdayIn = (d: Date) => new Intl.DateTimeFormat('en-US', { timeZone: ZONE, weekday: 'short' }).format(d);

/**
 * Offline demonstration adapter: sample weekday times (generated, not real availability) and a "booked" answer. It never
 * transmits, stores or logs anything and never contacts SPRY; the form labels everything as a demo.
 */
export function createMockSchedulingService(delayMs = 500, { available = true, now = () => new Date() } = {}): SchedulingService {
  const wait = () => new Promise((resolve) => setTimeout(resolve, delayMs));

  function sampleDays(): AvailabilityDay[] {
    const days = new Map<string, AvailabilityDay>();
    const base = now();
    for (let offset = 1; offset <= 21; offset++) {
      for (const utcHour of [15, 17, 20]) {
        const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + offset, utcHour, 0));
        if (['Sat', 'Sun'].includes(weekdayIn(d)) || (offset % 4 === 0 && utcHour === 17)) continue;
        const date = dateIn(d);
        const day = days.get(date) ?? { date, slots: [] };
        day.slots.push({ start: d.toISOString().replace(/\.\d{3}Z$/, 'Z'), time: timeIn(d) });
        days.set(date, day);
      }
    }
    return [...days.values()];
  }

  return {
    mode: 'mock',
    async getConfig(): Promise<SchedulingConfig> {
      if (!available) return { available: false };
      const first = dateIn(now());
      const last = dateIn(new Date(now().getTime() + 30 * 86_400_000));
      return {
        available: true,
        providerName: 'Demo provider',
        appointmentType: 'Initial Evaluation',
        durationMinutes: 60,
        timezone: ZONE,
        firstDate: first,
        lastDate: last,
      };
    },
    async getAvailability(from, to) {
      await wait();
      return { ok: true, days: sampleDays().filter((d) => d.date >= from && d.date <= to) };
    },
    async book(payload) {
      await wait();
      const start = new Date(payload.start);
      const label = new Intl.DateTimeFormat('en-US', {
        timeZone: ZONE,
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      }).format(start);
      return { ok: true, mode: 'mock', outcome: 'booked', startsAtLabel: label, durationMinutes: 60 };
    },
  };
}
