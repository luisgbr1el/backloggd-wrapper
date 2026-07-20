# backloggd-wrapper

A lightweight Node.js wrapper for scraping user profiles, statistics, and review data from [Backloggd](https://backloggd.com).

## Installation

Install via npm:

```bash
npm install backloggd-wrapper
```

## Features
- Fetch basic user profile details, favorite games, and stats.
- Extract the latest user review with ratings, play types, and formatted review text with line breaks preserved.
- Dual ESM and CommonJS support (`import` / `require`).
- Built-in error handling for missing users or empty review histories with original error causes attached.

## Usage
### 1. Get user profile information
Retrieve a user's bio, avatar, social links, favorite games, and profile stats.

#### ES Modules (ES6)

```js
import { userInfo } from 'backloggd-wrapper';

async function getUser() {
    try {
        const data = await userInfo('username');
        console.log(data);
    } catch (error) {
        console.error(error.message);
    }
}

getUser();
```

#### CommonJS

```js
const { userInfo } = await import('backloggd-wrapper');

async function getUser() {
    try {
        const data = await userInfo('username');
        console.log(data);
    } catch (error) {
        console.error(error.message);
    }
}

getUser();
```

#### Example output
```json
{
    "username": "username",
    "url": "https://backloggd.com/u/username",
    "bio": "Gamer and reviewer.",
    "avatarUrl": "https://backloggd.com/images/avatars/example",
    "links": [
        "https://twitter.com/example"
    ],
    "favoriteGames": [
        {
            "name": "Super Mario Odyssey",
            "url": "[https://backloggd.com/games/super-mario-odyssey/](https://backloggd.com/games/super-mario-odyssey/)",
            "ultimate": true
        }
    ],
    "stats": {
        "gamesPlayed": 150,
        "playedInCurrentYear": 24,
        "gamesBackloggd": 85
    }
}
```

### 2. Get latest user review
Retrieve details about the most recent review published by a given user.

#### ES Modules (ES6)

```js
import { latestReview } from 'backloggd-wrapper';

async function getReview() {
    try {
        const review = await latestReview('username');
        console.log(review);
    } catch (error) {
        console.error(error.message);
    }
}

getReview();
```

#### CommonJS

```js
const { latestReview } = await import('backloggd-wrapper');

async function getReview() {
    try {
        const review = await latestReview('username');
        console.log(review);
    } catch (error) {
        console.error(error.message);
    }
}

getReview();
```

#### Example output

```json
{
    "url": "https://backloggd.com/u/username/review/123456",
    "game": {
        "name": "GRIS",
        "url": "https://backloggd.com/games/gris/",
        "cover": "https://backloggd.com/images/covers/gris.jpg"
    },
    "rating": 4.5,
    "playType": "Completed",
    "mastered": true,
    "platform": "Nintendo Switch",
    "datetime": "2026-03-15T18:30:00.000Z",
    "likes": 12,
    "review": "A visually stunning experience with an incredible soundtrack.\nHighly recommended.",
    "logsUrl": "https://backloggd.com/u/username/logs/gris/"
}
```

## Error handling
All functions throw errors with descriptive messages. You can access the original underlying error via `error.cause`.

```js
import { userInfo } from 'backloggd-wrapper';

try {
    await userInfo('invalid_username_12345');
} catch (error) {
    console.error(error.message); // "User 'invalid_username_12345' not found. Check if the username is correct."
    if (error.cause) {
        console.error(error.cause); // Original Axios or processing error
    }
}
```

## License
MIT