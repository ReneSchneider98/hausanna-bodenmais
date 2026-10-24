import { Module } from '@nestjs/common';
import { ENV, type Env } from '../../config/env.js';
import { BookingsModule } from '../bookings/bookings.module.js';
import { ChannelSyncService } from './application/channel-sync.service.js';
import { CHANNEL_ADAPTER, type ChannelAdapter } from './domain/channel.port.js';
import { Beds24ChannelAdapter } from './infrastructure/beds24.adapter.js';
import { ChannelConnectionsRepository } from './infrastructure/channel-connections.repository.js';
import {
  AdminChannelsController,
  PublicChannelsController,
} from './presentation/channels.controller.js';

/** Hier wird der aktive Adapter gewählt – der Rest der App kennt nur den Port. */
export function createChannelAdapter(env: Env): ChannelAdapter | null {
  switch (env.CHANNEL_PROVIDER) {
    case 'beds24':
      return new Beds24ChannelAdapter(env.BEDS24_API_URL, env.BEDS24_REFRESH_TOKEN);
    default:
      return null;
  }
}

@Module({
  imports: [BookingsModule],
  controllers: [AdminChannelsController, PublicChannelsController],
  providers: [
    ChannelConnectionsRepository,
    ChannelSyncService,
    { provide: CHANNEL_ADAPTER, inject: [ENV], useFactory: createChannelAdapter },
  ],
  exports: [ChannelSyncService],
})
export class ChannelsModule {}
