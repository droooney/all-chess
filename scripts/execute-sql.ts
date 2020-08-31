import db from 'server/db';

let queue = Promise.resolve();

const prompt = () => process.stdout.write('sql> ');

prompt();

process.stdin.on('data', (data) => {
  queue = (async () => {
    try {
      await queue;

      console.log((await db.query(data.toString()))[0]);
    } catch (err) {
      console.log(err);
    } finally {
      prompt();
    }
  })();
});
