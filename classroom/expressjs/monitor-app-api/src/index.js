import express from 'express';
import morgan from 'morgan';

import router from './routes.js';

const server = express();

server.use(morgan('tiny'));

server.use('/api', router);

server.listen(3000, () => {
  console.log('Monitor API listening on port 3000');
});
