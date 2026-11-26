import type { AnchorHTMLAttributes, ReactElement } from "react";
import { isPlainLeftClick, navigate } from "./routing/location.js";

/** Props for {@link PanelLink}. */
export interface PanelLinkProps extends Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
> {
  /** Destination URL, typically from `usePanel().href`. */
  to: string;
}

/**
 * An `<a>` that navigates within the panel without reloading the page.
 * Modified clicks (new tab, new window) keep the browser's behavior.
 */
export function PanelLink({
  to,
  onClick,
  ...props
}: PanelLinkProps): ReactElement {
  return (
    <a
      {...props}
      href={to}
      onClick={(event) => {
        onClick?.(event);

        if (isPlainLeftClick(event)) {
          event.preventDefault();
          navigate(to);
        }
      }}
    />
  );
}
