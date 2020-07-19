import { createMuiTheme } from '@material-ui/core';
import { green, orange } from '@material-ui/core/colors';

export default createMuiTheme({
  palette: {
    primary: green,
    secondary: orange,
  },
  typography: {
    fontSize: 14,
    fontFamily: '"Trebuchet MS", Helvetica, sans-serif',
  },
});
