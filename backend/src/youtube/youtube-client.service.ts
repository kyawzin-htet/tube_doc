import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Innertube, ClientType, Platform } from 'youtubei.js';
import * as vm from 'vm';

@Injectable()
export class YoutubeClientService implements OnModuleInit {
  private readonly logger = new Logger(YoutubeClientService.name);
  private yt: Innertube;

  async onModuleInit() {
    this.setupEvaluator();
    this.yt = await this.createClient();
  }

  private async createClient(): Promise<Innertube> {
    // Try clients in order — IOS avoids SABR and has no embeddability restriction
    const clientsToTry: ClientType[] = [
      ClientType.IOS,
      ClientType.MWEB,
      ClientType.TV,
    ];

    for (const client_type of clientsToTry) {
      try {
        const yt = await Innertube.create({
          client_type,
          generate_session_locally: true,
        });
        this.logger.log(`YouTube Client initialized with ${client_type} client type`);
        return yt;
      } catch (err) {
        this.logger.warn(`Failed to initialize with ${client_type}: ${err.message}`);
      }
    }

    // Absolute fallback — no options
    this.logger.warn('All preferred clients failed, falling back to default Innertube');
    return Innertube.create();
  }

  private setupEvaluator() {
    Platform.shim.eval = (data, env) => {
      const context: any = {
        ...env,
        console,
        URL,
        URLSearchParams,
        atob: (str: string) => Buffer.from(str, 'base64').toString('binary'),
        btoa: (str: string) => Buffer.from(str, 'binary').toString('base64'),
        Uint8Array,
        TextEncoder,
        TextDecoder,
      };
      context.self = context;
      context.global = context;

      const vmContext = vm.createContext(context);

      // Run the player script so it populates context with decipher functions
      try {
        vm.runInContext(data.output, vmContext);
      } catch (e) {
        this.logger.warn(`Eval script error (non-fatal): ${e.message}`);
      }

      // Collect exported keys: call functions with their env input, return raw values otherwise
      const result: Record<string, unknown> = {};
      for (const key of data.exported) {
        if (typeof context[key] === 'function') {
          try {
            result[key] = context[key](env[key]);
          } catch (e) {
            this.logger.warn(`Decipher fn error for ${key}: ${e.message}`);
            result[key] = env[key];
          }
        } else if (context[key] !== undefined) {
          result[key] = context[key];
        } else {
          result[key] = env[key];
        }
      }

      return result;
    };
  }

  async getClient(): Promise<Innertube> {
    if (!this.yt) {
      this.yt = await this.createClient();
    }
    return this.yt;
  }
}
