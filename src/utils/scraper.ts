/**
 * Core scraping utility module for channel listing extraction
 * Provides a robust framework for scraping channel information from various providers
 * Features include:
 * - Automated browser setup and cleanup
 * - Request interception and resource blocking
 * - Retry mechanism with exponential backoff
 * - Channel name normalization
 * - Configurable error handling
 * - Structured output generation
 */

import playwright from 'playwright';
import randomUseragent from 'random-useragent';
import fs from 'fs';
import path from 'path';

/**
 * Represents a TV channel with its number and standardized name
 * @property {string} number - The channel number in the provider's lineup
 * @property {string} name - The standardized channel name across providers
 */
export interface Channel {
    number: string;
    name: string;
}

/**
 * Configuration for a provider-specific scraper
 * @property {string} url - The URL to scrape channel information from
 * @property {Function} scrapeFunction - Provider-specific function to extract channel data
 * @property {Record<string, string>} [overrides] - Channel name standardization mappings
 * @property {string} outputFile - Name of the JSON file to store results
 * @property {Function} [runCustom] - Optional custom run function for special cases
 */
export interface ScraperConfig {
    url: string;
    scrapeFunction: (page: playwright.Page) => Promise<Partial<Channel>[]>;
    overrides?: Record<string, string>;
    outputFile?: string;
    runCustom?: (options: { writeFiles: boolean }) => Promise<Channel[]>;
}

/**
 * Global configuration settings for the scraper
 * Includes browser settings, resource blocking, retry logic, and output configuration
 */
const CONFIG = {
    // Browser settings
    BROWSER: {
        HEADLESS: true,
        USER_AGENT: randomUseragent.getRandom(),
    },
    // Request interception
    BLOCKED_RESOURCES: ['image', 'stylesheet', 'font', 'media'] as const,
    // Retry settings
    RETRY: {
        ATTEMPTS: 1,
        DELAY: 1000, // Base delay in milliseconds
    },
    // Page load settings
    PAGE_LOAD: {
        TIMEOUT: 30000,
        WAIT_UNTIL: 'networkidle' as const,
    },
    // Output directory
    OUTPUT_DIR: '../data',
};

/**
 * Sets up a browser instance with custom configuration
 * @returns {Promise<{browser: playwright.Browser, context: playwright.BrowserContext}>}
 * @throws {Error} If browser initialization fails
 */
const setupBrowser = async () => {
    const browser = await playwright.chromium.launch({ 
        headless: CONFIG.BROWSER.HEADLESS 
    });
    const context = await browser.newContext({ 
        userAgent: CONFIG.BROWSER.USER_AGENT,
        bypassCSP: true
    });
    return { browser, context };
};

/**
 * Normalizes channel names to a standard format across providers
 * Handles special characters, whitespace, and common variations
 * @param {string} name - Raw channel name from provider
 * @returns {string} Normalized channel name
 */
const normalizeChannelName = (name: string): string => {
    return name
        .toUpperCase()
        .replace(/(?:\([^)]*\)|'|'|[^\w\s&+']|(?:\s+)|(?:\s*&\s*)|\s+\+1)/g, (match) => {
            if (match === '&' || match.includes('&')) return '&';
            if (match === "'" || match === "'") return "'";
            if (match.startsWith('(')) return '';
            if (match.includes('+1')) return '+1';
            if (match === ' ') return ' ';
            return '';
        })
        .replace(/\s+\+1/g, '+1')
        .replace(/\s+/g, ' ')
        .trim();
};

/**
 * Implements retry logic with exponential backoff
 * @template T - Return type of the function being retried
 * @param {() => Promise<T>} fn - Function to retry
 * @param {number} [retries] - Maximum number of retry attempts
 * @param {number} [delay] - Base delay between retries in milliseconds
 * @returns {Promise<T>} Result of the successful attempt
 * @throws {Error} If all retry attempts fail
 */
const retry = async <T>(
    fn: () => Promise<T>, 
    retries: number = CONFIG.RETRY.ATTEMPTS, 
    delay: number = CONFIG.RETRY.DELAY
): Promise<T> => {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            console.log(`Attempt ${i + 1} failed: ${(error as Error).message}`);
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
            } else {
                throw error;
            }
        }
    }
    throw new Error('Retry failed');
};

/**
 * Configures a page with request interception and navigation
 * @param {playwright.BrowserContext} context - Browser context to create page from
 * @param {string} url - URL to navigate to
 * @returns {Promise<playwright.Page>} Configured page instance
 */
const setupPage = async (context: playwright.BrowserContext, url: string): Promise<playwright.Page> => {
    const page = await context.newPage();

    // Block unnecessary resources to improve performance
    await page.route('**/*', (route) => {
        const request = route.request();
        route[CONFIG.BLOCKED_RESOURCES.includes(request.resourceType() as any) ? 'abort' : 'continue']();
    });

    await page.goto(url, {
        timeout: CONFIG.PAGE_LOAD.TIMEOUT,
        waitUntil: CONFIG.PAGE_LOAD.WAIT_UNTIL
    });

    return page;
};

/**
 * Writes channel data to a JSON file
 * Creates output directory if it doesn't exist
 * @param {Channel[]} output - Channel data to write
 * @param {string} filename - Name of the output file
 * @throws {Error} If file writing fails
 */
const writeOutputToFile = (output: Channel[], filename: string): void => {
    const outputPath = path.join(__dirname, '..', CONFIG.OUTPUT_DIR, filename);
    try {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    } catch (error) {
        console.error(`Error writing to file ${filename}:`, error);
        throw error;
    }
};

/**
 * Processes raw scraped data into standardized channel format
 * Applies name normalization and overrides
 * @param {Partial<Channel>[]} data - Raw channel data
 * @param {Record<string, string>} [overrides] - Channel name mappings
 * @returns {Channel[]} Processed channel list
 */
const processData = (
    data: Partial<Channel>[], 
    overrides: Record<string, string> = {}
): Channel[] => {
    return data
        .map(item => {
            if (!item?.name || !item?.number) return null;
            
            const normalizedName = normalizeChannelName(item.name);
            const finalName = overrides[normalizedName] || normalizedName;
            
            const channel: Channel = {
                number: item.number,
                name: finalName
            };
            
            return channel;
        })
        .filter((channel): channel is Channel => channel !== null);
};

/**
 * Executes a scraper with the given configuration
 * @param {ScraperConfig} config - Scraper configuration
 * @returns {Promise<Channel[]>} Array of scraped channels
 */
export async function runScraper(config: ScraperConfig): Promise<Channel[]> {
    const { browser, context } = await setupBrowser();
    try {
        const page = await setupPage(context, config.url);
        const data = await retry(() => config.scrapeFunction(page));
        const channels = processData(data, config.overrides);
        
        // Write to file if outputFile is specified
        if (config.outputFile) {
            writeOutputToFile(channels, config.outputFile);
        }
        
        return channels;
    } finally {
        await browser.close();
    }
}

/**
 * Parse command line arguments
 */
function parseArgs(): { writeFiles: boolean } {
    return {
        writeFiles: process.argv.includes('--files')
    };
}

/**
 * Execute a scraper configuration from the command line
 * Handles argument parsing and output formatting
 */
export async function runScraperCLI(config: ScraperConfig): Promise<void> {
    const { writeFiles } = parseArgs();
    
    try {
        let channels: Channel[];
        
        if (config.runCustom) {
            channels = await config.runCustom({ writeFiles });
        } else {
            // Remove outputFile from config if we're not writing to files
            const runConfig = {
                ...config,
                outputFile: writeFiles ? config.outputFile : undefined
            };
            channels = await runScraper(runConfig);
        }

        if (!writeFiles) {
            // Output JSON directly
            console.log(JSON.stringify(channels, null, 2));
        }
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
} 