import { EventEmitter } from "node:events"
import type { PipelineWSEvent } from "@marionette/shared"

export class PipelineEventBus extends EventEmitter {
  /** Emit a typed pipeline event to all listeners. */
  emitEvent(event: PipelineWSEvent): void {
    this.emit("pipeline:event", event)
  }

  /** Subscribe to pipeline events. */
  onEvent(handler: (event: PipelineWSEvent) => void): void {
    this.on("pipeline:event", handler)
  }
}
