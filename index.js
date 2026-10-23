import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as cheerio from 'cheerio';
import allBadges from './assets/badges.json' with { type: 'json' };

puppeteer.use(StealthPlugin());

const baseUrl = "https://backloggd.com";

let browserInstance = null;

async function getBrowser() {
    if (!browserInstance || !browserInstance.connected) {
        browserInstance = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1280,800'
            ]
        });
    }
    return browserInstance;
}

async function fetchHtmlWithBypass(url) {
    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
        await page.setViewport({ width: 1280, height: 800 });
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9,pt-BR;q=0.8,pt;q=0.7'
        });

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        await page.waitForFunction(() => {
            const hasAnubis = document.body && document.body.innerText.includes("Certificando de que você não é um bot");
            return !hasAnubis;
        }, { timeout: 20000 }).catch(() => { });

        await page.waitForSelector('.avatar, .user-reviews, .badge-display', { timeout: 10000 }).catch(() => { });

        const html = await page.content();
        return html;
    } finally {
        await page.close();
    }
}

function parseNumber(val) {
    if (!val) return null;
    const cleanNum = val.toString().replace(/[^\d]/g, '');
    const parsed = parseInt(cleanNum, 10);
    return isNaN(parsed) ? null : parsed;
}

export async function userInfo(username) {
    try {
        const html = await fetchHtmlWithBypass(`${baseUrl}/u/${username}`);
        const $ = cheerio.load(html);

        let profileLinks = [];
        let favoriteGames = [];

        const avatarImg = $('.avatar img').first();
        const avatarUrl = avatarImg.length ? avatarImg.attr('src') : null;

        const bioBodyEl = $('#bio-body').text().trim() || null;

        $('#profile-links div').each((_, element) => {
            const link = $(element).find('.secondary-link').attr('href');
            if (link) profileLinks.push(link);
        });

        $('#profile-favorites div .card').each((_, element) => {
            const urlEl = $(element).find('a').attr('href');
            const nameEl = $(element).find('.game-text-centered').text().trim();
            const ultimate = $(element).parent().hasClass('ultimate_fav');

            if (urlEl) {
                favoriteGames.push({
                    name: nameEl,
                    url: `${baseUrl}${urlEl}`,
                    ultimate
                });
            }
        });

        const pfStatsEl = $('#profile-stats').find('div a h1');

        const profileStats = {
            gamesPlayed: parseNumber(pfStatsEl.eq(0).text()),
            playedInCurrentYear: parseNumber(pfStatsEl.eq(1).text()),
            gamesBackloggd: parseNumber(pfStatsEl.eq(2).text())
        };

        return {
            username,
            url: `${baseUrl}/u/${username}`,
            bio: bioBodyEl,
            avatarUrl,
            links: profileLinks,
            favoriteGames,
            stats: profileStats
        };
    } catch (err) {
        if (err.response && err.response.status === 404)
            throw new Error(`User '${username}' not found. Check if the username is correct.`, { cause: err });

        throw new Error(`Error fetching user profile for '${username}'.`, { cause: err });
    }
}

export async function latestReview(username) {
    try {
        const html = await fetchHtmlWithBypass(`${baseUrl}/u/${username}/reviews`);
        const $ = cheerio.load(html);

        const reviewLinkEl = $('.user-reviews div .review-card .open-review-link').first().attr('href');

        if (!reviewLinkEl)
            throw new Error(`No reviews found for user '${username}'.`);

        const latestReviewUrl = `${baseUrl}${reviewLinkEl}`;

        const gameName = $('.user-reviews').find('div .game-name div a h3').first().text().trim() || null;
        const gameUrlEl = $('.user-reviews div .game-name div a').first().attr('href');
        const gameUrl = gameUrlEl ? `${baseUrl}${gameUrlEl}` : null;
        const gameCover = $('.user-reviews').find('.card-img').first().attr('src') || null;

        const gameRatingStyle = $('.user-reviews').find('.stars-top').first().attr('style');
        let gameRating = null;
        if (gameRatingStyle && gameRatingStyle.includes(':')) {
            const widthMatch = gameRatingStyle.match(/\d+/);
            if (widthMatch)
                gameRating = parseInt(widthMatch[0], 10) / 20;
        }

        const playType = $('.user-reviews').find('.play-type').first().text().trim() || null;
        const mastered = $('.review-card').first().find('.mastered-icon').length > 0;
        const platform = $('.review-platform p').first().text().trim() || null;
        const datetime = $('.user-reviews').find('time').first().attr('datetime') || null;

        const likesText = $('.like-counter').first().text().trim();
        const likes = parseNumber(likesText);

        const reviewEl = $('.review-body .card-text').first();
        let reviewText = null;
        if (reviewEl.length) {
            const reviewClone = reviewEl.clone();
            reviewClone.find('br').replaceWith('\n');
            reviewText = reviewClone.text().trim() || null;
        }

        const logsUrl = gameUrlEl ? `${baseUrl}/u/${username}${gameUrlEl.replace('/games/', '/logs/')}` : null;

        return {
            url: latestReviewUrl,
            game: {
                name: gameName,
                url: gameUrl,
                cover: gameCover
            },
            rating: gameRating,
            playType,
            mastered,
            platform,
            datetime,
            likes,
            review: reviewText,
            logsUrl
        };

    } catch (err) {
        if (err.message && err.message.includes("No reviews found"))
            throw err;

        throw new Error(`Error fetching the latest review for '${username}'.`, { cause: err });
    }
}

export async function getBadges(username) {
    try {
        const html = await fetchHtmlWithBypass(`${baseUrl}/u/${username}/badges`);
        const $ = cheerio.load(html);

        const userBadgesMap = new Map();

        $('.badge-display').each((_, el) => {
            const $badge = $(el);
            const rawTitle = $badge.find('.badge-title').text().trim();
            const timeEl = $badge.find('.badge-date time');

            if (rawTitle && timeEl.length > 0) {
                const earnedOn = timeEl.attr('datetime') || null;
                const description = $badge.find('.badge-desc').text().trim();
                const logo = $badge.find('.badge-image img').attr('src') || $badge.find('img').attr('src') || null;

                const normalizedTitle = rawTitle.includes("Years of Service") ? "Years of Service" : rawTitle;

                userBadgesMap.set(normalizedTitle, {
                    title: rawTitle,
                    description,
                    logo,
                    earnedOn
                });
            }
        });

        let earned = [];
        let locked = [];

        const processedTitles = new Set();

        allBadges.forEach(badge => {
            if (userBadgesMap.has(badge.title)) {
                const parsed = userBadgesMap.get(badge.title);
                earned.push({
                    ...badge,
                    title: parsed.title,
                    earnedOn: parsed.earnedOn
                });
                processedTitles.add(badge.title);
            } else {
                locked.push({ ...badge });
            }
        });

        for (const [key, parsedBadge] of userBadgesMap.entries()) {
            if (!processedTitles.has(key)) {
                earned.push({
                    title: parsedBadge.title,
                    description: parsedBadge.description,
                    logo: parsedBadge.logo,
                    earnedOn: parsedBadge.earnedOn
                });
            }
        }

        earned.sort((a, b) => new Date(a.earnedOn) - new Date(b.earnedOn));

        return {
            earned,
            locked
        };
    } catch (err) {
        if (err.message && err.message.includes("No badges found"))
            throw err;

        throw new Error(`Error fetching badges for '${username}'.`, { cause: err });
    }
}