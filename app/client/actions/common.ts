export enum CommonActions {
  SET_IS_MOBILE = 'SET_IS_MOBILE'
}

export interface SetIsMobileAction {
  type: CommonActions.SET_IS_MOBILE;
  isMobile: boolean;
}

export function setIsMobile(isMobile: boolean): SetIsMobileAction {
  return {
    type: CommonActions.SET_IS_MOBILE,
    isMobile
  };
}
