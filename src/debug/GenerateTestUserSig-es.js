import libGenerateTestUsersigEsMin from "./lib-generate-test-usersig-es.min";


// let SDKAppId = 0; 
// let SecretKey = '';

let SDKAppId = 20020076;
let SecretKey = "d17ccfbb0caa428bb99b0d7deb2a63b7ea6e8d25534677eb741839916c5802cb";

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