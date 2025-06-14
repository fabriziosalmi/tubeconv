const request = require('supertest');
const app = require('../server');

describe('TubeConv API', () => {
    // Health and Status Tests
    describe('GET /api/health', () => {
        it('should return comprehensive health status', async () => {
            const res = await request(app)
                .get('/api/health')
                .expect(200);
            
            expect(res.body).toHaveProperty('status');
            expect(res.body).toHaveProperty('timestamp');
            expect(res.body).toHaveProperty('uptime');
            expect(res.body).toHaveProperty('memory');
            expect(res.body).toHaveProperty('dependencies');
            expect(['OK', 'DEGRADED', 'ERROR']).toContain(res.body.status);
        });
    });

    describe('GET /api/status', () => {
        it('should return API status information', async () => {
            const res = await request(app)
                .get('/api/status')
                .expect(200);
            
            expect(res.body).toHaveProperty('service', 'TubeConv API');
            expect(res.body).toHaveProperty('version', '1.0.0');
            expect(res.body).toHaveProperty('status', 'operational');
            expect(res.body).toHaveProperty('endpoints');
        });
    });

    // Preview Tests
    describe('POST /api/preview', () => {
        it('should return error for missing URL', async () => {
            const res = await request(app)
                .post('/api/preview')
                .send({})
                .expect(400);
            
            expect(res.body).toHaveProperty('success', false);
            expect(res.body).toHaveProperty('error', 'YouTube URL is required');
            expect(res.body).toHaveProperty('code', 'MISSING_URL');
        });

        it('should return error for invalid URL', async () => {
            const res = await request(app)
                .post('/api/preview')
                .send({ url: 'not-a-valid-url' })
                .expect(400);
            
            expect(res.body).toHaveProperty('success', false);
            expect(res.body).toHaveProperty('error', 'Invalid YouTube URL provided');
            expect(res.body).toHaveProperty('code', 'INVALID_URL');
        });

        it('should return error for non-YouTube URL', async () => {
            const res = await request(app)
                .post('/api/preview')
                .send({ url: 'https://example.com' })
                .expect(400);
            
            expect(res.body).toHaveProperty('success', false);
            expect(res.body).toHaveProperty('code', 'INVALID_URL');
        });

        // Note: This test requires a real YouTube URL and network access
        it.skip('should return video info for valid URL', async () => {
            const res = await request(app)
                .post('/api/preview')
                .send({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
                .expect(200);
            
            expect(res.body).toHaveProperty('success', true);
            expect(res.body).toHaveProperty('videoTitle');
            expect(res.body).toHaveProperty('thumbnailUrl');
            expect(res.body).toHaveProperty('duration');
            expect(res.body).toHaveProperty('channel');
            expect(res.body).toHaveProperty('processingTime');
        });
    });

    // Conversion Tests
    describe('POST /api/convert', () => {
        it('should return error for missing URL', async () => {
            const res = await request(app)
                .post('/api/convert')
                .send({})
                .expect(400);
            
            expect(res.body).toHaveProperty('success', false);
            expect(res.body).toHaveProperty('error', 'YouTube URL is required');
            expect(res.body).toHaveProperty('code', 'MISSING_URL');
        });

        it('should return error for invalid audio quality', async () => {
            const res = await request(app)
                .post('/api/convert')
                .send({ 
                    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                    audioQuality: '999'
                })
                .expect(400);
            
            expect(res.body).toHaveProperty('success', false);
            expect(res.body).toHaveProperty('code', 'INVALID_QUALITY');
        });

        it('should return error for too long title', async () => {
            const longTitle = 'a'.repeat(101);
            const res = await request(app)
                .post('/api/convert')
                .send({ 
                    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                    metadata: { title: longTitle }
                })
                .expect(400);
            
            expect(res.body).toHaveProperty('success', false);
            expect(res.body).toHaveProperty('code', 'TITLE_TOO_LONG');
        });

        it('should return error for too long artist name', async () => {
            const longArtist = 'a'.repeat(101);
            const res = await request(app)
                .post('/api/convert')
                .send({ 
                    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                    metadata: { artist: longArtist }
                })
                .expect(400);
            
            expect(res.body).toHaveProperty('success', false);
            expect(res.body).toHaveProperty('code', 'ARTIST_TOO_LONG');
        });

        // Note: This test requires a real YouTube URL and network access
        it.skip('should successfully convert a video', async () => {
            const res = await request(app)
                .post('/api/convert')
                .send({ 
                    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                    audioQuality: '128',
                    metadata: {
                        title: 'Test Title',
                        artist: 'Test Artist'
                    }
                })
                .expect(200);
            
            expect(res.body).toHaveProperty('success', true);
            expect(res.body).toHaveProperty('requestId');
            expect(res.body).toHaveProperty('videoTitle');
            expect(res.body).toHaveProperty('downloadUrl');
            expect(res.body).toHaveProperty('audioQuality', '128');
            expect(res.body).toHaveProperty('processingTime');
        }, 60000); // 60 second timeout for conversion
    });

    // Rate Limiting Tests
    describe('Rate Limiting', () => {
        it('should apply rate limiting to conversion endpoint', async () => {
            // Make multiple requests to trigger rate limit
            const requests = Array(6).fill().map(() => 
                request(app)
                    .post('/api/convert')
                    .send({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
            );

            const responses = await Promise.all(requests);
            const rateLimitedResponses = responses.filter(res => res.status === 429);
            
            expect(rateLimitedResponses.length).toBeGreaterThan(0);
        });
    });

    // Error Handling Tests
    describe('Error Handling', () => {
        it('should handle malformed JSON gracefully', async () => {
            const res = await request(app)
                .post('/api/preview')
                .set('Content-Type', 'application/json')
                .send('invalid json')
                .expect(400);
        });

        it('should return proper error structure', async () => {
            const res = await request(app)
                .post('/api/preview')
                .send({ url: 'invalid' })
                .expect(400);
            
            expect(res.body).toHaveProperty('success', false);
            expect(res.body).toHaveProperty('error');
            expect(res.body).toHaveProperty('code');
        });
    });
});
