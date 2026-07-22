import { userInfo, latestReview, getBadges } from './index.js';

async function test() {
    try {
        const user = await userInfo("luisgbr1el");
        console.log(user);

        const review = await latestReview("luisgbr1el");
        console.log(review);

        const badges = await getBadges("luisgbr1el");
        console.log(badges);
    } catch (error) {
        console.error("Error:", error.message);
        
        if (error.cause)
            console.error("Cause:", error.cause);
    }
}

test();