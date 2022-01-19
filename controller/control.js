const mysql = require('mysql');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const util = require('util');
const json = require("json");
const { profile } = require('console');
const { hasSubscribers } = require('diagnostics_channel');
const { lookup } = require('dns');
const { accepts } = require('express/lib/request');
const { query } = require('express');
let db = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'restaurant'
});
db.connect(() => {
    console.log("Connected");
    let sql = `create table if not exists users_details(id int primary key AUTO_INCREMENT,name varchar(20),email varchar(50),password varchar(200),isProfileUpdated int default 0,firstName varchar(20),lastName varchar(20),mobileNumber varchar(20),state varchar(20),city varchar(20),area varchar(20),landMark varchar(20),hno varchar(10))`;
    db.query(sql, (err, result) => {
        if (err) throw err;
        else {
            // console.log(result);
            console.log("Created users_details table");
        }
    })
    sql = `create table if not exists food_items(item_id int primary key,item_name varchar(40),item_price int,quantity int,item_type varchar(20),c_id int,foreign key(c_id) references food_category(category_id) on delete cascade)`
    db.query(sql,(err,result)=>{
                if(err)throw err;
                console.log(result);
            })
    sql = `create table if not exists food_category(category_id int primary key,category_name varchar(40),item_count int,description varchar(20))`
    db.query(sql,(err,result)=>{
                        if(err)throw err;
                        console.log(result);
                    })
    console.log("Waiting");
});
module.exports.register = (req, res) => {
    var name = req.body.name;
    var email = req.body.email;
    var password = req.body.password;
    var passwordConfirm = req.body.passwordConfirm;
    // Checking email
    if (!email.includes('@') && !email.includes('.')) {
        res.render('index', { message: 'Incorrect Email Format', color: `<div class="alert-danger" role="alert">` });
    }
    else {
        if (password.length < 6) {
            res.render('index', { message: 'Password should be greater than 6 character', color: '<div class="alert alert-danger" role="alert">' });
        }
        else {
            db.query(`select * from users_details where email = ?`, [email], (err, result) => {
                // console.log(result);
                if (result.length > 0) {
                    res.render('index', { message: 'Email already exists', color: '<div class="alert alert-danger" role="alert">' });
                }
                else {
                    if (password !== passwordConfirm) {
                        res.render('index', { message: 'Incorrect password', color: '<div class="alert alert-danger" role="alert">' });
                    }
                    else {
                        var hashedPass = bcryptjs.hashSync(password, 8);
                        sql = `insert into users_details(name,email,password) values(?,?,?)`
                        db.query(sql, [name, email, hashedPass], (err, result) => {
                            if (err) {
                                console.log(err);
                            };
                            res.render('customerLogin', { message: 'Registered successfully', color: '<div class="alert-success" role="alert">' });
                        });
                    }

                }
            });
        }
    }

}

module.exports.login = (req, res) => {
    sql = 'select * from users_details where email = ?';
    db.query(sql, [req.body.email], (err, result) => {
        if (err) {
            console.log("Error in login");
        }
        if (result.length == 0) {
            res.render('index', { message: 'Incorrect Credentials', color: '<div class="alert-danger" role="alert">' });
        }
        else {
            bcryptjs.compare(req.body.password, result[0].password, function (err, resu) {
                if (err) {
                    console.log(err);
                }
                else {
                    if (resu) {
                        var token = jwt.sign({ id: result[0].id }, 'mysecretpassword', { expiresIn: '90d' });

                        var cookieoption = {
                            expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                            httpOnly: true
                        }
                        res.cookie('jwt', token, cookieoption).redirect('profile');
                    }
                    else {
                        res.render('index', { message: 'Incorrect Credentials', color: '<div class="alert alert-danger" role="alert">' });
                    }
                }
            });
        }
    })
}

module.exports.isLogIn = async (req, res, next) => {
    if (typeof (req.cookies.jwt) != 'undefined') {
        try {
            token = req.cookies.jwt;
            var decoded = await util.promisify(jwt.verify)(token, 'mysecretpassword');
            sql = 'select * from users_details where id = ?';
            db.query(sql, [decoded.id], (err, result) => {
                if (result.length > 0) {
                    req.data = result[0];
                    return next();
                } else {
                    return next();
                }
            })
        } catch (err) {
            // err
            if (err) {
                console.log(err)
            }
            return next();
        }
    } else {
        req.notPresent = true;
        return next();
    }
}

module.exports.forgot = (req, res) => {
    let email = req.body.email;
    let password = req.body.password;
    sql = "select * from users_details where email=?";
    db.query(sql, [email], (err, results) => {
        console.log(results);
        if (err) throw err;
        else if (results.length > 0) {
            sql = "update users_details set password = ? where email = ?";
            hashedPassword = bcryptjs.hashSync(password, 8);
            db.query(sql, [hashedPassword, email], (err, result) => {
                if (err) {
                    res.render('forgot', { message: 'Technical Error While Updating', color: '<div class="alert alert-danger" role="alert">' });
                } else {
                    res.render('index', { message: 'Password Updated Successfully', color: '<div class="alert alert-success" role="alert">' });
                }
            });
        }
        else {
            res.render('forgot', { message: 'Email Not Registered', color: '<div class="alert alert-danger" role="alert">' });
        }
    });
}

module.exports.changepassword = (req, res) => {
    let email = req.body.email;
    let oldpassword = req.body.oldpassword;
    let newpassword = req.body.newpassword;
    sql = "select * from users_details where email=?";
    db.query(sql, [email], (err, resultOfSelect) => {
        if (err) throw err;
        bcryptjs.compare(oldpassword, resultOfSelect[0].password, (err, resultOfComapre) => {
            if (err) throw err;
            if (err) {
                res.render('changepassword', { message: 'Problem while changing password', color: '<div class="alert alert-danger" role="alert">' });
            }
            else if (resultOfComapre) {
                hashedPassword = bcryptjs.hashSync(newpassword, 8);
                sql = "update users_details set password=? where email=?";
                db.query(sql, [hashedPassword, email], (err, resultOfUpdate) => {
                    res.redirect('profile');
                });
            }
            else {
                res.render('changepassword', { message: 'Old password is Incorrect', color: '<div class="alert alert-danger" role="alert">' });
            }
        });
    });
}
module.exports.renderProfile = async (req, res) => {
    let details = {};
    details.name = req.data.name;
    details.email = req.data.email;
    var id = req.data.id;
    details.id = `<div class="selectButton"><a href="/auth/viewCart?id=${id}"><img src="/cart.png"></a></span></div>`;
    if (req.notPresent || typeof (req.data) == 'undefined') {
        res.render('index', { message: 'You are not Logged In', color: '<div class="alert alert-danger" role="alert">' });
    }
    else if (req.data.isProfileUpdated == 0) {

        res.render('profile', {
            details: details, pageContent: `<div class="contentContainer mainH2"><form class="registrationForm"action="/auth/profileupdate" method="post">
        <h2>Update Profile</h2>
        <div class="detailsBox">
            <label for="firstName">First Name</label>
            <input id="firstName" type="text" name="firstName">
        </div>

        <div class="detailsBox">
            <label for="lastName">Last Name</label>
            <input  id="lastName" type="text" name="lastName" required>
        </div>
        <div class="detailsBox">
            <label for="mobileNumber">Mobile Number</label>
            <input  id="mobileNumber" type="text" name="mobileNumber" required>
        </div>
        <div class="detailsBox">
            <label for="state">State</label>
            <select id="state"  name="state" id="state" required>
                <option value="ka">Karnataka</option>
                <option value="mh">Maharastra</option>
                <option value="kl">Kerala</option>
            </select>
        </div>
        <div class="detailsBox">
            <label for="city">City</label>
            <input  id="city" type="text" name="city" required>
        </div>
        <div class="detailsBox">
            <label for="area">Area</label>
            <input  id="area" type="text" name="area" required>
        </div>
        <div class="detailsBox">
            <label for="landMark">LandMark</label>
            <input  id="landMark" type="text" name="landMark" required>
        </div>
        <div class="detailsBox">
            <label for="hno">H.No</label>
            <input id="hno"  type="text" name="hno" required>
        </div>
        <button>Update</button>
    </form></div>`});
    }
    else {
        sql = `select * from food_category`;
        db.query(sql, async (err, result) => {
            var content = `<div class="mainH2">
            <div class="mainHeading">
                <h1>Catergory</h1>
            </div><div class="contentContainer contentContainerWidth">`;
            result.forEach((ele, ind) => {
                content += `<div id='${ind+1000}' class="itemCard">
                        <a
                            href="/Restaurant_Review-g304553-d10505761-Reviews-La_Uppu-Mysuru_Mysore_Mysore_District_Karnataka.html">
                            <div class="lqzIz w">
                                <img src="https://media-cdn.tripadvisor.com/media/photo-s/17/9d/80/e6/dinner-buffet.jpg" style="height: 100%; width: 100%; object-fit: cover;">
                            </div>
                        </a>
                        <div class="gbprQ">
                            <a href="/Restaurant_Review-g304553-d10505761-Reviews-La_Uppu-Mysuru_Mysore_Mysore_District_Karnataka.html"
                                class="bMXqX">${ele.category_name}</a>
                            <a
                                href="/Restaurant_Review-g304553-d10505761-Reviews-La_Uppu-Mysuru_Mysore_Mysore_District_Karnataka.html">
                            </a>
                            <div class="VrsrG Ci S2 H2 f">
                                <span class="eoksp">${ele.description}</span>
                                <span class="fmSAt"></span>
                            </div>
                            <a
                                href="/auth/editCategory/showFoodItemProfile?id=${ele.category_id}&profileId=${id}">
                                <div class="eOAgm">
                                    <button class="fGwNR _G B- z _S c Wc ddFHE ezIjy cXnEL bXBfK"
                                        type="button">Show Food Items</button>
                                </div>
                            </a>
                        </div>
                    </div>`;

            });
            content += `</div>
                    </div>`;
            setTimeout(() => {
                res.render('profile', { details:details,pageContent:content });
            }, 2000);

        });
    }
}

module.exports.logout = (req, res) => {
    res.cookie('jwt', 'logout', {
        expires: new Date(Date.now() + 2 * 1000),
        httpOnly: true
    });
    res.redirect('/');
}
module.exports.profileupdate = (req, res) => {
    if (req.notPresent) {
        res.render('index', { message: 'You are not Logged In', color: '<div class="alert alert-danger" role="alert">' });
    }
    const id = req.data.id;
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const mobileNumber = req.body.mobileNumber;
    const hno = req.body.hno;
    const state = req.body.state;
    const city = req.body.city;
    const area = req.body.area;
    const landMark = req.body.landMark;
    sql = "update users_details set firstName = ?, lastName = ?,mobileNumber = ?,hno = ?,state=?,city = ?,area = ?,landMark = ?,isProfileUpdated=1 where id = ?";
    db.query(sql, [String(firstName), String(lastName), String(mobileNumber), String(hno), String(state), String(city), String(area), String(landMark), String(id)], (err, results) => {
        if (err) throw err;
        else {
            console.log(results.message);
            res.redirect('profile');
        }
    })
}

module.exports.addCategory = (req, res) => {
    const name = req.body.name;
    const desc = req.body.desc;
    if (req.ownerIsHere) {
        sql = "insert into food_category(category_name,item_count,description) values(?,0,?)";
        db.query(sql, [name, desc], (err, result) => {
            if (err) {
                console.log("Error of add category auth");
            }
            else {
                res.redirect('editCategory');
            }
        });
    }
    else {
        res.redirect('editCategory');
    }

}

module.exports.isOwnerIsThere = async (req, res, next) => {
    if (typeof (req.cookies.owner) != 'undefined') {
        req.ownerIsHere = true;
        return next();
    } else {
        req.ownerIsHere = false;
        return next();
    }
}

module.exports.renderAdminPanel = (req, res) => {
    if (req.ownerIsHere) {
        res.render("adminPanel");
    }
    else {
        res.render("employeeLogin");
    }
}
module.exports.editCategory = (req, res) => {
    if (req.ownerIsHere) {
        sql = `select * from food_category`;
        db.query(sql, async (err, result) => {
            var content = '';
            result.forEach((ele, ind) => {
                content += `<div id='${ind}' class="itemCard">
                    <a
                        href="/Restaurant_Review-g304553-d10505761-Reviews-La_Uppu-Mysuru_Mysore_Mysore_District_Karnataka.html">
                        <div class="lqzIz w">
                            <img src="https://media-cdn.tripadvisor.com/media/photo-s/17/9d/80/e6/dinner-buffet.jpg" style="height: 100%; width: 100%; object-fit: cover;">
                        </div>
                    </a>
                    <div class="gbprQ">
                        <a href="/Restaurant_Review-g304553-d10505761-Reviews-La_Uppu-Mysuru_Mysore_Mysore_District_Karnataka.html"
                            class="bMXqX">${ele.category_name}</a>
                        <a
                            href="/Restaurant_Review-g304553-d10505761-Reviews-La_Uppu-Mysuru_Mysore_Mysore_District_Karnataka.html">
                        </a>
                        <div class="VrsrG Ci S2 H2 f">
                            <span class="eoksp">#${ele.description}</span>
                        </div>
                        <div class="VrsrG Ci S2 H2 f">
                            <span class="eoksp">#${ele.category_id}</span>
                        </div>
                        <a href="/auth/editCategory/showFoodItem?id=${ele.category_id}">
                            <div class="eOAgm">
                                <button class="fGwNR _G B- z _S c Wc ddFHE ezIjy cXnEL bXBfK"
                                    type="button">Show Food Items</button>
                            </div>
                        </a>
                    </div>
                </div>`;

            });

            setTimeout(() => {
                res.render("editCategory", { pageContent: content });
            }, 2000);

        });
    } else {
        res.render("editCategory");
    }
}

module.exports.registerEmployee = (req, res) => {
    var name = req.body.name;
    var email = req.body.email;
    var secretKey = req.body.scretKey;
    var password = req.body.password;
    var passwordConfirm = req.body.passwordConfirm;
    // Checking email
    if (secretKey != "mysecret") {
        res.render('employeeLogin', { message: 'Secret Key Mismatch Contact Owner', color: `<div class="alert-danger" role="alert">` });
    }
    else {
        if (!email.includes('@') && !email.includes('.')) {
            res.render('employeeLogin', { message: 'Incorrect Email Format', color: `<div class="alert-danger" role="alert">` });
        }
        else {
            if (password.length < 6) {
                res.render('employeeLogin', { message: 'Password should be greater than 6 character', color: '<div class="alert alert-danger" role="alert">' });
            }
            else {
                db.query(`select * from employee_details where email = ?`, [email], (err, result) => {
                    // console.log(result);

                    if (typeof (result) == 'undefined' || result.length == 0) {
                        if (password !== passwordConfirm) {
                            res.render('employeeLogin', { message: 'Incorrect password', color: '<div class="alert alert-danger" role="alert">' });
                        }
                        else {
                            var hashedPass = bcryptjs.hashSync(password, 8);
                            sql = `insert into employee_details(name,email,password) values(?,?,?)`
                            db.query(sql, [name, email, hashedPass], (err, result) => {
                                if (err) {
                                    console.log(err);
                                };
                                res.render('employeeLogin', { message: 'Registered successfully', color: '<div class="alert-success" role="alert">' });
                            });
                        }

                    }
                    else {
                        res.render('employeeLogin', { message: 'Email already exists', color: '<div class="alert alert-danger" role="alert">' });
                    }
                });
            }
        }

    }

}

module.exports.loginEmployee = (req, res) => {
    sql = 'select * from employee_details where email = ?';
    db.query(sql, [req.body.email], (err, result) => {
        if (err) {
            console.log("Error in Emloyeelogin");
        }
        if (result.length == 0) {
            res.render('employeeLogin', { message: 'Incorrect Credentials', color: '<div class="alert-danger" role="alert">' });
        }
        else {
            bcryptjs.compare(req.body.password, result[0].password, function (err, resu) {
                if (err) {
                    console.log(err);
                }
                else {
                    if (resu) {
                        var token = jwt.sign({ id: result[0].id }, 'mysecretpassword', { expiresIn: '90d' });

                        var cookieoption = {
                            expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                            httpOnly: true
                        }
                        // console.log("Logged in");
                        res.cookie('owner', token, cookieoption).redirect('adminPanel');
                    }
                    else {
                        res.render('employeeLogin', { message: 'Incorrect Credentials', color: '<div class="alert alert-danger" role="alert">' });
                    }
                }
            });
        }
    })
}

module.exports.removeCategory =(req,res)=>{
    const id = req.body.id;
    sql = `delete from food_category where category_id =  ?`;
    db.query(sql,[id],(err,result)=>{
        console.log(err);
        res.redirect('editCategory');
    });
}

module.exports.addCategoryPage = (req, res) => {
    if (req.ownerIsHere) {
        res.render("addCategoryPage");
    }
    else {
        res.redirect("editCategory");
    }
}

module.exports.removeCategoryPage = (req,res)=>{
    if (req.ownerIsHere) {
        res.render("removeCategoryPage");
    }
    else {
        res.redirect("editCategory");
    }
    
}

module.exports.showFoodItem = (req, res) => {
    var category_id  = req.query.id;
    if (req.ownerIsHere) {
        sql = `select * from food_items where c_id = ?`;
        db.query(sql,[category_id],async (err, result) => {
            var content = '';
            result.forEach((ele, ind) => {
                content += `<div id='${ind+100}' class="itemCard">
                    <a
                        href="/Restaurant_Review-g304553-d10505761-Reviews-La_Uppu-Mysuru_Mysore_Mysore_District_Karnataka.html">
                        <div class="lqzIz w">
                            <img src="https://media-cdn.tripadvisor.com/media/photo-s/17/9d/80/e6/dinner-buffet.jpg" style="height: 100%; width: 100%; object-fit: cover;">
                        </div>
                    </a>
                    <div class="gbprQ">
                        <a href="/Restaurant_Review-g304553-d10505761-Reviews-La_Uppu-Mysuru_Mysore_Mysore_District_Karnataka.html"
                            class="bMXqX">${ele.item_name}</a>
                        <a
                            href="/Restaurant_Review-g304553-d10505761-Reviews-La_Uppu-Mysuru_Mysore_Mysore_District_Karnataka.html">
                        </a>
                        <div class="VrsrG Ci S2 H2 f">
                            <span class="eoksp">${ele.item_type}</span>
                        </div>
                        <div class="VrsrG Ci S2 H2 f">
                            <span class="eoksp">&#8377;${ele.item_price}</span>
                        </div>
                            <span class="eoksp">#${ele.item_id}</span>
                    </div>
                    <a href="/auth/editCategory/editFoodItemDetails?id=${ele.item_id}">
                            <div class="eOAgm">
                                <button class="fGwNR _G B- z _S c Wc ddFHE ezIjy cXnEL bXBfK"
                                    type="button">Edit</button>
                            </div>
                        </a>
                </div>`;

            });

            setTimeout(() => {
                res.render("editFoodItems", { pageContent: content });
            }, 3000);

        });
    } else {
        res.render("editCategory");
    }
}

module.exports.addFoodItem = (req,res)=>{
    var name = req.body.name;
    var price = req.body.price;
    var quantity = req.body.quantity;
    var c_id = req.body.c_id;
    if(req.ownerIsHere){
        sql = `insert into food_items(item_name,item_price,quantity,c_id) values(?,?,?,?)`;
        db.query(sql,[name,price,quantity,c_id],(err,result)=>{
            if(err) throw err;
            console.log(result);
            res.redirect(`editCategory/showFoodItem?id=${c_id}`);
        })
    }
    else{
        res.redirect('editFoodItems');
    }
}

module.exports.removeFoodItem = (req,res)=>{
    id = req.body.id;
    if(req.ownerIsHere){
        db.query(`select * from food_items where item_id = ${id}`,(err,result)=>{
            var sql = `delete from food_items where item_id = ?`;
        db.query(sql,[id],(err,results)=>{
            if(err) throw err;
            else{
                console.log("Deleted")
                res.redirect(`editCategory/showFoodItem?id=${result[0].c_id}`);
            }
        })
        })
    }
    else{
        res.redirect(`editCategory/showFoodItem?id=${id}`);
    }

    
}

module.exports.addFoodItemPage = (req,res)=>{
    if(req.ownerIsHere){
        res.render('addFoodItemPage');
    }
    else{
        res.redirect('editFoodItems');
    }
}

module.exports.removeFoodItemPage = (req,res)=>{
    if(req.ownerIsHere){
        res.render("removeFoodItemPage");
    }
    else{
        res.render("/")
    }
}

module.exports.showFoodItemProfile = (req,res)=>{
    var id = req.query.id;
    var profileId = req.query.profileId;
    console.log(profileId);
    var details = {}
    details.name = req.data.name;
    details.email =  req.data.email;
    details.id = `<div class="selectButton"><a href="/auth/viewCart?id=${profileId}"><img src="/cart.png"></a></span></div>`;
        sql = `select * from food_items where c_id = ?`;
        db.query(sql,[id], async (err, result) => {
            var content = `<div class="mainH2">
            <div class="mainHeading">
                <h1>Food Items</h1>
            </div><div class="contentContainer contentContainerWidth">`;
            result.forEach((ele, ind) => {
                content += `<div id='${ind+1000}' class="itemCard">
                        <a
                            href="/Restaurant_Review-g304553-d10505761-Reviews-La_Uppu-Mysuru_Mysore_Mysore_District_Karnataka.html">
                            <div class="lqzIz w">
                                <img src="https://media-cdn.tripadvisor.com/media/photo-s/17/9d/80/e6/dinner-buffet.jpg" style="height: 100%; width: 100%; object-fit: cover;">
                            </div>
                        </a>
                        <div class="gbprQ">
                            <a href="/Restaurant_Review-g304553-d10505761-Reviews-La_Uppu-Mysuru_Mysore_Mysore_District_Karnataka.html"
                                class="bMXqX">${ele.item_name}</a>
                            <a
                                href="/Restaurant_Review-g304553-d10505761-Reviews-La_Uppu-Mysuru_Mysore_Mysore_District_Karnataka.html">
                            </a>
                            <div class="VrsrG Ci S2 H2 f">
                                <span class="eoksp">&#8377;${ele.item_price}</span>
                                <span class="fmSAt"></span>
                            </div>
                            <a href="/auth/editFoodItem/addToCartPage?id=${ele.item_id}&email=${details.email}&profileId=${profileId}">
                                <div class="eOAgm">
                                    <button
                                        class="fGwNR _G B- z _S c Wc ddFHE ezIjy cXnEL bXBfK"
                                        type="button">Add to cart</button>
                                </div>
                            </a>
                        </div>
                    </div>`;

            });
            content += `</div>
                    </div>`;
            setTimeout(() => {
                res.render('profile', { details:details ,pageContent:content });
            }, 2000);

        });
    
}

module.exports.addToCartPage = (req,res)=>{
    var id = req.query.id; 
    var email = req.query.email;
    var profileId = req.query.profileId;
    if(req.notPresent){
        res.render('profile');
    }else{
        idField = `<input type="hidden" name="id" value="${id}"><input type="hidden" name="profileId" value="${profileId}"><input type="hidden" name="email" value="${email}">`
        db.query(`select * from food_items where item_id = ?`,[id],(err,result)=>{
            var name = result[0].item_name;
            var price = result[0].item_price;
            idField += `<input type="text" name="name" placeholder="${name}" disabled></input><input type="text" name="price" placeholder="&#8377;${price}" disabled>`
            res.render("addToCartPage",{idField:idField});
        })
        
    }
}

module.exports.addToCart = (req,res)=>{
    var id = req.body.id;
    var email = req.body.email;
    var profileId = req.body.profileId;
    var quantity = req.body.quantity;
    if(quantity <= 0){
        res.redirect('profile');
    }
    else{
        db.query(`select * from food_items where item_id = ?`,[id],(err,result)=>{
            item_name = result[0].item_name;
            item_price = result[0].item_price;
            var total = item_price * quantity;
            db.query(`insert into cart(profile_id,item_name,item_price,item_quantity,total) value(?,?,?,?,?)`,[profileId,item_name,item_price,quantity,total],(err,result)=>{
                res.redirect('profile');
            });
        });
    }
    
}

module.exports.editFoodItemDetails = (req,res)=>{
    var id = req.query.id;
    db.query(`select * from food_items where item_id=?`,[id],(err,result)=>{
        if(err){
            console.log('-------------------------------------------------')
            console.log(err);
            console.log('-------------------------------------------------')
            console.log("edit food item details");
            res.render('index');
        }
        else{
            var name = result[0].item_name;
        var price = result[0].item_price;
        var type = result[0].item_type;
        console.log(name,price,type);

        content = `<input name="id" type="hidden" value="${id}"/>
            <input name="name" type="text" placeholder="${name}" value ="${name}"/>
            <input name="price" type="text" placeholder="${price}" value="${price}"/>
            <input name="type" type="text" placeholder="${type}"value="${type}"/> `;

        res.render('editFoodItemForm',{pagecontent:content});
        }
        
    })
}

module.exports.editFoodItemForm = (req,res)=>{
    var id = req.body.id;
    var name = req.body.name;
    var price = req.body.price;
    var type = req.body.type;
    db.query(`update food_items set item_name = ?,item_price=?,item_type =? where item_id = ? `,[name,price,type,id],(err,result)=>{
        if(err){
            console.log(err);
            res.render('index');
        }else{
            res.redirect(`editCategory`);
        }
    })
}

module.exports.viewCart = (req,res)=> {
    var id  = req.query.id;
    var details = {}
    db.query(`select * from users_details where id= ?`,[id],(err,resul)=>{
            details.name = resul[0].name;
            details.email =  resul[0].email;
            details.id = `<div class="selectButton"><a href="/auth/viewCart?id=${id}"><img src="/cart.png"></a></span></div>`;
    })
    var total = 0;
    var content = `    <div class="mainH2">
    <div class="mainHeading">
        <h1>My Cart</h1>
    </div>
    <div class="contentContainer contentContainerWidth contentContainerCart">
        <table class="table table-striped">
            <thead>
              <tr>
                <th scope="col">Item name</th>
                <th scope="col">Price</th>
                <th scope="col">Quantity</th>
                <th scope="col">Total</th>
                <th scope="col">Updation</th>
                <th scope="col">Deletion</th>

              </tr>
            </thead>
            <tbody>` ;
        db.query(`select * from cart where profile_id = ?`,[id],(err,result)=>{
            result.forEach(ele =>{
                total += ele.item_price * ele.item_quantity;
                content+=
                `<form action="/auth/updateQuantityValue" method="post">
                    <tr>
                        <input name="cart_id" type="hidden" value="${ele.cart_id}">
                        <input name="userId" type="hidden" value="${id}">
                        <th scope="row">${ele.item_name}</th>
                        <td>${ele.item_price}</td>
                        <td><input name="quantity" class="inputCart" type="text" value="${ele.item_quantity}"></td>
                        <td>${ele.item_price * ele.item_quantity}</td>
                        <td>
                            <button class="cartButton">Update</button>
                        </td>
                        <td>
                            <span class="selectButton"><a href="/auth/deleteCartItem?id=${ele.cart_id}">Delete</a></span>
                        </td>
                      </tr>
                </form>`
            })
            
            setTimeout(() => {
                content += `<form action="/auth/updateQuantityValue" method="post">
                <tr>
                    <input name="cart_id" type="hidden" value="">
                    <th scope="row"></th>
                    <td></td>
                    <td>Total</td>
                    <td>${total}</td>
                    <td>
                        <button class="cartButton"></button>
                    </td>
                    <td>
                        
                    </td>
                  </tr>
            </form>
                </tbody>
                      </table>
                      <button>Order</button>
                </div>
            </div>`;
            // var details = {}
            // details.name = req.data.name;
            // details.email =  req.data.email;
            // details.id = `<div class="selectButton"><a href="/auth/viewCart?id=${profileId}"><img src="/cart.png"></a></span></div>`;
                res.render('profile', { details:details,pageContent:content });
            }, 3000);
        })
}

module.exports.updateQuantityValue = (req,res)=>{
    var quantity = req.body.quantity;
    var cart_id = req.body.cart_id;
    var userId  = req.body.userId;
    db.query(`update cart set item_quantity = ? where cart_id = ?`,[quantity,cart_id],(err,resul)=>{
        res.redirect(`/auth/viewCart?id=${userId}`)
    })
}

module.exports.deleteCartItem = (req,res)=>{
    id = req.query.id;
    db.query(`delete from cart where cart_id = ?`,[id],(req,resu)=>{
        res.redirect('profile');
    })
}