const router = require('express').Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/ipd.controller');

router.use(authenticate);

router.get('/',    ctrl.list);
router.get('/:id', ctrl.getOne);

router.post('/',
  authorize('admin', 'doctor', 'nurse', 'receptionist'),
  [
    body('patient_id').notEmpty().withMessage('patient_id is required'),
    body('admission_date').isDate().withMessage('Valid admission_date is required'),
  ],
  validate,
  ctrl.admit
);

router.patch('/:id',
  authorize('admin', 'doctor', 'nurse'),
  [body('status').optional().isIn(['admitted', 'discharged', 'transferred'])],
  validate,
  ctrl.update
);

module.exports = router;