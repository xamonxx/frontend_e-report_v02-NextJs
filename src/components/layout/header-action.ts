/**
 * Height of the app's top bar row.
 *
 * The sidebar's brand block and the page header sit side by side from `lg` up
 * and must share a baseline, but they live in different files and had drifted to
 * h-16 and h-14 — an 8px step where their bottom borders met. Both now read it
 * from here.
 */
export const APP_BAR_HEIGHT_CLASS = 'h-14'

/**
 * Shared geometry for the icon buttons in the header's right-hand action group
 * (PWA install, theme toggle, notifications).
 *
 * These three sat at h-9/rounded-xl, h-9/rounded-xl and size-10/rounded-[10px]
 * respectively, so the row read as visibly uneven. They live in three separate
 * files, which is exactly how that drift happened — keep the geometry here so a
 * change to one is a change to all.
 *
 * 40px on touch screens (a comfortable thumb target) tightening to 36px from
 * `sm` up, where a pointer is doing the aiming.
 */
export const HEADER_ACTION_CLASS =
  'relative flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border shadow-sm backdrop-blur-md transition-[border-color,background-color,color,box-shadow,transform] duration-200 sm:size-9'
