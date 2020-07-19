export const CommonActions = {
  SET_IS_MOBILE: 'SET_IS_MOBILE' as const,
};

export function setIsMobile(isMobile: boolean) {
  return {
    type: CommonActions.SET_IS_MOBILE,
    isMobile,
  };
}
