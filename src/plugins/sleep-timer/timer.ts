import { createSignal } from 'solid-js';

export type SleepTimerState =
  | { kind: 'off' }
  | { kind: 'time'; endsAt: number }
  | { kind: 'songs'; remaining: number };

export interface SleepTimerDeps {
  /** Pauses the playback */
  pause: () => void;
  /** Current time in ms, injectable for tests */
  now?: () => number;
}

const MS_PER_MINUTE = 60_000;

// A song counts as finished when this many seconds (or less) are left.
// `timeupdate` fires about every 250ms, so the end cannot be missed by accident.
const END_THRESHOLD_SECONDS = 0.6;
// When the track changed without the end being seen, it still counts as finished
// if the previous track was at most this many seconds away from its end.
// (a manual skip in the middle of a song must not count)
const NATURAL_END_WINDOW_SECONDS = 3;

export const createSleepTimer = (deps: SleepTimerDeps) => {
  const now = deps.now ?? Date.now;

  const [state, setState] = createSignal<SleepTimerState>({ kind: 'off' });
  // updated every second while a time based timer is running, used to show the remaining time
  const [currentTime, setCurrentTime] = createSignal(now());

  let interval: ReturnType<typeof setInterval> | undefined;
  // songs mode: whether the current song was already counted, and how close its end was
  let songCounted = false;
  let secondsLeft = Number.POSITIVE_INFINITY;

  const stopInterval = () => {
    if (interval !== undefined) clearInterval(interval);
    interval = undefined;
  };

  /** Pauses the playback and turns the timer off. */
  const finish = () => {
    stopInterval();
    setState({ kind: 'off' });
    deps.pause();
  };

  const countSong = () => {
    const current = state();
    if (current.kind !== 'songs') return;

    const remaining = current.remaining - 1;
    if (remaining <= 0) {
      finish();
    } else {
      setState({ kind: 'songs', remaining });
    }
  };

  /** Checks if a time based timer is over. Called every second while one is running. */
  const tick = () => {
    setCurrentTime(now());

    const current = state();
    if (current.kind === 'time' && now() >= current.endsAt) finish();
  };

  /** Turns the timer off without pausing. Returns whether a timer was running. */
  const cancel = () => {
    const wasRunning = state().kind !== 'off';
    stopInterval();
    setState({ kind: 'off' });
    return wasRunning;
  };

  /** Pauses after the given amount of minutes. */
  const startMinutes = (minutes: number) => {
    if (!Number.isFinite(minutes) || minutes <= 0) return false;

    cancel();
    setCurrentTime(now());
    const durationMs = minutes * MS_PER_MINUTE;
    setState({ kind: 'time', endsAt: now() + durationMs });
    interval = setInterval(tick, 1000);
    return true;
  };

  /**
   * Pauses at the end of the given number of songs, the song that is playing now counts as the first.
   */
  const startSongs = (songs: number) => {
    if (!Number.isInteger(songs) || songs < 1) return false;

    cancel();
    songCounted = false;
    secondsLeft = Number.POSITIVE_INFINITY;
    setState({ kind: 'songs', remaining: songs });
    return true;
  };

  /** Feed with the `timeupdate` events of the video (values in seconds). */
  const handleTimeUpdate = (position: number, duration: number) => {
    if (state().kind !== 'songs') return;
    if (!Number.isFinite(duration) || duration <= 0) return;

    secondsLeft = duration - position;

    if (secondsLeft > NATURAL_END_WINDOW_SECONDS) {
      // a new song (or a repeat of the same one) started
      songCounted = false;
    } else if (!songCounted && secondsLeft <= END_THRESHOLD_SECONDS) {
      songCounted = true;
      countSong();
    }
  };

  /** Feed when another song started playing. */
  const handleTrackChange = () => {
    if (state().kind !== 'songs') return;

    // the song ended but `timeupdate` never saw its last moments
    if (!songCounted && secondsLeft <= NATURAL_END_WINDOW_SECONDS) {
      countSong();
    }

    songCounted = false;
    secondsLeft = Number.POSITIVE_INFINITY;
  };

  const dispose = () => {
    cancel();
  };

  return {
    state,
    currentTime,
    startMinutes,
    startSongs,
    cancel,
    tick,
    handleTimeUpdate,
    handleTrackChange,
    dispose,
  };
};

export type SleepTimer = ReturnType<typeof createSleepTimer>;

/** Formats a duration in ms as `m:ss` or `h:mm:ss`. */
export const formatRemaining = (ms: number) => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (value: number) => value.toString().padStart(2, '0');
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
};
