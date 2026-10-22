import express from 'express';
import morgan from 'morgan';

import router from './routes.js';

import { HttpError } from './HttpError.js';

const server = express();

server.use(morgan('tiny'));

server.use(express.json());

server.use('/api', router);

// 404 handler
server.use((req, res) => {
  res.status(404).json({ message: 'Content not found!' });
});

// Error handler
server.use((err, req, res, next) => {
  if (err instanceof HttpError) {
    return res.status(err.code).json({ message: err.message });
  }

  return res.status(500).json({ message: 'Something broke!' });
});

server.listen(3000, () => {
  console.log('Monitor API listening on port 3000');
});
