// Analytics and monitoring utilities
class Analytics {
    constructor() {
        this.events = [];
        this.sessionStart = Date.now();
    }
    
    // Track user events
    track(event, data = {}) {
        const eventData = {
            event,
            timestamp: Date.now(),
            sessionTime: Date.now() - this.sessionStart,
            url: window.location.pathname,
            userAgent: navigator.userAgent,
            ...data
        };
        
        this.events.push(eventData);
        console.log('📊 Analytics:', eventData);
        
        // Send to server (if analytics endpoint exists)
        if (this.shouldSendToServer(event)) {
            this.sendToServer(eventData);
        }
    }
    
    // Track performance metrics
    trackPerformance(metric, value, unit = 'ms') {
        this.track('performance', {
            metric,
            value,
            unit
        });
    }
    
    // Track errors
    trackError(error, context = '') {
        this.track('error', {
            message: error.message,
            stack: error.stack,
            context
        });
    }
    
    // Track conversion events
    trackConversion(stage, data = {}) {
        this.track('conversion', {
            stage, // 'started', 'preview', 'converting', 'completed', 'failed'
            ...data
        });
    }
    
    // Check if event should be sent to server
    shouldSendToServer(event) {
        const serverEvents = ['conversion', 'error', 'performance'];
        return serverEvents.includes(event.split('.')[0]);
    }
    
    // Send analytics data to server
    async sendToServer(data) {
        try {
            // Only send in production or if analytics endpoint is available
            if (process.env.NODE_ENV === 'development') return;
            
            await fetch('/api/analytics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } catch (error) {
            console.warn('Failed to send analytics:', error);
        }
    }
    
    // Get session summary
    getSessionSummary() {
        const duration = Date.now() - this.sessionStart;
        const eventCounts = {};
        
        this.events.forEach(event => {
            eventCounts[event.event] = (eventCounts[event.event] || 0) + 1;
        });
        
        return {
            duration,
            eventCount: this.events.length,
            eventCounts,
            events: this.events
        };
    }
}

// Initialize analytics
const analytics = new Analytics();

// Track page load performance
window.addEventListener('load', () => {
    const loadTime = performance.now();
    analytics.trackPerformance('page_load', Math.round(loadTime));
    
    // Track resource loading
    const resources = performance.getEntriesByType('resource');
    const slowResources = resources.filter(r => r.duration > 1000);
    
    if (slowResources.length > 0) {
        analytics.track('slow_resources', {
            count: slowResources.length,
            resources: slowResources.map(r => ({
                name: r.name,
                duration: Math.round(r.duration)
            }))
        });
    }
});

// Track errors globally
window.addEventListener('error', (event) => {
    analytics.trackError(event.error, 'global_error');
});

window.addEventListener('unhandledrejection', (event) => {
    analytics.trackError(new Error(event.reason), 'promise_rejection');
});

// Track user interactions
document.addEventListener('click', (event) => {
    if (event.target.matches('button, .btn, [role="button"]')) {
        analytics.track('button_click', {
            button: event.target.id || event.target.className || 'unknown',
            text: event.target.textContent?.substring(0, 50)
        });
    }
});

// Track form submissions
document.addEventListener('submit', (event) => {
    analytics.track('form_submit', {
        form: event.target.id || event.target.className || 'unknown'
    });
});

// Track beforeunload for session analytics
window.addEventListener('beforeunload', () => {
    const summary = analytics.getSessionSummary();
    
    // Send session summary
    if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/analytics/session', JSON.stringify(summary));
    }
});

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Analytics, analytics };
} else {
    window.Analytics = Analytics;
    window.analytics = analytics;
}
