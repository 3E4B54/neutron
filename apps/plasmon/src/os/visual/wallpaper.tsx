import { PLASMON_MARK_ASSET, PLASMON_WALLPAPER_ASSET } from "./assets.ts";
import "./visual.scss";

export interface PlasmonWallpaperProps {
  className?: string;
  showIdentity?: boolean;
}

/**
 * Shared wallpaper presentation for Shell consumption. This component has no
 * shell behavior and should remain behind desktop/window interaction layers.
 */
export function PlasmonWallpaper({ className, showIdentity = true }: PlasmonWallpaperProps) {
  return (
    <div
      className={`plasmon-wallpaper${className ? ` ${className}` : ""}`}
      style={{ backgroundImage: `url(${PLASMON_WALLPAPER_ASSET})` }}
      aria-hidden="true"
    >
      {showIdentity ? (
        <div className="plasmon-wallpaper__identity">
          <img src={PLASMON_MARK_ASSET} alt="" draggable={false} />
          <span>plasmon</span>
        </div>
      ) : null}
    </div>
  );
}
