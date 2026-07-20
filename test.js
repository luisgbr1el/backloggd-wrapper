const backloggd = require("./index");

async function test() {
    let userInfo = await backloggd.userInfo("luisgbr1el");
    console.log(userInfo);

    let latestReview = await backloggd.latestReview("luisgbr1el");
    console.log(latestReview);
}

test();