import { Copy, ImagePlus, RefreshCw, X } from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import { BUILDER_PRESETS, type BuilderPreset } from "@/lib/builder-presets";
import { calcCostUsd, formatCost, type Usage } from "@/lib/builder-cost";
import { getModel, MODELS } from "@/lib/builder-models";

export interface BuilderMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  usage?: Usage;
  fromCache?: boolean;
  fallbackFrom?: string;
  imageDataUrl?: string;
}

interface Props {
  messages: BuilderMessage[];
  input: string;
  onInputChange: (value: string) => void;
  isStreaming: boolean;
  attachedImage: string | null;
  onAttachClick: () => void;
  onRemoveAttachment: () => void;
  onSubmit: () => void;
  onStop: () => void;
  model: string;
  onModelChange: (model: string) => void;
  preset: string;
  onPresetChange: (preset: string) => void;
  currentPreset?: BuilderPreset;
  selectedEl: { tag: string; classes: string; text: string } | null;
  onAskSelection: () => void;
  onClearSelection: () => void;
  onRetryMessage: (messageId: string) => void;
  mistralStatus?: "secret" | "byok" | "missing";
}

export default function BuilderChatPanel({
  messages,
  input,
  onInputChange,
  isStreaming,
  attachedImage,
  onAttachClick,
  onRemoveAttachment,
  onSubmit,
  onStop,
  model,
  onModelChange,
  preset,
  onPresetChange,
  currentPreset,
  selectedEl,
  onAskSelection,
  onClearSelection,
  onRetryMessage,
  mistralStatus = "missing",
}: Props) {
  const copyMessage = (content: string) => navigator.clipboard.writeText(content);

  return (
    <section className="flex h-full min-h-0 flex-col bg-background" aria-label="AI chat">
      <Conversation className="min-h-0">
        <ConversationContent className="mx-auto w-full max-w-3xl gap-5 px-4 py-6 md:px-6">
          {messages.length <= 1 && currentPreset && (
            <div className="space-y-3 pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-foreground">Start building</p>
                  <p className="text-[11px] text-muted-foreground">Choose a prompt or describe your own interface.</p>
                </div>
                <span className="text-[10px] font-mono text-primary">{currentPreset.label}</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {currentPreset.examplePrompts.map((example) => (
                  <Button
                    key={example}
                    type="button"
                    variant="outline"
                    onClick={() => onInputChange(example)}
                    className="h-auto min-h-20 items-start justify-start whitespace-normal p-3 text-left text-xs font-normal leading-relaxed text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
                  >
                    {example}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <Message key={message.id} from={message.role} className="max-w-full">
              <MessageContent
                className={message.role === "user"
                  ? "max-w-[88%] bg-primary px-3 py-2 text-primary-foreground"
                  : "w-full max-w-full px-0 py-0"}
              >
                {message.imageDataUrl && (
                  <img
                    src={message.imageDataUrl}
                    alt="Attached visual reference"
                    className="mb-2 max-h-48 rounded-md border border-border object-contain"
                  />
                )}
                {isStreaming && message.id === "streaming" && !message.content ? (
                  <Shimmer className="text-sm">Thinking…</Shimmer>
                ) : (
                  <MessageResponse className="text-sm leading-relaxed">{message.content}</MessageResponse>
                )}
                {message.usage && (
                  <div className="mt-2 flex flex-wrap gap-x-2 border-t border-border/50 pt-2 text-[10px] font-mono text-muted-foreground">
                    <span>{(message.usage.latencyMs / 1000).toFixed(2)}s</span>
                    <span>{message.usage.promptTokens + message.usage.completionTokens} tok</span>
                    <span>{formatCost(calcCostUsd(message.usage))}</span>
                    <span>{getModel(message.usage.model)?.label}</span>
                    {message.fromCache && <span>cache</span>}
                    {message.fallbackFrom && <span>fallback: {getModel(message.fallbackFrom)?.label}</span>}
                  </div>
                )}
              </MessageContent>
              {message.role === "assistant" && index > 0 && message.id !== "streaming" && (
                <MessageActions className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                  <MessageAction tooltip="Copy response" onClick={() => copyMessage(message.content)}>
                    <Copy className="size-3.5" />
                  </MessageAction>
                  <MessageAction tooltip="Use the previous prompt again" onClick={() => onRetryMessage(message.id)}>
                    <RefreshCw className="size-3.5" />
                  </MessageAction>
                </MessageActions>
              )}
            </Message>
          ))}
        </ConversationContent>
        <ConversationScrollButton className="bottom-3" />
      </Conversation>

      <div className="border-t border-border bg-background px-3 py-3 md:px-5">
        {selectedEl && (
          <div className="mx-auto mb-2 flex max-w-3xl items-center justify-between gap-2 border border-primary/30 bg-primary/5 px-3 py-2 text-[11px]">
            <span className="truncate font-mono text-primary">&lt;{selectedEl.tag}&gt; {selectedEl.text.slice(0, 48)}</span>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={onAskSelection}>Ask AI</Button>
              <Button size="icon-sm" variant="ghost" onClick={onClearSelection} aria-label="Clear selection"><X /></Button>
            </div>
          </div>
        )}
        <PromptInput
          onSubmit={() => onSubmit()}
          accept="image/*"
          maxFiles={1}
          maxFileSize={4 * 1024 * 1024}
          className="mx-auto max-w-3xl rounded-lg border-border bg-card shadow-card focus-within:border-primary/50"
        >
          {attachedImage && (
            <div className="mx-3 mt-3 flex items-start gap-2">
              <div className="relative">
                <img src={attachedImage} alt="Selected attachment" className="h-16 w-20 rounded-md border border-border object-cover" />
                <Button type="button" size="icon-sm" variant="destructive" onClick={onRemoveAttachment} className="absolute -right-2 -top-2 h-5 w-5" aria-label="Remove attachment">
                  <X className="size-3" />
                </Button>
              </div>
            </div>
          )}
          <PromptInputTextarea
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            placeholder="Describe what to build or change…"
            disabled={isStreaming}
            className="min-h-24 px-3 font-mono text-sm"
          />
          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputButton type="button" tooltip="Attach image" onClick={onAttachClick}>
                <ImagePlus className="size-4" />
              </PromptInputButton>
              <PromptInputSelect value={preset} onValueChange={onPresetChange}>
                <PromptInputSelectTrigger className="h-8 w-auto max-w-32 text-[11px]">
                  <PromptInputSelectValue />
                </PromptInputSelectTrigger>
                <PromptInputSelectContent>
                  {BUILDER_PRESETS.map((item) => <PromptInputSelectItem key={item.id} value={item.id}>{item.label}</PromptInputSelectItem>)}
                </PromptInputSelectContent>
              </PromptInputSelect>
              <PromptInputSelect value={model} onValueChange={onModelChange}>
                <PromptInputSelectTrigger className="h-8 w-auto max-w-44 text-[11px]">
                  <PromptInputSelectValue />
                </PromptInputSelectTrigger>
                <PromptInputSelectContent>
                  {MODELS.map((item) => (
                    <PromptInputSelectItem key={item.id} value={item.id} disabled={item.provider === "mistral" && mistralStatus === "missing"}>
                      {item.label}
                      {item.provider === "mistral" && (
                        <span className="ml-2 text-[10px] text-muted-foreground">
                          {mistralStatus === "byok" ? "· BYOK" : mistralStatus === "secret" ? "· aktívny" : "· bez kľúča"}
                        </span>
                      )}
                    </PromptInputSelectItem>
                  ))}
                </PromptInputSelectContent>
              </PromptInputSelect>
            </PromptInputTools>
            <PromptInputSubmit
              status={isStreaming ? "streaming" : "ready"}
              onStop={onStop}
              disabled={!isStreaming && !input.trim() && !attachedImage}
              className="shrink-0"
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </section>
  );
}