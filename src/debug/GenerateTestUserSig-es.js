import libGenerateTestUsersigEsMin from "./lib-generate-test-usersig-es.min";


// let SDKAppId = 0; 
// let SecretKey = '';

let SDKAppId = 20014657;
let SecretKey = "12fba7aae1b6b78f680f2fd13fd8a12bd9015b97f2b35ef194bb2996dcf1bbc8";

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