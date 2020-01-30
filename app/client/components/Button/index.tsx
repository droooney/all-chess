import { Button, styled } from '@material-ui/core';

export default styled(Button)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: '#fff',

  '&:hover': {
    backgroundColor: theme.palette.primary.light
  }
}));
