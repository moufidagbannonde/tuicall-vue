import libGenerateTestUsersigEsMin from "./lib-generate-test-usersig-es.min";

let SDKAppId = 20013712;
let SecretKey = "459dcede1cc23bdcb8b3dcf4e61dfd054794411eb7cb5c5827b85f73d98821bd"

const EXPIRETIME = 259200; // 7 * 24 * 60 * 60 

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