import { Global, Module } from '@nestjs/common';
import { EVENT_LOG } from './domain/event-log.port.js';
import { MongoEventLogAdapter } from './infrastructure/mongo-event-log.adapter.js';
import { EventsController } from './presentation/events.controller.js';

@Global()
@Module({
  controllers: [EventsController],
  providers: [{ provide: EVENT_LOG, useClass: MongoEventLogAdapter }],
  exports: [EVENT_LOG],
})
export class EventsModule {}
