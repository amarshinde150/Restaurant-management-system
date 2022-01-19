const express = require('express');
const authController = require('../controller/control');
const router = express.Router();

router.get('/',(req,res)=>{
    res.status(200).render('index');
});
router.get('/customerLogin',(req,res)=>{
    res.status(200).render('customerLogin');
});
router.get('/employeeLogin',(req,res)=>{
    res.render('employeeLogin');
})
router.get('/employeeLoginAccount',(req,res)=>{
    res.render('employeeLoginAccount');
})
router.get('/forgot',(req,res)=>{
    res.render('forgot');
});

router.get('/changepassword',(req,res)=>{
    res.render('changepassword');
});


//temprory
router.get('/profile1',(req,res)=>{
    res.render('profile1');
})
router.get('/profile2',(req,res)=>{
    res.render('profile2');
})

router.get('/newIndex',(req,res)=>{
    res.render('newIndex');
})
//temprory
router.use((req, res)=>{
     res.status(404).render('error'); 
});



module.exports = router;