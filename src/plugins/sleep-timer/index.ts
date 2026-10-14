import { t } from '@/i18n';
import { createPlugin } from '@/utils';

import { onPlayerApiReady, onStop } from './renderer';
import style from './style.css?inline';

export default createPlugin({
  name: () => t('plugins.sleep-timer.name'),
  description: () => t('plugins.sleep-timer.description'),
  restartNeeded: false,
  config: {
    enabled: true,
  },
  stylesheets: [style],
  renderer: {
    onPlayerApiReady,
    stop: onStop,
  },
});
