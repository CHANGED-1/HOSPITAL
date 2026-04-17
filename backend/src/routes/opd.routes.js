const router = require('express').Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/opd.controller');

router.use(authenticate);

router.get('/',    ctrl.list);
router.get('/:id', ctrl.getOne);

router.post('/',
  authorize('admin', 'doctor', 'nurse', 'receptionist'),
  [
    body('patient_id').notEmpty().withMessage('patient_id is required'),
    body('visit_date').isDate().withMessage('Valid visit_date is required'),
  ],
  validate,
  ctrl.create
);

router.patch('/:id',
  authorize('admin', 'doctor', 'nurse'),
  [body('status').optional().isIn(['waiting', 'in-progress', 'completed'])],
  validate,
  ctrl.update
);

module.exports = router;