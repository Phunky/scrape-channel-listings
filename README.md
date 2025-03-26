# Scrape Channel Listings

A TypeScript library for scraping TV channel listings from various providers:
- DIRECTV
- DISH Network
- Sky UK
- Virgin Media

This project started as a proof-of-concept for scraping TV channel listings from various providers. The codebase has been significantly improved with the assistance of Cursor AI

## Features

- Parallel scraping with configurable concurrency
- Performance monitoring and statistics
- Error handling and detailed logging
- JSON output by default
- Optional file output for each provider
- Individual provider scraping support
- Available as both a library and CLI tool

## Prerequisites

This package requires Playwright with Chromium browser for web scraping. After installing the package, you'll need to install Playwright's Chromium browser:

```bash
# Install the package
npm install @phunky/scrape-channel-listings

# Install Playwright's Chromium browser
npx playwright install chromium
```

## Data Sources

The channel listings are scraped from the following sources:

- DIRECTV: [usdirect.com/channels](https://www.usdirect.com/channels)
- DISH Network: [allconnect.com/providers/dish/channel-guide](https://www.allconnect.com/providers/dish/channel-guide)
- Sky UK: [rxtvinfo.com/sky-channel-list-uk](https://rxtvinfo.com/sky-channel-list-uk/)
- Virgin Media UK: [rxtvinfo.com/virgin-media-channel-list-uk](https://rxtvinfo.com/virgin-media-channel-list-uk/)

Please note that these sources are third-party websites and may change without notice. The scrapers are maintained to work with the current structure of these sites, but may need updates if the source websites undergo significant changes.

## Installation

```bash
npm install @phunky/scrape-channel-listings
```

## Usage

### As a Library

```typescript
import { scrapeAllProviders, scrapeProvider, type Channel, type ScrapingSummary } from '@phunky/scrape-channel-listings';

// Scrape all providers
const channels = await scrapeAllProviders();
console.log(channels); // Array of { provider: string, channels: Channel[] }

// Scrape with options
const summary = await scrapeAllProviders({
    writeFiles: true, // Write results to files
    maxConcurrent: 2  // Limit concurrent scrapers
});
console.log(summary); // ScrapingSummary object

// Scrape a specific provider
const result = await scrapeProvider('DIRECTV');
console.log(result); // ScraperResult object
```

### As a CLI Tool

```bash
# Scrape all providers
npx @phunky/scrape-channel-listings

# Scrape specific providers
npx @phunky/scrape-channel-listings --provider DIRECTV
npx @phunky/scrape-channel-listings --provider DISH
npx @phunky/scrape-channel-listings --provider SKY
npx @phunky/scrape-channel-listings --provider Virgin

# Write results to files
npx @phunky/scrape-channel-listings --write-files

# Control concurrent scrapers
npx @phunky/scrape-channel-listings --max-concurrent 4
```

## API Reference

### Types

```typescript
interface Channel {
    number: string;
    name: string;
}

interface ProviderChannels {
    provider: string;
    channels: Channel[];
}

interface ScraperResult {
    name: string;
    success: boolean;
    duration: number;
    channelCount?: number;
    error?: Error;
    channels?: Channel[];
}

interface ScrapingOptions {
    writeFiles?: boolean;
    maxConcurrent?: number;
}

interface ScrapingSummary {
    results: ScraperResult[];
    totalDuration: number;
    successRate: string;
    totalChannels: number;
    failedScrapers: ScraperResult[];
}
```

### Functions

#### `scrapeAllProviders(options?: ScrapingOptions): Promise<ProviderChannels[] | ScrapingSummary>`

Scrapes channel listings from all configured providers. Returns either an array of provider channels or a summary object depending on the `writeFiles` option.

#### `scrapeProvider(providerName: string, options?: ScrapingOptions): Promise<ScraperResult>`

Scrapes channel listings from a specific provider. Throws an error if the provider is not found.

## Configuration

The scraper can be configured using environment variables:

```bash
# Run with custom configuration
HEADLESS=false CONCURRENT_SCRAPERS=2 npm run scrape
```

Available environment variables:
- `HEADLESS`: Set to 'false' to see the browser while scraping (default: true)
- `CONCURRENT_SCRAPERS`: Number of scrapers to run in parallel (default: 4) 
- `RETRY_ATTEMPTS`: Number of retry attempts for failed scrapes (default: 3)
- `RETRY_DELAY`: Delay between retries in milliseconds (default: 2000)
- `PAGE_TIMEOUT`: Page load timeout in milliseconds (default: 60000)
- `OUTPUT_DIR`: Directory to save results when using --files (default: 'data')

## Error Handling

The scraper will:
- Retry failed attempts based on `RETRY_ATTEMPTS` setting
- Log detailed error messages
- Continue with remaining providers if one fails
- Exit with code 1 if any scraper fails
- Provide error details in the final summary (when using --files)

## Development

```bash
# Install dependencies
npm install

# Build the package
npm run build

# Run tests
npm test

# Run specific scraper
npm run scrape:directv
npm run scrape:dish
npm run scrape:sky
npm run scrape:virgin
```

## License

ISC
