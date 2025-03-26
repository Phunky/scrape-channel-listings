import { scrapeAllProviders, scrapeProvider } from '../index';
import { runScraper } from '../utils/scraper';

// Mock the scraper utility
jest.mock('../utils/scraper', () => ({
    runScraper: jest.fn()
}));

describe('scrapeAllProviders', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should scrape all providers and return provider channels', async () => {
        const mockChannels = [
            { number: '1', name: 'Channel 1' },
            { number: '2', name: 'Channel 2' }
        ];

        (runScraper as jest.Mock).mockResolvedValue(mockChannels);

        const result = await scrapeAllProviders();

        expect(result).toEqual([
            { provider: 'DIRECTV', channels: mockChannels },
            { provider: 'DISH', channels: mockChannels },
            { provider: 'SKY', channels: mockChannels },
            { provider: 'Virgin', channels: mockChannels }
        ]);
        expect(runScraper).toHaveBeenCalledTimes(4);
    });

    it('should return summary when writeFiles is true', async () => {
        const mockChannels = [
            { number: '1', name: 'Channel 1' },
            { number: '2', name: 'Channel 2' }
        ];

        (runScraper as jest.Mock).mockResolvedValue(mockChannels);

        const result = await scrapeAllProviders({ writeFiles: true });

        expect(result).toMatchObject({
            results: expect.arrayContaining([
                expect.objectContaining({
                    name: expect.any(String),
                    success: true,
                    duration: expect.any(Number),
                    channelCount: 2,
                    channels: mockChannels
                })
            ]),
            totalDuration: expect.any(Number),
            successRate: expect.any(String),
            totalChannels: 8,
            failedScrapers: []
        });
    });

    it('should handle failed scrapers', async () => {
        (runScraper as jest.Mock)
            .mockResolvedValueOnce([{ number: '1', name: 'Channel 1' }])
            .mockRejectedValueOnce(new Error('Failed'))
            .mockResolvedValueOnce([{ number: '2', name: 'Channel 2' }])
            .mockResolvedValueOnce([{ number: '3', name: 'Channel 3' }]);

        const result = await scrapeAllProviders({ writeFiles: true });

        expect(result).toMatchObject({
            results: expect.arrayContaining([
                expect.objectContaining({ success: true }),
                expect.objectContaining({ 
                    success: false,
                    error: expect.any(Error)
                }),
                expect.objectContaining({ success: true }),
                expect.objectContaining({ success: true })
            ]),
            failedScrapers: expect.arrayContaining([
                expect.objectContaining({ 
                    name: 'DISH',
                    success: false,
                    error: expect.any(Error)
                })
            ])
        });
    });
});

describe('scrapeProvider', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should scrape a specific provider', async () => {
        const mockChannels = [
            { number: '1', name: 'Channel 1' },
            { number: '2', name: 'Channel 2' }
        ];

        (runScraper as jest.Mock).mockResolvedValue(mockChannels);

        const result = await scrapeProvider('DIRECTV');

        expect(result).toEqual({
            name: 'DIRECTV',
            success: true,
            duration: expect.any(Number),
            channelCount: 2,
            channels: mockChannels
        });
        expect(runScraper).toHaveBeenCalledTimes(1);
    });

    it('should handle scraping errors', async () => {
        (runScraper as jest.Mock).mockRejectedValue(new Error('Failed'));

        const result = await scrapeProvider('DIRECTV');

        expect(result).toEqual({
            name: 'DIRECTV',
            success: false,
            duration: expect.any(Number),
            error: expect.any(Error)
        });
    });

    it('should throw error for unknown provider', async () => {
        await expect(scrapeProvider('UNKNOWN')).rejects.toThrow('Provider "UNKNOWN" not found');
        expect(runScraper).not.toHaveBeenCalled();
    });
}); 