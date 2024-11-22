import libGenerateTestUsersigEsMin from "./lib-generate-test-usersig-es.min";


// let SDKAppId = 0; 
// let SecretKey = '';

let SDKAppId = 40000517;
let SecretKey = "4ce6abda7d37c93333663dc0d9fde8f157c8962a08e05e77908174272f32d343";

const EXPIRETIME = 1296000; // 15 * 24 * 60 * 60 secondes = 15 days(jours)

export function genTestUserSig(params){
    if(params.SDKAppId) SDKAppId = params.SDKAppId;
    if(params.SecretKey) SecretKey = params.SecretKey;
    const generator = new libGenerateTestUsersigEsMin(SDKAppId, SecretKey, EXPIRETIME);
    const userSig = generator.genTestUserSig(params.userID);

    return {
        SDKAppId,
        SecretKey,
        userSig
    };

}

export default genTestUserSig;