'use client'

import { Terminal } from '@/components/editor/terminal'
import { useEditorStore } from '@/store/editor-store'
import { MobileDrawer } from '@/components/editor/mobile-sidebar'

export function MobileTerminal() {
  const open = useEditorStore(s => s.mobileTerminalOpen)
  const setOpen = useEditorStore(s => s.setMobileTerminalOpen)

  return (
    <MobileDrawer
      open={open}
      onClose={() => setOpen(false)}
      title="Terminal"
      side="bottom"
    >
      <div className="h-[65vh]">
        <Terminal />
      </div>
    </MobileDrawer>
  )
}
