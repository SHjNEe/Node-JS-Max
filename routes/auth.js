const express = require("express");
const { check, body } = require("express-validator/check");
const authController = require("../controllers/auth");
const User = require("../models/user");
const router = express.Router();

router.get("/login", authController.getLogin);
router.get("/signup", authController.getSignup);

router.post(
  "/login",
  [
    body("email")
      .isEmail()
      .withMessage("Please enter a valid email")
      .normalizeEmail(),
    body("password", "Password has to be valid")
      .isLength({ min: 5 })
      .isAlphanumeric()
      .trim(),
  ],
  authController.postLogin
);
router.post(
  "/signup",
  [
    check("email", "Please enter a valid email")
      .isEmail()
      .normalizeEmail()
      .custom((value, { req }) => {
        // if (value === "test@test.com") {
        //   throw new Error("This email adress if forbiden.");
        // }
        // return true;
        return User.findOne({ email: value }).then((userDoc) => {
          if (userDoc) {
            return Promise.reject("Email is exist !");
          }
        });
      }),

    body(
      "password",
      "Pleas enter password with only numbers and text and at least 5 characters"
    )
      .isLength({ min: 5 })
      .isAlphanumeric()
      .trim(),
    body("confirmPassword").custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Password have to match!");
      }
      return true;
    }),
  ],
  authController.postSignup
);

router.get("/reset", authController.getReset);
router.post("/reset", authController.postReset);

router.get("/reset/:token", authController.getNewPassword);
router.post("/new-password", authController.postNewPassword);

router.post("/logout", authController.postLogout);

module.exports = router;
