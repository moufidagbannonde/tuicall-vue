import useAegis from "@/hooks/useAegis";
import useChat from "@/hooks/useChat";
import useUserInfo from "@/hooks/useUserInfo";
import { checkUserID, trim } from "@/utils";
import { TUICallKitServer, TUICallType } from "@tencentcloud/call-uikit-vue";
import { toRefs, type Ref } from "vue";

export default function useGroupCall() {
    const { reportEvent } = useAegis();
    const { createGroupID } = useChat();
    const userInfo = toRefs(useUserInfo());
  
    const groupCall = async (groupCallMember: Ref<string[]>) => {
      reportEvent({ apiName: 'groupCall.start' });
      if (groupCallMember.value.length < 1) {
        alert({
          message: `${('Please add at least one member')}`,
          type: 'error',
        })
        return;
      }
      userInfo.isCall.value = true;
      try {
        const groupID = await createGroupID(groupCallMember.value);
        await TUICallKitServer.groupCall({
          userIDList: groupCallMember.value, 
          groupID,
          type: userInfo?.currentCallType.value === 'video' ? TUICallType.VIDEO_CALL : TUICallType.AUDIO_CALL,
        })
        reportEvent({ apiName: 'groupCall.success'});
      } catch (error) {
        userInfo.isCall.value = false;
        alert('groupCall error');
      }
    }
  
    const inputUserIDHandler = (inputUserID: Ref<string>) => {
      inputUserID.value = trim(inputUserID.value);
    }
  
    const addGroupCallMemberHandler = (inputUserID: Ref<string>, groupCallMember: Ref<string[]>) => {
      if (!inputUserID.value) return;
      if (!checkUserID(inputUserID.value)) {
        alert({
          message: `${('Please input the correct userID')}`,
          type: 'error',
        })
        return;
      }
      if (groupCallMember.value.includes(inputUserID.value)) {
        alert({
          message: `${('The user already exists')}`,
          type: 'error',
        })
        return;
      }
      if (inputUserID.value === userInfo?.userID.value) {
        alert({
          message: `${("You can't add yourself")}`,
          type: 'error',
        })
        inputUserID.value = '';
        return;
      }
      if (groupCallMember.value.length < 8) {
        groupCallMember.value = [...groupCallMember.value, inputUserID.value]
      } else {
        alert({
          message: `${("The group is full")}`,
          type: 'error',
        })
      }
      inputUserID.value = '';
    }
  
    const deleteGroupCallUserHandler = (userID: string, groupCallMember: Ref<string[]>) => {
      groupCallMember.value = groupCallMember.value.filter(item => item !== userID);
    }
  
    
    return {
      groupCall,
      inputUserIDHandler,
      addGroupCallMemberHandler,
      deleteGroupCallUserHandler,
    }
  }