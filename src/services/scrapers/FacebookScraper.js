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
            adData.media.items.forEach(item => {
                console.log(item);
            });
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
                    rawUrl: null,
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
                console.log(`Found slider ad`);
                adData.type = 'slider';
                adData.media.type = 'slider';

                // Extract slider-specific content
                const sliderDescription = await this.extractSliderAdDescription(result.html);
                if (sliderDescription) adData.content.html = sliderDescription.html;

                // Extract all slider media items (could be mix of images and videos)
                const sliderItems = await this.extractSliderMediaAds(result.html);
                adData.media.items = sliderItems || [];
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
                if (callToAction.rawUrl) adData.callToAction.rawUrl = callToAction.rawUrl;
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
                    isSlider: false
                };

                // If not a slider, return early
                if (!prevButton || !nextButton) {
                    return result;
                }

                // It is a slider
                result.isSlider = true;
                return result;
            }, html);

            return sliderResult;
        } catch (error) {
            return { isSlider: false };
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

                if (startPos === -1) return { text: null, url: null, rawUrl: null, type: null };

                const closePos = htmlString.indexOf('>Close<', startPos);
                if (closePos === -1) return { text: null, url: null, rawUrl: null, type: null };

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
                let url = null;
                const links = segmentContainer.querySelectorAll('a[href]');
                if (links.length > 0) {
                    const link = links[0];
                    rawUrl = link.getAttribute('href') || null;
                }

                // Extract actual destination URL from Facebook's redirect URL
                if (rawUrl && rawUrl.includes('facebook.com/')) {
                    try {
                        // Facebook often includes destination URL in the 'u' parameter
                        const urlObj = new URL(rawUrl);
                        if (urlObj.searchParams.has('u')) {
                            const actualUrl = urlObj.searchParams.get('u');
                            if (actualUrl) {
                                url = decodeURIComponent(actualUrl);
                            } else {
                                url = rawUrl;
                            }
                        } else {
                            url = rawUrl;
                        }
                    } catch (e) {
                        // If URL parsing fails, keep the original URL
                        url = rawUrl;
                    }
                } else if (rawUrl) {
                    // Not a Facebook redirect URL, use as is
                    url = rawUrl;
                }

                return {
                    text: ctaText || null,
                    url: url,
                    rawUrl: rawUrl,
                    type: ctaType || null
                };
            }, html, adType, this.buttonTexts);

            return callToAction;
        } catch (error) {
            console.error('Error extracting call to action:', error);
            return { text: null, url: null, rawUrl: null, type: null };
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

                // Find all top-level span elements with text content
                const topLevelSpans = [];

                // Function to find main spans (not nested within other spans)
                const findMainSpans = (parent) => {
                    // Check each child node
                    for (const child of parent.children) {
                        // If it's a span, add it to our collection
                        if (child.tagName && child.tagName.toLowerCase() === 'span') {
                            if (child.textContent && child.textContent.trim()) {
                                topLevelSpans.push(child);
                            }
                        } else {
                            // If it's not a span, recursively check its children
                            findMainSpans(child);
                        }
                    }
                };

                // Start finding spans from the segment container
                findMainSpans(segmentContainer);

                // If we didn't find any main spans, try getting all spans
                if (topLevelSpans.length === 0) {
                    const allSpans = segmentContainer.querySelectorAll('span');
                    for (const span of allSpans) {
                        if (span.textContent && span.textContent.trim()) {
                            topLevelSpans.push(span);
                        }
                    }
                }

                // Extract HTML from the spans
                let extracted = '';
                for (const span of topLevelSpans) {
                    extracted += span.outerHTML;
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
        if (!htmlContent) return null;

        // First replace all <br> tags with newline characters
        let text = htmlContent.replace(/<br\s*\/?>/gi, '\n');

        // Remove all other HTML tags
        text = text.replace(/<[^>]*>/g, '');

        // Decode HTML entities
        text = text.replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");

        // Clean up whitespace but preserve intentional newlines
        text = text.replace(/[ \t]+/g, ' ');

        // Normalize multiple consecutive newlines to just two
        text = text.replace(/\n{3,}/g, '\n\n');

        return text.trim();
    }

    async extractSliderMediaAds(html) {
        try {
            const items = await this.page.evaluate((htmlContent, buttonTexts) => {
                const tempContainer = document.createElement('div');
                tempContainer.innerHTML = htmlContent;

                // Helper method to extract destination URL from Facebook redirect URL
                const extractDestinationUrl = (rawUrl) => {
                    if (!rawUrl) return { url: null, rawUrl: null };
                    
                    let url = rawUrl;
                    try {
                        const urlObj = new URL(rawUrl);
                        if (urlObj.searchParams.has('u')) {
                            const actualUrl = urlObj.searchParams.get('u');
                            if (actualUrl) {
                                url = decodeURIComponent(actualUrl);
                            }
                        }
                    } catch (e) {
                        // If URL parsing fails, keep the original URL
                    }
                    
                    return { url, rawUrl };
                };

                // Method to parse a slider video item
                const parseSliderVideoItem = (item) => {
                    // Navigate down to find the content divs
                    let currentElement = item.firstElementChild;
                    if (!currentElement) return null;

                    // First level
                    if (currentElement.tagName.toLowerCase() !== 'div') return null;
                    currentElement = currentElement.firstElementChild;
                    if (!currentElement) return null;

                    // Second level - should have two divs
                    if (currentElement.tagName.toLowerCase() !== 'div') return null;
                    const contentDivs = Array.from(currentElement.children).filter(
                        el => el.tagName && el.tagName.toLowerCase() === 'div'
                    );

                    if (contentDivs.length < 2) return null;

                    // Extract video from first div
                    const mediaDiv = contentDivs[0];
                    const mediaContainer = document.createElement('div');
                    mediaContainer.innerHTML = mediaDiv.outerHTML;
                    
                    const videoElement = mediaContainer.querySelector('video');
                    if (!videoElement || !videoElement.src) return null;

                    const mediaInfo = {
                        url: videoElement.src,
                        type: 'video'
                    };

                    // Extract CTA directly from second div
                    const ctaDiv = contentDivs[1];
                    const ctaContainer = document.createElement('div');
                    ctaContainer.innerHTML = ctaDiv.outerHTML;

                    // Initialize CTA info
                    const ctaInfo = {
                        url: null,
                        rawUrl: null,
                        type: null,
                        text: null
                    };

                    // Extract button texts
                    const buttonElements = Array.from(ctaContainer.querySelectorAll('[role="button"]'));
                    let buttonTextsFound = [];

                    buttonElements.forEach(button => {
                        const text = button.textContent.trim();
                        if (text && text !== 'Close') {
                            buttonTextsFound.push(text);
                        }
                    });

                    // Determine CTA type
                    if (buttonTextsFound.length > 0) {
                        const lastButtonText = buttonTextsFound[buttonTextsFound.length - 1];
                        if (buttonTexts.includes(lastButtonText)) {
                            ctaInfo.type = lastButtonText;
                            buttonTextsFound.pop();
                        }
                    }

                    // Join remaining button texts as CTA text
                    ctaInfo.text = buttonTextsFound.join(' - ');

                    // Extract URL from links
                    const links = ctaContainer.querySelectorAll('a[href]');
                    if (links.length > 0) {
                        const link = links[0];
                        let rawUrl = link.getAttribute('href') || null;
                        
                        // Process URL using the helper method
                        const urlInfo = extractDestinationUrl(rawUrl);
                        ctaInfo.url = urlInfo.url;
                        ctaInfo.rawUrl = urlInfo.rawUrl;
                    }

                    return {
                        url: mediaInfo.url,
                        type: mediaInfo.type,
                        callToAction: {
                            url: ctaInfo.url,
                            rawUrl: ctaInfo.rawUrl,
                            text: ctaInfo.text,
                            type: ctaInfo.type
                        }
                    };
                };

                // Method to parse a slider image item
                const parseSliderImageItem = (item) => {
                    // Structure for image items: div > div > a
                    let currentElement = item.firstElementChild;
                    if (!currentElement || currentElement.tagName.toLowerCase() !== 'div') return null;
                    
                    currentElement = currentElement.firstElementChild;
                    if (!currentElement || currentElement.tagName.toLowerCase() !== 'div') return null;

                    const linkElement = currentElement.querySelector('a');
                    if (!linkElement) return null;

                    // Within the a tag, we expect divs with the content
                    const contentDivs = Array.from(linkElement.children).filter(
                        el => el.tagName && el.tagName.toLowerCase() === 'div'
                    );

                    if (contentDivs.length < 2) return null;

                    // First div should contain the image
                    const imageDiv = contentDivs[0];
                    const imageElement = imageDiv.querySelector('img');
                    if (!imageElement || !imageElement.src) return null;

                    const mediaInfo = {
                        url: imageElement.src,
                        type: 'image'
                    };

                    // Initialize CTA info
                    const ctaInfo = {
                        url: null,
                        rawUrl: null,
                        type: null,
                        text: ''
                    };

                    // Get the raw URL from the link href and process it
                    let rawUrl = linkElement.getAttribute('href') || null;
                    const urlInfo = extractDestinationUrl(rawUrl);
                    ctaInfo.url = urlInfo.url;
                    ctaInfo.rawUrl = urlInfo.rawUrl;

                    // Extract only type from the second div (no text)
                    if (contentDivs.length >= 2) {
                        const secondDiv = contentDivs[1];
                        const secondDivText = secondDiv.textContent.trim();
                        
                        // Search for any of our known types in the div's text
                        for (const type of buttonTexts) {
                            if (secondDivText.includes(type)) {
                                ctaInfo.type = type;
                                break;
                            }
                        }
                    }

                    // Extract text exclusively from the element after the <a> tag
                    const textElement = linkElement.nextElementSibling;
                    if (textElement) {
                        ctaInfo.text = textElement.textContent.trim();
                    }

                    return {
                        url: mediaInfo.url,
                        type: mediaInfo.type,
                        callToAction: {
                            url: ctaInfo.url,
                            rawUrl: ctaInfo.rawUrl,
                            text: ctaInfo.text,
                            type: ctaInfo.type
                        }
                    };
                };

                // Find all elements with data-type="hscroll-child"
                const sliderItems = Array.from(tempContainer.querySelectorAll('[data-type="hscroll-child"]'));
                console.log(`Found ${sliderItems.length} slider items`);

                // Process each slider item
                const extractedItems = [];

                for (let i = 0; i < sliderItems.length; i++) {
                    const item = sliderItems[i];
                    const itemHtml = item.innerHTML;
                    let extractedItem = null;

                    // First check if this item has a video element
                    if (itemHtml.includes('<video')) {
                        extractedItem = parseSliderVideoItem(item);
                    } else {
                        // If not a video, try to parse as an image
                        extractedItem = parseSliderImageItem(item);
                    }

                    if (extractedItem) {
                        extractedItem.index = i;
                        extractedItems.push(extractedItem);
                    }
                }

                return extractedItems;
            }, html, this.buttonTexts);

            console.log(`Slider items found:`, items.length);
            return items;
        } catch (error) {
            console.error('Error extracting slider items:', error);
            return [];
        }
    }
}

module.exports = FacebookScraper;