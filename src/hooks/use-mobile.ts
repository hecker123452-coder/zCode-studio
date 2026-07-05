import * as React from "react"

const MOBILE_BREAKPOINT = 768

function subscribe(callback: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener("change", callback)
  return () => mql.removeEventListener("change", callback)
}

function getSnapshot() {
  return window.innerWidth < MOBILE_BREAKPOINT
}

function getServerSnapshot() {
  return false
}

export function useIsMobile() {
  // useSyncExternalStore is the correct primitive for syncing React state
  // with an external system (here: window.matchMedia). It avoids the
  // setState-in-effect anti-pattern entirely.
  const isMobile = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return isMobile
}
