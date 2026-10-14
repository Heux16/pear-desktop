export interface SleepTimerButtonProps {
  onClick?: (e: MouseEvent) => void;
  text: string;
}

export const SleepTimerButton = (props: SleepTimerButtonProps) => (
  <a
    class="yt-simple-endpoint style-scope ytmusic-menu-navigation-item-renderer"
    id="navigation-endpoint"
    onClick={(e) => props.onClick?.(e)}
    tabindex={-1}
  >
    <div class="icon ytmd-menu-item style-scope ytmusic-menu-navigation-item-renderer">
      <svg
        class="style-scope yt-icon"
        style={{
          'pointer-events': 'none',
          'display': 'block',
          'width': '100%',
          'height': '100%',
        }}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          class="style-scope yt-icon"
          d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"
          fill="#aaaaaa"
        />
      </svg>
    </div>
    <div
      class="text style-scope ytmusic-menu-navigation-item-renderer"
      id="ytmcustom-sleep-timer"
    >
      {props.text}
    </div>
  </a>
);
