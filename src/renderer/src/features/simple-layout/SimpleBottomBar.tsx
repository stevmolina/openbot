import { Button, Clock3, MessageCircle, MotionTooltip, Plug } from "@openbot/ui";
import { useText } from "@openbot/ui/text";
import type { JSX } from "@solidjs/web";
import { SimplePhotoMenu } from "./SimplePhotoMenu";
import type { SimpleSidebar } from "./simple-sidebar";

function BarButton(props: { label: string; current: boolean; onClick: () => void; children: JSX.Element }) {
  return (
    <MotionTooltip content={props.label} placement="top">
      <Button
        variant="ghost"
        type="button"
        class="simple-bar-button no-drag"
        aria-label={props.label}
        aria-current={props.current ? "page" : undefined}
        data-cuelume-navigate=""
        onClick={() => props.onClick()}
      >
        {props.children}
      </Button>
    </MotionTooltip>
  );
}

/**
 * The bar at the bottom of the simple sidebar, in place of the page rail: the photo with its menu, then
 * one button per sidebar list. The current button follows the page in the card.
 */
export function SimpleBottomBar(props: { sidebar: SimpleSidebar }) {
  const { t } = useText();
  return (
    <nav class="simple-bar" aria-label={t("simple.bar.label")}>
      <SimplePhotoMenu current={props.sidebar.current() === "photo"} />
      <div class="simple-bar-nav">
        <BarButton
          label={t("simple.bar.chat")}
          current={props.sidebar.current() === "chat"}
          onClick={props.sidebar.showChat}
        >
          <MessageCircle aria-hidden="true" />
        </BarButton>
        <BarButton
          label={t("simple.bar.clock")}
          current={props.sidebar.current() === "clock"}
          onClick={props.sidebar.showClock}
        >
          <Clock3 aria-hidden="true" />
        </BarButton>
        <BarButton
          label={t("simple.bar.plug")}
          current={props.sidebar.current() === "plug"}
          onClick={props.sidebar.showPlug}
        >
          <Plug aria-hidden="true" />
        </BarButton>
      </div>
    </nav>
  );
}
