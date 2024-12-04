import libGenerateTestUsersigEsMin from "./lib-generate-test-usersig-es.min";


// let SDKAppId = 0; 
// let SecretKey = '';

let SDKAppId = 20015286;
let SecretKey = "fa622d02c49da71b883b1675e0ef2bc318bd3ece7758104f313cbaa5031e9bc1";

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