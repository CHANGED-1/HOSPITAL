const router = require('express').Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/appointments.controller');

router.use(authenticate);

router.get('/',    ctrl.list);
router.get('/:id', ctrl.getOne);

router.post('/',
  authorize('admin', 'doctor', 'nurse', 'receptionist'),
  [
    body('patient_id').notEmpty().withMessage('patient_id is required'),
    body('doctor_id').notEmpty().withMessage('doctor_id is required'),
    body('appointment_date').isDate().withMessage('Valid appointment_date is required'),
    body('appointment_time').matches(/^\d{2}:\d{2}(:\d{2})?$/).withMessage('Valid appointment_time (HH:MM) is required'),
  ],
  validate,
  ctrl.create
);

router.patch('/:id',
  authorize('admin', 'doctor', 'nurse', 'receptionist'),
  [body('status').optional().isIn(['scheduled', 'completed', 'cancelled', 'no-show'])],
  validate,
  ctrl.update
);

module.exports = router;