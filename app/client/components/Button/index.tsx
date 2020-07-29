import Button from '@material-ui/core/Button';
import styled from '@material-ui/core/styles/styled';

export default styled(Button)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: '#fff',

  '&:hover': {
    backgroundColor: theme.palette.primary.light,
  },
}));
