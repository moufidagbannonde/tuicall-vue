import libGenerateTestUsersigEsMin from "./lib-generate-test-usersig-es.min";


// let SDKAppId = 0; 
// let SecretKey = '';

let SDKAppId = 20016319;
let SecretKey = "97f6c34ef3a9bc2ab1ad4dde706cfe9bddadbd80cd4ed1b4f08dd089b6f5f1a0";

// durée d'expiration de la signature de l'utilisateur
const EXPIRETIME = 1296000; // 15 * 24 * 60 * 60 secondes = 15 days(jours)

// générateur de signature de l'utilisateur
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