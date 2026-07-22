import axios from 'axios';
import * as cheerio from 'cheerio';

const baseUrl = "https://backloggd.com";

const client = axios.create({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,pt-BR;q=0.8,pt;q=0.7',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
    }
});

function parseNumber(val) {
    if (!val) return null;
    const cleanNum = val.toString().replace(/[^\d]/g, '');
    const parsed = parseInt(cleanNum, 10);
    return isNaN(parsed) ? null : parsed;
}

export async function userInfo(username) {
    try {
        const response = await client.get(`${baseUrl}/u/${username}`);
        const html = response.data;
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
        const response = await client.get(`${baseUrl}/u/${username}/reviews`);
        const html = response.data;
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
        const response = await client.get(`${baseUrl}/u/${username}/badges`);
        const html = response.data;
        const $ = cheerio.load(html);

        let earned = [];
        let locked = [];

        $('.badge-display').each((_, el) => {
            const $badge = $(el);
            const imgSrc = $badge.find('img').attr('src');

            if (!imgSrc) return;

            const title = $badge.find('.badge-title').text().trim();
            const description = $badge.find('.badge-desc').text().trim();

            if (imgSrc.includes('badge_locked.png')) {
                locked.push({
                    title,
                    description,
                    image: imgSrc
                });
            } else {
                const earnedOn = $badge.find('.badge-date time').attr('datetime') || null;
                earned.push({
                    title,
                    description,
                    image: imgSrc,
                    earnedOn
                });
            }
        });

        return {
            earned,
            // locked
        };
    } catch (err) {
        if (err.message && err.message.includes("No badges found"))
            throw err;

        throw new Error(`Error fetching badges for '${username}'.`, { cause: err });
    }
}