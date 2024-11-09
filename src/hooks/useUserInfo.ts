import { inject } from "vue";
import { UserInfoContextKey, UserInfoContextDefaultValue, type IUserInfoContext } from "../context/userInfoContext";

export default function useUserInfo() {
  return inject<IUserInfoContext>(UserInfoContextKey) || UserInfoContextDefaultValue;
}