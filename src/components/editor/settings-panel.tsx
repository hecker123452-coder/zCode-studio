'use client'

import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useEditorStore } from '@/store/editor-store'

export function SettingsPanel() {
  const open = useEditorStore(s => s.settingsOpen)
  const setOpen = useEditorStore(s => s.setSettingsOpen)
  const settings = useEditorStore(s => s.settings)
  const updateSettings = useEditorStore(s => s.updateSettings)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] w-full max-w-3xl overflow-hidden p-0 sm:rounded-2xl md:max-h-[85vh]">
        <DialogHeader className="border-b px-4 py-3 md:px-6 md:py-4">
          <DialogTitle className="flex items-center gap-2 text-base md:text-lg">
            <span>Settings</span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Configure editor preferences and editor options.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="flex h-[70vh] flex-col md:h-[60vh]">
          <TabsList className="mx-3 mt-3 grid w-auto grid-cols-2 md:mx-6 md:mt-4">
            <TabsTrigger value="general" className="text-xs md:text-sm">General</TabsTrigger>
            <TabsTrigger value="editor" className="text-xs md:text-sm">Editor</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 px-4 md:px-6">
            <TabsContent value="general" className="mt-4 space-y-5 pb-6 md:space-y-6">
              <SettingRow
                label="Auto Save"
                description="Automatically save file changes"
              >
                <Switch
                  checked={settings.autoSave}
                  onCheckedChange={(v) => updateSettings({ autoSave: v })}
                />
              </SettingRow>

              <SettingRow
                label="Font Ligatures"
                description="Enable programming font ligatures"
              >
                <Switch
                  checked={settings.fontLigatures}
                  onCheckedChange={(v) => updateSettings({ fontLigatures: v })}
                />
              </SettingRow>

              <SettingRow
                label="Smooth Scrolling"
                description="Animate scrolling smoothly"
              >
                <Switch
                  checked={settings.smoothScrolling}
                  onCheckedChange={(v) => updateSettings({ smoothScrolling: v })}
                />
              </SettingRow>

              <SettingRow
                label="Bracket Pair Colorization"
                description="Colorize matching brackets"
              >
                <Switch
                  checked={settings.bracketPairColorization}
                  onCheckedChange={(v) => updateSettings({ bracketPairColorization: v })}
                />
              </SettingRow>
            </TabsContent>

            <TabsContent value="editor" className="mt-4 space-y-5 pb-6 md:space-y-6">
              <SettingRow
                label="Font Size"
                description={`${settings.fontSize}px`}
              >
                <div className="w-32 md:w-40">
                  <Slider
                    value={[settings.fontSize]}
                    onValueChange={(v) => updateSettings({ fontSize: v[0] })}
                    min={10}
                    max={24}
                    step={1}
                  />
                </div>
              </SettingRow>

              <SettingRow
                label="Tab Size"
                description="Spaces per tab"
              >
                <Select
                  value={String(settings.tabSize)}
                  onValueChange={(v) => updateSettings({ tabSize: Number(v) })}
                >
                  <SelectTrigger className="w-20 md:w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 4, 6, 8].map(n => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SettingRow>

              <SettingRow
                label="Word Wrap"
                description="Line wrap mode"
              >
                <Select
                  value={settings.wordWrap}
                  onValueChange={(v) => updateSettings({ wordWrap: v as 'on' | 'off' | 'wordWrapColumn' })}
                >
                  <SelectTrigger className="w-32 md:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on">On</SelectItem>
                    <SelectItem value="off">Off</SelectItem>
                    <SelectItem value="wordWrapColumn">Wrap Column</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>

              <SettingRow
                label="Line Numbers"
                description="Show line numbers"
              >
                <Select
                  value={settings.lineNumbers}
                  onValueChange={(v) => updateSettings({ lineNumbers: v as 'on' | 'off' | 'relative' })}
                >
                  <SelectTrigger className="w-28 md:w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on">On</SelectItem>
                    <SelectItem value="off">Off</SelectItem>
                    <SelectItem value="relative">Relative</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>

              <SettingRow
                label="Cursor Blinking"
                description="Blink animation"
              >
                <Select
                  value={settings.cursorBlinking}
                  onValueChange={(v) => updateSettings({ cursorBlinking: v as 'blink' | 'smooth' | 'phase' | 'expand' | 'solid' })}
                >
                  <SelectTrigger className="w-28 md:w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blink">Blink</SelectItem>
                    <SelectItem value="smooth">Smooth</SelectItem>
                    <SelectItem value="phase">Phase</SelectItem>
                    <SelectItem value="expand">Expand</SelectItem>
                    <SelectItem value="solid">Solid</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>

              <SettingRow
                label="Render Whitespace"
                description="Show whitespace"
              >
                <Select
                  value={settings.renderWhitespace}
                  onValueChange={(v) => updateSettings({ renderWhitespace: v as 'none' | 'boundary' | 'selection' | 'trailing' | 'all' })}
                >
                  <SelectTrigger className="w-28 md:w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="boundary">Boundary</SelectItem>
                    <SelectItem value="selection">Selection</SelectItem>
                    <SelectItem value="trailing">Trailing</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>

              <SettingRow
                label="Smooth Caret"
                description="Animate cursor movement"
              >
                <Switch
                  checked={settings.cursorSmoothCaretAnimation}
                  onCheckedChange={(v) => updateSettings({ cursorSmoothCaretAnimation: v })}
                />
              </SettingRow>

              <SettingRow
                label="Minimap"
                description="Show code minimap"
              >
                <Switch
                  checked={settings.minimap}
                  onCheckedChange={(v) => updateSettings({ minimap: v })}
                />
              </SettingRow>

              <SettingRow
                label="Font Family"
                description="Editor font family"
              >
                <Input
                  value={settings.fontFamily}
                  onChange={(e) => updateSettings({ fontFamily: e.target.value })}
                  className="w-48 md:w-64"
                />
              </SettingRow>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1">
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}
