import libGenerateTestUsersigEsMin from "./lib-generate-test-usersig-es.min";


// let SDKAppId = 0; 
// let SecretKey = '';

let SDKAppId = 20015336;
let SecretKey = "55ac0e3ef6475f6545bb089b0423017987d28a8900f00408590018618b01afea";

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