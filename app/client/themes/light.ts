import createMuiTheme from '@material-ui/core/styles/createMuiTheme';
import green from '@material-ui/core/colors/green';
import orange from '@material-ui/core/colors/orange';

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
