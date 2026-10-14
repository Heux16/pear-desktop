import { createSignal, For, onMount, Show } from 'solid-js';

import { t } from '@/i18n';

import { formatRemaining, type SleepTimerState } from '../timer';

const PRESET_MINUTES = [5, 15, 30, 60];
const MAX_MINUTES = 720;
const MAX_SONGS = 99;

type CustomUnit = 'minutes' | 'songs';

export interface SleepTimerDialogProps {
  state: SleepTimerState;
  /** current time in ms, only used to show the remaining time */
  currentTime: number;
  onClose: () => void;
  onStartMinutes: (minutes: number) => void;
  onStartSongs: (songs: number) => void;
  onTurnOff: () => void;
}

export const durationLabel = (minutes: number) =>
  minutes === 60
    ? t('plugins.sleep-timer.dialog.hour')
    : t('plugins.sleep-timer.dialog.minutes', { count: minutes });

const statusText = (state: SleepTimerState, currentTime: number) => {
  switch (state.kind) {
    case 'time':
      return t('plugins.sleep-timer.dialog.status-time', {
        time: formatRemaining(state.endsAt - currentTime),
      });
    case 'songs':
      return t('plugins.sleep-timer.dialog.status-songs', {
        count: state.remaining,
      });
    default:
      return null;
  }
};

export const SleepTimerDialog = (props: SleepTimerDialogProps) => {
  const [customValue, setCustomValue] = createSignal('');
  const [customUnit, setCustomUnit] = createSignal<CustomUnit>('minutes');
  const [invalid, setInvalid] = createSignal(false);

  let firstButton: HTMLButtonElement | undefined;
  onMount(() => firstButton?.focus());

  const submitCustom = (event: SubmitEvent) => {
    event.preventDefault();

    const amount = Number(customValue());
    const max = customUnit() === 'minutes' ? MAX_MINUTES : MAX_SONGS;
    if (!Number.isInteger(amount) || amount < 1 || amount > max) {
      setInvalid(true);
      return;
    }

    setInvalid(false);
    if (customUnit() === 'minutes') props.onStartMinutes(amount);
    else props.onStartSongs(amount);
  };

  return (
    <div
      class="sleep-timer-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
      onKeyDown={(e) => {
        // keep the typed keys away from the player shortcuts
        e.stopPropagation();
        if (e.key === 'Escape') props.onClose();
      }}
    >
      <div
        aria-labelledby="sleep-timer-title"
        aria-modal="true"
        class="sleep-timer-dialog"
        role="dialog"
      >
        <h2 class="sleep-timer-title" id="sleep-timer-title">
          {t('plugins.sleep-timer.dialog.title')}
        </h2>

        <Show when={statusText(props.state, props.currentTime)}>
          {(text) => (
            <p aria-live="polite" class="sleep-timer-status">
              {text()}
            </p>
          )}
        </Show>

        <ul class="sleep-timer-options">
          <For each={PRESET_MINUTES}>
            {(minutes, index) => (
              <li>
                <button
                  class="sleep-timer-option"
                  onClick={() => props.onStartMinutes(minutes)}
                  ref={(element) => {
                    if (index() === 0) firstButton = element;
                  }}
                  type="button"
                >
                  {durationLabel(minutes)}
                </button>
              </li>
            )}
          </For>
          <li>
            <button
              class="sleep-timer-option"
              onClick={() => props.onStartSongs(1)}
              type="button"
            >
              {t('plugins.sleep-timer.dialog.end-of-track')}
            </button>
          </li>
        </ul>

        <form class="sleep-timer-custom" onSubmit={submitCustom}>
          <label class="sleep-timer-custom-label" for="sleep-timer-custom">
            {t('plugins.sleep-timer.dialog.custom')}
          </label>
          <div class="sleep-timer-custom-row">
            <input
              aria-invalid={invalid()}
              class="sleep-timer-input"
              id="sleep-timer-custom"
              inputmode="numeric"
              max={customUnit() === 'minutes' ? MAX_MINUTES : MAX_SONGS}
              min="1"
              onInput={(e) => {
                setCustomValue(e.currentTarget.value);
                setInvalid(false);
              }}
              step="1"
              type="number"
              value={customValue()}
            />
            <select
              aria-label={t('plugins.sleep-timer.dialog.custom-unit')}
              class="sleep-timer-select"
              onChange={(e) => {
                setCustomUnit(e.currentTarget.value as CustomUnit);
                setInvalid(false);
              }}
              value={customUnit()}
            >
              <option value="minutes">
                {t('plugins.sleep-timer.dialog.unit-minutes')}
              </option>
              <option value="songs">
                {t('plugins.sleep-timer.dialog.unit-songs')}
              </option>
            </select>
            <button class="sleep-timer-option sleep-timer-start" type="submit">
              {t('plugins.sleep-timer.dialog.start')}
            </button>
          </div>
        </form>

        <div class="sleep-timer-actions">
          <Show when={props.state.kind !== 'off'}>
            <button
              class="sleep-timer-option sleep-timer-turn-off"
              onClick={() => props.onTurnOff()}
              type="button"
            >
              {t('plugins.sleep-timer.dialog.turn-off')}
            </button>
          </Show>
          <button
            class="sleep-timer-option"
            onClick={() => props.onClose()}
            type="button"
          >
            {t('plugins.sleep-timer.dialog.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
