import { EventEmitter } from 'node:events';
import { Global, Injectable, Logger, Module } from '@nestjs/common';

export interface DomainEventMap {
  /** Buchung neu/geändert/storniert – Kanäle (Beds24 …) synchronisieren */
  'booking.changed': { bookingId: string; reason: 'created' | 'updated' | 'cancelled' };
}

/** Kleiner In-Process-Event-Bus, entkoppelt Module (keine zirkulären Abhängigkeiten). */
@Injectable()
export class DomainEvents {
  private readonly emitter = new EventEmitter();
  private readonly logger = new Logger('DomainEvents');

  emit<K extends keyof DomainEventMap>(name: K, payload: DomainEventMap[K]): void {
    for (const listener of this.emitter.listeners(name)) {
      Promise.resolve()
        .then(() => (listener as (p: DomainEventMap[K]) => unknown)(payload))
        .catch((e: unknown) => this.logger.error(`${name}: ${String(e)}`));
    }
  }

  on<K extends keyof DomainEventMap>(name: K, fn: (payload: DomainEventMap[K]) => unknown): void {
    this.emitter.on(name, fn);
  }
}

@Global()
@Module({ providers: [DomainEvents], exports: [DomainEvents] })
export class DomainEventsModule {}
