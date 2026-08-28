import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { EventEmitter } from "events";

export type QueueEvent =
  | { type: "enqueue"; facilityId: number; patientId: number; at: number }
  | { type: "call_next"; facilityId: number; patientId: number; at: number }
  | { type: "complete"; facilityId: number; patientId: number; at: number }
  | { type: "transfer"; facilityId: number; patientId: number; targetFacilityId: number; at: number }
  | { type: "pause"; facilityId: number; patientId: number; at: number };

const CHANNEL_PREFIX = "queue:events:";

/**
 * Lightweight real-time bus for queue state changes.
 *
 * When Redis is configured+reachable it uses Redis pub/sub so multiple server
 * instances stay in sync; otherwise it falls back to an in-process EventEmitter
 * (single-instance dev/profile behaviour), matching the app's existing
 * "Redis or in-memory" pattern.
 */
@Injectable()
export class QueueRealtimeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueRealtimeService.name);
  private readonly emitter = new EventEmitter();
  private publisher: any = null;
  private subscriber: any = null;
  private subscribedChannels = new Set<string>();

  async onModuleInit() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      this.logger.log("QueueRealtimeService: no Redis — using in-process event bus");
      return;
    }
    try {
      const Redis = (await import("ioredis")).default;
      this.publisher = new Redis(redisUrl);
      this.subscriber = new Redis(redisUrl);
      this.logger.log("QueueRealtimeService: Redis pub/sub active");
    } catch (error) {
      this.logger.warn(`QueueRealtimeService: Redis unavailable (${error instanceof Error ? error.message : error}) — using in-process event bus`);
      this.publisher = null;
      this.subscriber = null;
    }
  }

  channel(facilityId: number): string {
    return `${CHANNEL_PREFIX}${facilityId}`;
  }

  /**
   * Publishes a queue event locally and (when Redis is on) to the channel so
   * every subscriber instance receives it.
   */
  async publish(event: QueueEvent) {
    const message = JSON.stringify(event);
    const channel = this.channel(event.facilityId);
    this.emitter.emit(channel, message);
    if (this.publisher) {
      try {
        await this.publisher.publish(channel, message);
      } catch (error) {
        this.logger.warn(`Failed to publish queue event: ${error instanceof Error ? error.message : error}`);
      }
    }
  }

  /**
   * Registers a callback for queue events on a facility channel.
   * Returns an unsubscribe function.
   */
  subscribe(facilityId: number, handler: (event: QueueEvent) => void): () => void {
    const channel = this.channel(facilityId);
    const onMessage = (raw: string) => {
      try {
        handler(JSON.parse(raw) as QueueEvent);
      } catch {
        /* ignore malformed */
      }
    };
    const localListener = (raw: string) => onMessage(raw);

    this.emitter.on(channel, localListener);
    if (this.subscriber && !this.subscribedChannels.has(channel)) {
      this.subscribedChannels.add(channel);
      this.subscriber.subscribe(channel);
      this.subscriber.on("message", (ch: string, message: string) => {
        if (ch === channel) onMessage(message);
      });
    }

    return () => {
      this.emitter.off(channel, localListener);
    };
  }

  async onModuleDestroy() {
    if (this.subscriber) {
      try { await this.subscriber.quit(); } catch { /* noop */ }
    }
    if (this.publisher) {
      try { await this.publisher.quit(); } catch { /* noop */ }
    }
    this.emitter.removeAllListeners();
  }
}
