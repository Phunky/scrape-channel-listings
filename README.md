# TV Channel Listings Scraper

A TypeScript-based tool for scraping TV channel listings from various providers:
- DIRECTV
- DISH Network
- Sky UK
- Virgin Media

## Features

- Parallel scraping with configurable concurrency
- Performance monitoring and statistics
- Error handling and detailed logging
- JSON output for each provider
- Individual provider scraping support

## Prerequisites

- Node.js 18+ and npm
- [Playwright](https://playwright.dev/) (installed automatically)

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd scrape-channel-listings
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Install Playwright browsers:
   ```bash
   npx playwright install chromium
   ```

## Usage

### Scrape All Providers

To scrape channel listings from all providers simultaneously:

```bash
npm run scrape
```

This will:
- Run scrapers in parallel (4 at a time by default)
- Save results in the `data` directory
- Display a summary of results including:
  - Total duration
  - Success rate
  - Total channels scraped
  - Any errors encountered

### Scrape Individual Providers

To scrape a specific provider:

```bash
npm run scrape:directv  # DIRECTV channels
npm run scrape:dish     # DISH Network channels
npm run scrape:sky      # Sky UK channels
npm run scrape:virgin   # Virgin Media channels
```

### Output

Results are saved as JSON files in the `data` directory:
- `directv.json`
- `dish.json`
- `sky.json`
- `virgin.json`

Each file contains an array of channel objects:
```json
[
  {
    "number": "1",
    "name": "CHANNEL NAME"
  }
]
```

## Configuration

The scraper can be configured using environment variables:

```bash
# Run with custom configuration
HEADLESS=false CONCURRENT_SCRAPERS=3 npm run scrape
```

Available environment variables:
- `HEADLESS`: Set to 'false' to see the browser while scraping (default: true)
- `CONCURRENT_SCRAPERS`: Number of scrapers to run in parallel (default: 2)
- `RETRY_ATTEMPTS`: Number of retry attempts for failed scrapes (default: 1)
- `RETRY_DELAY`: Delay between retries in milliseconds (default: 1000)
- `PAGE_TIMEOUT`: Page load timeout in milliseconds (default: 30000)
- `OUTPUT_DIR`: Directory to save results (default: 'data')

## Error Handling

The scraper will:
- Retry failed attempts based on `RETRY_ATTEMPTS` setting
- Log detailed error messages
- Continue with remaining providers if one fails
- Exit with code 1 if any scraper fails
- Provide error details in the final summary