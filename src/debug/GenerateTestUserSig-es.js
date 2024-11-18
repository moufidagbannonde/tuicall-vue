import libGenerateTestUsersigEsMin from "./lib-generate-test-usersig-es.min";

let SDKAppId = 20014601;
let SecretKey = "76511b9b4c801d3ae63d3cdee238b8f201d148a73e464267e2c6e54b597422f8";

const EXPIRETIME = 1296000; // 15 * 24 * 60 * 60 secondes = 15 jours

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