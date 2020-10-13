### Major Features/Improvements

- profile
- sounds for game start/end, possibly check
- finish editor
- analysis
- export fen/pgn
- import games
- disconnects
- on game data only apply moves if game exists
- atomic animation
- allow unauthorized users to draw symbols
- add variant icons
- optimize moves panel further
- abort game
- abort game on timeout
- draw/resign/takeback after 2 moves
- write game tests
- validate fen (not game end)
- add more logging
- forgot/reset password
- start drag on touchmove/mousemove
- add symbols in examples
- finish rules
- improve rematch system for correspondence
- remove unlimited games

### Minor Improvements/Refactor

- don't store material in move for each player (store diff)
- add double check win reason
- migrate from font-awesome
- remove moves panel from 960 example
- merge gamesrules and gamerules (rename to rules)
- tooltip wrapper component
- move gamevariant option (for gamevariantselect) to separate component
- change switch board button icon
- use .env
- send move strings to client
- show piece worth for comp chess
- improve check display in 3check
- optimize fetching players for correspondence (id: in ids)

### Bugs/Important Features or Improvements

- when redirecting from challenge setup socket immediately
- fix board shift animation
- improve mobile layout
- improve game loading screen
- mobile settings
- make action buttons smaller
- cancel selection on outside board click
- review 50-move rule and variant combinations
- remove allowed moves after the game
- validate en passant square right

### Variants

- no castling
