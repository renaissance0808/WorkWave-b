import express from 'express';

import { isAssignee } from '../../middlewares/isAssignee.middlewares.js';

const router = express.Router();

router.get('/testing', (req, res) => {
    res.json({"check":'Backend is working'});
});

export default router;