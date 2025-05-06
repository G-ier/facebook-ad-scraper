// @ts-nocheck
const BaseScraper = require('./BaseScraper');
const { waitForPageLoad } = require('../../utils/scraping-helpers');

/**
 * Facebook Ad Library Scraper
 * Extracts ad information from Facebook Ad Library pages
 */
class FacebookScraper extends BaseScraper {
    constructor(config) {
        super(config);
        this.htmlContent = null;

        // Common button texts for call-to-action detection
        this.buttonTexts = [
            "Learn more",
            "Learn More",
            "Apply now",
            "Apply Now",
            "Visit Instagram profile",
            "Book now",
            "Book Now",
            "Download",
            "Sign up",
            "Sign Up",
            "Get quote",
            "Get Quote",
            "Send WhatsApp message",
            "Send message",
            "Send Message",
            "Get offer",
            "Get Offer",
            "Call now",
            "Call Now",
            "Contact us",
            "Contact Us",
            "Apply now",
            "Apply Now",
        ];
    }

    /**
     * Main scraping method - navigates to ad page and extracts data
     */
    async scrapeRawContent() {
        try {
            await this.page.goto(this.config.url, {
                waitUntil: 'networkidle0',
                timeout: this.config.browser.timeout
            });

            await waitForPageLoad(this.page);
            this.htmlContent = await this.page.content();

            const adData = await this.extractAdData();
            console.log('Extraction complete');
            console.log(adData);
            return adData;
        } catch (error) {
            console.error('Error scraping Facebook content:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Extracts structured ad data from the Facebook Ad Library
     */
    async extractAdData() {
        try {
            // Find the ad container element
            const result = await this.page.evaluate(() => {
                const targetText = 'This ad is from a URL link';
                const element = Array.from(document.querySelectorAll('div'))
                    .find(el => el.textContent && el.textContent.includes(targetText));

                if (!element) {
                    return {
                        found: false,
                        message: 'Target text not found in any div element'
                    };
                }

                return {
                    found: true,
                    text: element.textContent.trim(),
                    html: element.outerHTML
                };
            });

            // Initialize the structured ad data object
            const adData = {
                success: result.found,
                type: 'unknown',
                libraryId: null,
                media: {
                    type: null,
                    url: null
                },
                advertiser: {
                    name: null,
                    avatar: null
                },
                content: {
                    html: null
                },
                runningInfo: {
                    startDate: null,
                    activeTime: null
                },
                callToAction: {
                    url: null,
                    type: null,
                    text: null
                },
                platforms: []
            };

            if (!result.found) {
                return adData;
            }

            // First, extract common data for all ad types
            const libraryId = await this.extractLibraryId(result.html);
            if (libraryId) adData.libraryId = libraryId;

            const runningInfo = await this.extractRunningInfo(result.html);
            if (runningInfo.startDate) {
                adData.runningInfo.startDate = runningInfo.startDate;
                adData.runningInfo.activeTime = runningInfo.activeTime;
            }

            const advertiserInfo = await this.extractAdvertiserInfo(result.html);
            if (advertiserInfo.name) adData.advertiser.name = advertiserInfo.name;
            if (advertiserInfo.avatar) adData.advertiser.avatar = advertiserInfo.avatar;

            const platforms = await this.detectPlatforms(result.html);
            if (platforms && platforms.length > 0) adData.platforms = platforms;

            // Check if this is a slider ad
            const sliderResult = await this.findSliderAd(result.html);
            if (sliderResult.isSlider) {
                console.log(`Found slider ad with type: ${sliderResult.mediaType}`);
                adData.type = `slider-${sliderResult.mediaType}`;
                adData.media.type = `slider-${sliderResult.mediaType}`;

                // Extract slider-specific content
                const sliderDescription = await this.extractSliderAdDescription(result.html);
                if (sliderDescription) adData.content.html = sliderDescription.html;

                // Extract slider media based on type
                if (sliderResult.mediaType === 'video') {
                    const sliderVideos = await this.extractSliderVideoAds(result.html);
                    adData.media.items = sliderVideos || [];
                } else if (sliderResult.mediaType === 'image') {
                    const sliderImages = await this.extractSliderImageAds(result.html);
                    adData.media.items = sliderImages || [];
                }

                
            } else {
                // Handle standard video or image ads
                const videoInfo = await this.findVideoUrl(result.html);
                if (videoInfo && videoInfo.src) {
                    adData.type = 'video';
                    adData.media.type = 'video';
                    adData.media.url = videoInfo.src;
                    if (videoInfo.poster) {
                        adData.media.posterUrl = videoInfo.poster;
                    }
                } else {
                    const imageUrl = await this.findImageUrl(result.html);
                    if (imageUrl) {
                        adData.type = 'image';
                        adData.media.type = 'image';
                        adData.media.url = imageUrl;
                    }
                }

                // Extract description for standard ads
                const descriptionResult = await this.extractAdDescription(result.html, adData.type);
                if (descriptionResult) adData.content.html = descriptionResult.html;

                // Extract call-to-action for standard ads
                const callToAction = await this.extractCallToAction(result.html, adData.type);
                if (callToAction.text) adData.callToAction.text = callToAction.text;
                if (callToAction.url) adData.callToAction.url = callToAction.url;
                if (callToAction.type) adData.callToAction.type = callToAction.type;
            }

            return adData;
        } catch (error) {
            console.error('Error in extractAdData:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async findSliderAd(html) {
        try {
            const sliderResult = await this.page.evaluate((htmlContent) => {
                const tempContainer = document.createElement('div');
                tempContainer.innerHTML = htmlContent;

                // Look for navigation buttons that indicate a slider
                const prevButton = tempContainer.querySelector('div[aria-label="Previous items"]');
                const nextButton = tempContainer.querySelector('div[aria-label="Next items"]');

                // Default result
                const result = {
                    isSlider: false,
                    mediaType: null
                };

                // If not a slider, return early
                if (!prevButton || !nextButton) {
                    return result;
                }

                // It is a slider, now determine if it contains videos or images
                result.isSlider = true;

                // Check if there's a video element in the slider
                const videoElement = tempContainer.querySelector('video');
                if (videoElement) {
                    result.mediaType = 'video';
                } else {
                    // If no video, assume it's image-based
                    result.mediaType = 'image';
                }

                return result;
            }, html);

            return sliderResult;
        } catch (error) {
            return { isSlider: false, mediaType: null };
        }
    }

    async findVideoUrl(html) {
        try {
            const videoInfo = await this.page.evaluate((htmlContent) => {
                const tempContainer = document.createElement('div');
                tempContainer.innerHTML = htmlContent;

                const videoElement = tempContainer.querySelector('video');
                if (videoElement) {
                    return {
                        src: videoElement.src || null,
                        poster: videoElement.poster || null
                    };
                }
                return null;
            }, html);
            return videoInfo;
        } catch (error) {
            console.error('Error finding video URL:', error);
            return null;
        }
    }

    async findImageUrl(html) {
        try {
            const imageUrl = await this.page.evaluate((htmlContent) => {
                const tempContainer = document.createElement('div');
                tempContainer.innerHTML = htmlContent;

                // Find the "Sponsored" text element
                const sponsoredElements = Array.from(tempContainer.querySelectorAll('*'))
                    .filter(el => el.textContent && el.textContent.trim() === 'Sponsored');

                if (sponsoredElements.length > 0) {
                    const sponsoredElement = sponsoredElements[0];
                    const allElements = Array.from(tempContainer.querySelectorAll('*'));
                    const sponsoredIndex = allElements.indexOf(sponsoredElement);

                    if (sponsoredIndex === -1) return null;

                    // Find the first image after the sponsored element
                    for (let i = sponsoredIndex + 1; i < allElements.length; i++) {
                        const element = allElements[i];

                        if (element.tagName.toLowerCase() === 'img' && element.src) {
                            return element.src;
                        }

                        const img = element.querySelector('img');
                        if (img && img.src) {
                            return img.src;
                        }
                    }
                }
                return null;
            }, html);

            return imageUrl;
        } catch (error) {
            console.error('Error finding image URL:', error);
            return null;
        }
    }

    async extractLibraryId(html) {
        try {
            const libraryId = await this.page.evaluate((htmlContent) => {
                const tempContainer = document.createElement('div');
                tempContainer.innerHTML = htmlContent;
                const content = tempContainer.textContent;
                const regex = /Library ID: (\d+)/;
                const matches = content.match(regex);
                return matches && matches[1] ? matches[1].trim() : null;
            }, html);

            return libraryId;
        } catch (error) {
            console.error('Error extracting Library ID:', error);
            return null;
        }
    }

    async extractRunningInfo(html) {
        try {
            const runningInfo = await this.page.evaluate((htmlContent) => {
                const tempContainer = document.createElement('div');
                tempContainer.innerHTML = htmlContent;
                const content = tempContainer.textContent;

                const dateRegex = /Started running on ([A-Za-z]+ \d+, \d{4})/;
                const dateMatch = content.match(dateRegex);

                let result = {
                    startDate: null,
                    activeTime: null
                };

                if (dateMatch && dateMatch[1]) {
                    result.startDate = dateMatch[1].trim();
                    const timeRegex = new RegExp(dateMatch[1] + ' · Total active time (\\d+ hrs)');
                    const timeMatch = content.match(timeRegex);
                    if (timeMatch && timeMatch[1]) {
                        result.activeTime = timeMatch[1].trim();
                    }
                }
                return result;
            }, html);

            return runningInfo;
        } catch (error) {
            console.error('Error extracting running information:', error);
            return { startDate: null, activeTime: null };
        }
    }

    async extractAdvertiserInfo(html) {
        try {
            const advertiserInfo = await this.page.evaluate((htmlContent) => {
                const tempContainer = document.createElement('div');
                tempContainer.innerHTML = htmlContent;

                const hrTag = tempContainer.querySelector('hr');
                if (!hrTag) return { name: null, avatar: null };

                const parentContainer = hrTag.nextElementSibling;
                if (!parentContainer) return { name: null, avatar: null };

                try {
                    const firstLevel = parentContainer.firstElementChild;
                    if (!firstLevel) return { name: null, avatar: null };

                    const secondLevel = firstLevel.firstElementChild;
                    if (!secondLevel) return { name: null, avatar: null };

                    const divs = Array.from(secondLevel.children).filter(el => el.tagName.toLowerCase() === 'div');
                    if (divs.length < 1) return { name: null, avatar: null };

                    const advertiserDiv = divs[0];

                    let avatar = null;
                    const img = advertiserDiv.querySelector('img');
                    if (img && img.src) {
                        avatar = img.src;
                    }

                    let nameText = advertiserDiv.textContent.trim();
                    nameText = nameText.replace(/Sponsored/g, '').trim();

                    return {
                        name: nameText || null,
                        avatar: avatar
                    };
                } catch (error) {
                    console.error('Error navigating structure:', error);
                    return { name: null, avatar: null };
                }
            }, html);

            return advertiserInfo;
        } catch (error) {
            console.error('Error extracting advertiser info:', error);
            return { name: null, avatar: null };
        }
    }

    async extractAdDescription(html, adType) {
        try {
            const result = await this.page.evaluate((htmlContent, adType) => {
                const tempContainer = document.createElement('div');
                tempContainer.innerHTML = htmlContent;
                const htmlString = tempContainer.innerHTML;

                const sponsoredPos = htmlString.indexOf('>Sponsored<');
                if (sponsoredPos === -1) return null;

                const startPos = htmlString.indexOf('>', sponsoredPos + 10) + 1;

                let endPos;
                if (adType === 'video') {
                    endPos = htmlString.indexOf('<video', startPos);
                } else {
                    endPos = htmlString.indexOf('<a', startPos);
                }

                if (endPos === -1) {
                    const possibleEndMarkers = ['<div role="button"', '<button', '<a'];
                    for (const marker of possibleEndMarkers) {
                        const pos = htmlString.indexOf(marker, startPos);
                        if (pos !== -1 && (endPos === -1 || pos < endPos)) {
                            endPos = pos;
                        }
                    }

                    if (endPos === -1) {
                        endPos = htmlString.length;
                    }
                }

                const extractedHtml = htmlString.substring(startPos, endPos);
                const checkContainer = document.createElement('div');
                checkContainer.innerHTML = extractedHtml;

                const numTagsBefore = (extractedHtml.match(/<\/?[^>]+(>|$)/g) || []).length;
                const numTagsAfter = checkContainer.getElementsByTagName('*').length;
                const finalHtml = Math.abs(numTagsBefore - numTagsAfter) > 2
                    ? checkContainer.innerHTML
                    : extractedHtml;

                return { html: finalHtml || null };
            }, html, adType);

            return result;
        } catch (error) {
            console.error('Error extracting ad description:', error);
            return { html: null };
        }
    }

    async extractCallToAction(html, adType) {
        try {
            const callToAction = await this.page.evaluate((htmlContent, adType, buttonTexts) => {
                const tempContainer = document.createElement('div');
                tempContainer.innerHTML = htmlContent;
                const htmlString = tempContainer.innerHTML;

                let startTag, startPos;
                if (adType === 'video') {
                    startTag = '<video';
                    startPos = htmlString.indexOf(startTag);
                } else {
                    startTag = '<a';
                    startPos = htmlString.indexOf(startTag);
                }

                if (startPos === -1) return { text: null, url: null, type: null };

                const closePos = htmlString.indexOf('>Close<', startPos);
                if (closePos === -1) return { text: null, url: null, type: null };

                const segment = htmlString.substring(startPos, closePos);
                const segmentContainer = document.createElement('div');
                segmentContainer.innerHTML = segment;

                // Extract button texts
                const buttonElements = Array.from(segmentContainer.querySelectorAll('[role="button"]'));
                let buttonTextsFound = [];

                buttonElements.forEach(button => {
                    const text = button.textContent.trim();
                    if (text && text !== 'Close') {
                        buttonTextsFound.push(text);
                    }
                });

                // Determine CTA type
                let ctaType = null;
                if (buttonTextsFound.length > 0) {
                    const lastButtonText = buttonTextsFound[buttonTextsFound.length - 1];
                    if (buttonTexts.includes(lastButtonText)) {
                        ctaType = lastButtonText;
                        buttonTextsFound.pop();
                    }
                }

                const ctaText = buttonTextsFound.join(' - ');

                // Extract URL
                let rawUrl = null;
                const links = segmentContainer.querySelectorAll('a[href]');
                if (links.length > 0) {
                    const link = links[0];
                    rawUrl = link.getAttribute('href') || null;
                }

                return {
                    text: ctaText || null,
                    url: rawUrl,
                    type: ctaType || null
                };
            }, html, adType, this.buttonTexts);

            return callToAction;
        } catch (error) {
            console.error('Error extracting call to action:', error);
            return { text: null, url: null, type: null };
        }
    }

    async detectPlatforms(html) {
        try {
            const platforms = await this.page.evaluate((htmlContent) => {
                const foundPlatforms = [];

                // Check for platform-specific CSS patterns
                if (htmlContent.includes('mask-position: 0px -1188px')) {
                    foundPlatforms.push('facebook');
                }
                if (htmlContent.includes('mask-position: 0px -1201px')) {
                    foundPlatforms.push('instagram');
                }
                if (htmlContent.includes('mask-position: -68px -189px')) {
                    foundPlatforms.push('audience_network');
                }
                if (htmlContent.includes('mask-position: -294px -670px')) {
                    foundPlatforms.push('messenger');
                }
                if (htmlContent.includes('mask-position: 0px -1214px')) {
                    foundPlatforms.push('threads');
                }

                return foundPlatforms;
            }, html);

            return platforms;
        } catch (error) {
            console.error('Error detecting platforms:', error);
            return [];
        }
    }

    /**
     * Extracts description content for slider ads
     */
    async extractSliderAdDescription(html) {
        try {
            const descriptionHtml = await this.page.evaluate((htmlContent) => {
                const tempContainer = document.createElement('div');
                tempContainer.innerHTML = htmlContent;
                
                // Let's take a more direct approach by looking at the HTML structure
                // Find text between "Sponsored" and navigation buttons directly
                const htmlString = tempContainer.innerHTML;
                
                // Find "Sponsored" text position
                const sponsoredIndex = htmlString.indexOf('>Sponsored<');
                if (sponsoredIndex === -1) return null;
                
                // Find slider navigation button position
                const navigationIndex = htmlString.indexOf('aria-label="Previous items"');
                if (navigationIndex === -1) return null;
                
                // Make sure navigation comes after sponsored
                if (sponsoredIndex >= navigationIndex) return null;
                
                // Extract the HTML segment between these positions
                const startPos = sponsoredIndex + '>Sponsored<'.length;
                const segment = htmlString.substring(startPos, navigationIndex);
                
                // Create a temporary container with this segment
                const segmentContainer = document.createElement('div');
                segmentContainer.innerHTML = segment;
                
                // Find all paragraph or span elements with text content
                const textElements = segmentContainer.querySelectorAll('p, span');
                let extracted = '';
                
                for (const element of textElements) {
                    // Only keep elements with actual text content
                    if (element.textContent && element.textContent.trim()) {
                        extracted += element.outerHTML;
                    }
                }
                
                return extracted || null;
            }, html);
            
            // Parse the HTML using our helper method
            const parsedDescription = descriptionHtml ? 
                this.parseAdDescription(descriptionHtml) : null;
            
            return { html: parsedDescription };
        } catch (error) {
            console.error('Error extracting slider ad description:', error);
            return { html: null };
        }
    }
    
    parseAdDescription(htmlContent) {
        // Replace <br> tags with newlines
        let formatted = htmlContent.replace(/<br\s*\/?>/gi, '\n');
        
        // Remove all HTML tags but preserve the content
        formatted = formatted.replace(/<[^>]*>/g, '');
        
        // Clean up whitespace
        formatted = formatted.replace(/\s+/g, ' ');
        
        // Clean up consecutive newlines
        formatted = formatted.replace(/\n{3,}/g, '\n\n');
        
        return formatted.trim();
    }

    async extractSliderVideoAds(html) {
        try {
            return 'TODO: Implement slider video extraction';
        } catch (error) {
            console.error('Error extracting slider videos:', error);
            return [];
        }
    }

    async extractSliderImageAds(html) {
        try {
            return 'TODO: Implement slider image extraction';
        } catch (error) {
            console.error('Error extracting slider images:', error);
            return [];
        }
    }
}

module.exports = FacebookScraper;