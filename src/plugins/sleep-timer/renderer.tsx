import { createSignal, Show } from 'solid-js';
import { render } from 'solid-js/web';

import { t } from '@/i18n';
import {
  isMusicOrVideoTrack,
  isPlayerMenu,
} from '@/plugins/utils/renderer/check';
import { getSongMenu } from '@/providers/dom-elements';

import { SleepTimerButton } from './templates/button';
import { durationLabel, SleepTimerDialog } from './templates/dialog';
import { createSleepTimer, formatRemaining, type SleepTimer } from './timer';

import type { MusicPlayer } from '@/types/music-player';
import type { AppElement } from '@/types/queue';
import type { VideoDataChanged } from '@/types/video-data-changed';

const [dialogOpen, setDialogOpen] = createSignal(false);

let cleanups: (() => void)[] = [];

const showToast = (message: string) =>
  document
    .querySelector<AppElement>('ytmusic-app')
    ?.toastService?.show(message);

/** Closes the popup menu the button was clicked in. */
const closeSongMenu = () => {
  try {
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        code: 'Escape',
        keyCode: 27,
        bubbles: true,
      }),
    );
  } catch {
    // the menu just stays open
  }
};

const createMenuButton = (timer: SleepTimer) => {
  const container = document.createElement('div');
  container.classList.add(
    'style-scope',
    'menu-item',
    'ytmusic-menu-popup-renderer',
  );
  container.setAttribute('aria-disabled', 'false');
  container.setAttribute('aria-selected', 'false');
  container.setAttribute('role', 'option');
  container.setAttribute('tabindex', '-1');

  const buttonText = () => {
    const state = timer.state();
    switch (state.kind) {
      case 'time':
        return t('plugins.sleep-timer.menu.button-active', {
          status: formatRemaining(state.endsAt - timer.currentTime()),
        });
      case 'songs':
        return t('plugins.sleep-timer.menu.button-active', {
          status: t('plugins.sleep-timer.dialog.songs', {
            count: state.remaining,
          }),
        });
      default:
        return t('plugins.sleep-timer.menu.button');
    }
  };

  const disposeButton = render(
    () => (
      <SleepTimerButton
        onClick={() => {
          closeSongMenu();
          // let the menu finish closing, it would take the focus back otherwise
          setTimeout(() => setDialogOpen(true), 0);
        }}
        text={buttonText()}
      />
    ),
    container,
  );

  const observer = new MutationObserver(() => {
    const menu = getSongMenu();

    if (
      !menu ||
      menu.contains(container) ||
      !isMusicOrVideoTrack() ||
      !isPlayerMenu(menu)
    ) {
      return;
    }

    menu.prepend(container);
  });

  const popupContainer = document.querySelector('ytmusic-popup-container');
  if (popupContainer) {
    observer.observe(popupContainer, { childList: true, subtree: true });
  }

  return () => {
    observer.disconnect();
    disposeButton();
    container.remove();
  };
};

const createDialog = (timer: SleepTimer) => {
  const root = document.createElement('div');
  root.id = 'sleep-timer-root';
  document.body.append(root);

  const close = () => setDialogOpen(false);

  const disposeDialog = render(
    () => (
      <Show when={dialogOpen()}>
        <SleepTimerDialog
          currentTime={timer.currentTime()}
          onClose={close}
          onStartMinutes={(minutes) => {
            if (!timer.startMinutes(minutes)) return;

            showToast(
              t('plugins.sleep-timer.toast.set', {
                time: durationLabel(minutes),
              }),
            );
            close();
          }}
          onStartSongs={(songs) => {
            if (!timer.startSongs(songs)) return;

            showToast(
              songs === 1
                ? t('plugins.sleep-timer.toast.set-end-of-track')
                : t('plugins.sleep-timer.toast.set-songs', { count: songs }),
            );
            close();
          }}
          onTurnOff={() => {
            if (timer.cancel()) {
              showToast(t('plugins.sleep-timer.toast.cancelled'));
            }
            close();
          }}
          state={timer.state()}
        />
      </Show>
    ),
    root,
  );

  return () => {
    disposeDialog();
    root.remove();
  };
};

export const onStop = () => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  setDialogOpen(false);
};

export const onPlayerApiReady = (api: MusicPlayer) => {
  // in case the plugin gets started twice
  onStop();

  const timer = createSleepTimer({ pause: () => api.pauseVideo() });

  // `timeupdate` does not bubble, but it can be captured on the document,
  // that also keeps working if the video element gets replaced
  const timeUpdateListener = (event: Event) => {
    if (event.target instanceof HTMLVideoElement) {
      timer.handleTimeUpdate(event.target.currentTime, event.target.duration);
    }
  };
  document.addEventListener('timeupdate', timeUpdateListener, true);

  let lastVideoId: string | undefined;
  const videoDataListener = (event: Event) => {
    const { name, videoData } = (event as CustomEvent<VideoDataChanged>).detail;
    if (name !== 'dataloaded') return;

    const videoId = videoData?.videoId;
    if (videoId !== undefined && videoId === lastVideoId) return;

    lastVideoId = videoId;
    timer.handleTrackChange();
  };
  document.addEventListener('videodatachange', videoDataListener);

  cleanups = [
    () => document.removeEventListener('timeupdate', timeUpdateListener, true),
    () => document.removeEventListener('videodatachange', videoDataListener),
    () => timer.dispose(),
    createMenuButton(timer),
    createDialog(timer),
  ];
};
