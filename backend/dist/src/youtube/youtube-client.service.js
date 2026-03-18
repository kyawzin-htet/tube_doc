"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var YoutubeClientService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.YoutubeClientService = void 0;
const common_1 = require("@nestjs/common");
const youtubei_js_1 = require("youtubei.js");
const vm = __importStar(require("vm"));
let YoutubeClientService = YoutubeClientService_1 = class YoutubeClientService {
    logger = new common_1.Logger(YoutubeClientService_1.name);
    yt;
    async onModuleInit() {
        this.setupEvaluator();
        this.yt = await this.createClient();
    }
    async createClient() {
        const clientsToTry = [
            youtubei_js_1.ClientType.IOS,
            youtubei_js_1.ClientType.MWEB,
            youtubei_js_1.ClientType.TV,
        ];
        for (const client_type of clientsToTry) {
            try {
                const yt = await youtubei_js_1.Innertube.create({
                    client_type,
                    generate_session_locally: true,
                });
                this.logger.log(`YouTube Client initialized with ${client_type} client type`);
                return yt;
            }
            catch (err) {
                this.logger.warn(`Failed to initialize with ${client_type}: ${err.message}`);
            }
        }
        this.logger.warn('All preferred clients failed, falling back to default Innertube');
        return youtubei_js_1.Innertube.create();
    }
    setupEvaluator() {
        youtubei_js_1.Platform.shim.eval = (data, env) => {
            const context = {
                ...env,
                console,
                URL,
                URLSearchParams,
                atob: (str) => Buffer.from(str, 'base64').toString('binary'),
                btoa: (str) => Buffer.from(str, 'binary').toString('base64'),
                Uint8Array,
                TextEncoder,
                TextDecoder,
            };
            context.self = context;
            context.global = context;
            const vmContext = vm.createContext(context);
            try {
                vm.runInContext(data.output, vmContext);
            }
            catch (e) {
                this.logger.warn(`Eval script error (non-fatal): ${e.message}`);
            }
            const result = {};
            for (const key of data.exported) {
                if (typeof context[key] === 'function') {
                    try {
                        result[key] = context[key](env[key]);
                    }
                    catch (e) {
                        this.logger.warn(`Decipher fn error for ${key}: ${e.message}`);
                        result[key] = env[key];
                    }
                }
                else if (context[key] !== undefined) {
                    result[key] = context[key];
                }
                else {
                    result[key] = env[key];
                }
            }
            return result;
        };
    }
    async getClient() {
        if (!this.yt) {
            this.yt = await this.createClient();
        }
        return this.yt;
    }
};
exports.YoutubeClientService = YoutubeClientService;
exports.YoutubeClientService = YoutubeClientService = YoutubeClientService_1 = __decorate([
    (0, common_1.Injectable)()
], YoutubeClientService);
//# sourceMappingURL=youtube-client.service.js.map