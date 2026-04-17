const router = require('express').Router();

router.use('/auth',      require('./auth.routes'));
router.use('/users',     require('./users.routes'));
router.use('/patients',  require('./patients.routes'));
router.use('/appointments', require('./appointments.routes'));
router.use('/opd',       require('./opd.routes'));
router.use('/ipd',       require('./ipd.routes'));
router.use('/pharmacy',  require('./pharmacy.routes'));
router.use('/billing',   require('./billing.routes'));

module.exports = router;