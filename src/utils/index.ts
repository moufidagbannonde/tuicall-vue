
export function trim(str: string) {
    return str.replace(/\s/g, "");
  }
  
  export function checkUserID(userID: string) {
    const regex = /^[a-zA-Z0-9_-]{1,32}$/;
    return regex.test(userID);
  }

  export function setLocalStorage(key: string, value: string) {
    localStorage.setItem(key, value);
  }
  
  export function getLocalStorage(key: string) {
    return localStorage.getItem(key);
  }
  export function getUrl() {
    return window?.location.href;
  }