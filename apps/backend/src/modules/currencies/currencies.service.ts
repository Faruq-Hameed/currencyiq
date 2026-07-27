import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository, Like, DataSource } from 'typeorm';
import axios from 'axios';
import { Currency } from './entities/currency.entity';
import { Banknote } from './entities/banknote.entity';
import { RedisService } from '../redis/redis.service';
import currencyMetadata from '../../data/currency-metadata.json';

const DAY = 86400;

/**
 * For currencies used by many countries, override flag with the issuing
 * authority's country code per spec section 5.
 */
const PRIMARY_FLAG_OVERRIDE: Record<string, string> = {
  EUR: 'eu',
  USD: 'us',
  XOF: 'sn',
  XAF: 'cm',
  AUD: 'au',
  NZD: 'nz',
};

function flagUrl(countryCode: string, size: 80 | 320 = 80): string {
  return `https://flagcdn.com/w${size}/${countryCode.toLowerCase()}.png`;
}

function resolveFlagUrl(code: string, countryCodes: string[]): string {
  const override = PRIMARY_FLAG_OVERRIDE[code];
  if (override) return flagUrl(override);
  const first = countryCodes[0];
  return first ? flagUrl(first) : '';
}

@Injectable()
export class CurrenciesService {
  private readonly logger = new Logger(CurrenciesService.name);

  constructor(
    @InjectRepository(Currency) private repo: Repository<Currency>,
    @InjectRepository(Banknote) private banknoteRepo: Repository<Banknote>,
    private redis: RedisService,
    private dataSource: DataSource,
    private config: ConfigService,
  ) {}

  // ─── Public API ──────────────────────────────────────────────────────────────

  async listAll(search?: string): Promise<Currency[]> {
    const cacheKey = `currency:list${search ? ':' + search.toLowerCase() : ''}`;
    const cached = await this.redis.getJson<Currency[]>(cacheKey);
    if (cached) return cached;

    const where = search
      ? [
          { code: Like(`%${search.toUpperCase()}%`), is_active: true },
          { name: Like(`%${search}%`), is_active: true },
        ]
      : [{ is_active: true }];

    const currencies = await this.repo.find({
      where,
      select: ['id', 'code', 'name', 'symbol', 'flag_url', 'is_active', 'currency_type'],
      order: { code: 'ASC' },
    });

    await this.redis.setJson(cacheKey, currencies, DAY);
    return currencies;
  }

  async findByCode(code: string): Promise<Currency> {
    const upper = code.toUpperCase();
    const cacheKey = `currency:info:${upper}`;
    const cached = await this.redis.getJson<Currency>(cacheKey);
    if (cached) return cached;

    const currency = await this.repo.findOne({
      where: { code: upper },
      relations: ['banknotes'],
    });
    if (!currency) throw new NotFoundException(`Currency ${upper} not found`);

    await this.redis.setJson(cacheKey, currency, DAY);
    return currency;
  }

  // ─── Seeding ──────────────────────────────────────────────────────────────

  async seedIfEmpty(): Promise<void> {
    const count = await this.repo.count();
    if (count === 0) {
      await this.seedFromRestCountries();
    }
  }

  /**
   * Full two-pass seed:
   *   9a. RestCountries → upsert base records (name, symbol, countries, flag_url)
   *   9b. Static metadata → enrich (central bank, regime, subunit, denominations)
   *   9c. Mark currencies not supported by any provider as is_active = false
   *   9d/e. Prime Redis list + individual caches
   */
  async seedFromRestCountries(): Promise<void> {
    this.logger.log('Pass 9a: fetching RestCountries…');

    let countries: any[] = [];
    const apiKey = this.config.get<string>('providers.restCountriesApiKey');
    if (!apiKey) {
      this.logger.warn('RESTCOUNTRIES_API_KEY not set — skipping pass 9a, will still run static enrichment');
    } else {
      try {
        // Free plan caps at 100 objects/request, so paginate via offset until `more` is false.
        const limit = 100;
        let offset = 0;
        for (;;) {
          const { data } = await axios.get('https://api.restcountries.com/countries/v5', {
            timeout: 20000,
            headers: { Authorization: `Bearer ${apiKey}` },
            params: {
              response_fields: 'names.common,codes.alpha_2,currencies,region,subregion',
              limit,
              offset,
            },
          });
          const objects = data?.data?.objects;
          if (!Array.isArray(objects)) {
            this.logger.error(`RestCountries returned an unexpected response — stopping pass 9a: ${JSON.stringify(data).slice(0, 300)}`);
            break;
          }
          countries.push(...objects);
          if (!data.data.meta?.more) break;
          offset += limit;
        }
      } catch (e) {
        this.logger.error('RestCountries fetch failed — skipping pass 9a, will still run static enrichment', e.message);
        countries = [];
      }
    }

    // Build currency map from RestCountries response
    if (countries.length > 0) {
      const currencyMap = new Map<
        string,
        { name: string; symbol: string | null; countries: string[]; country_codes: string[] }
      >();

      for (const country of countries) {
        if (!Array.isArray(country.currencies)) continue;
        for (const info of country.currencies as Array<{ code: string; name?: string; symbol?: string }>) {
          const code = info.code;
          if (!code) continue;
          if (!currencyMap.has(code)) {
            currencyMap.set(code, {
              name: info.name || code,
              symbol: info.symbol || null,
              countries: [],
              country_codes: [],
            });
          }
          const entry = currencyMap.get(code)!;
          if (country.names?.common) entry.countries.push(country.names.common);
          if (country.codes?.alpha_2) entry.country_codes.push(country.codes.alpha_2.toLowerCase());
        }
      }

      // 9a: Upsert base records
      for (const [code, data] of currencyMap.entries()) {
        const resolvedFlag = resolveFlagUrl(code, data.country_codes);
        await this.repo.upsert(
          {
            code,
            name: data.name,
            symbol: data.symbol ?? undefined,
            flag_url: resolvedFlag,
            countries: data.countries,
            country_codes: data.country_codes,
            currency_type: 'fiat',
            is_active: true,
          },
          ['code'],
        );
      }
      this.logger.log(`9a: upserted ${currencyMap.size} currencies from RestCountries`);
    }

    // 9b: Enrich from static metadata (array format)
    await this.enrichFromStaticMetadata();

    // 9c: Mark obscure/unsupported currencies inactive
    // Currencies not in RestCountries response are fine; any without a name get deactivated
    await this.repo
      .createQueryBuilder()
      .update(Currency)
      .set({ is_active: false })
      .where('name = code') // code used as fallback name means RestCountries had no info
      .execute();

    // 9d/e: Prime Redis caches
    await this.primeCaches();

    this.logger.log('Currency seeding complete');
  }

  /**
   * 9b — Enrich each record from the static JSON array.
   * Overwrites: central_bank, central_bank_url, exchange_regime, subunit, subunit_to_unit.
   * Replaces banknotes and coins.
   */
  async enrichFromStaticMetadata(): Promise<void> {
    this.logger.log('Pass 9b: enriching from static metadata…');
    const entries = currencyMetadata as Array<{
      code: string;
      central_bank?: string;
      central_bank_url?: string;
      exchange_regime?: string;
      subunit?: string;
      subunit_to_unit?: number;
      banknotes?: Array<{ denomination: number; label: string }>;
      coins?: Array<{ denomination: number; label: string }>;
    }>;

    for (const entry of entries) {
      await this.dataSource.transaction(async (em) => {
        // Update the currency row
        await em.update(
          Currency,
          { code: entry.code },
          {
            central_bank: entry.central_bank,
            central_bank_url: entry.central_bank_url,
            exchange_regime: entry.exchange_regime,
            subunit: entry.subunit,
            subunit_to_unit: entry.subunit_to_unit,
            is_active: true,
          },
        );

        const currency = await em.findOne(Currency, { where: { code: entry.code } });
        if (!currency) return;

        // Replace denominations atomically — delete old, insert fresh
        await em.delete(Banknote, { currency_id: currency.id });

        const denominations: Partial<Banknote>[] = [];
        for (const note of entry.banknotes ?? []) {
          denominations.push({ currency_id: currency.id, denomination: note.denomination, label: note.label, type: 'note' });
        }
        for (const coin of entry.coins ?? []) {
          denominations.push({ currency_id: currency.id, denomination: coin.denomination, label: coin.label, type: 'coin' });
        }
        if (denominations.length > 0) {
          await em.insert(Banknote, denominations);
        }
      });
    }
    this.logger.log(`9b: enriched ${entries.length} currencies`);
  }

  /**
   * 9d/e — Prime Redis list cache and per-currency caches.
   */
  private async primeCaches(): Promise<void> {
    this.logger.log('Priming Redis currency caches…');

    const allActive = await this.repo.find({
      where: { is_active: true },
      select: ['id', 'code', 'name', 'symbol', 'flag_url', 'is_active', 'currency_type'],
      order: { code: 'ASC' },
    });
    await this.redis.setJson('currency:list', allActive, DAY);

    // Cache full detail (with banknotes) for each enriched currency
    const enrichedCodes = (currencyMetadata as Array<{ code: string }>).map((e) => e.code);
    await Promise.all(
      enrichedCodes.map(async (code) => {
        try {
          const full = await this.repo.findOne({ where: { code }, relations: ['banknotes'] });
          if (full) {
            await this.redis.setJson(`currency:info:${code}`, full, DAY);
          }
        } catch {
          // Non-critical
        }
      }),
    );
    this.logger.log(`Cached ${allActive.length} currencies in Redis`);
  }
}
