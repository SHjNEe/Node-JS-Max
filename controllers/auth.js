const User = require("../models/user");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const sendgridTransport = require("nodemailer-sendgrid-transport");
const { validationResult } = require("express-validator/check");

const transporter = nodemailer.createTransport(
  sendgridTransport({
    auth: {
      api_key:
        "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",
    },
  })
);
exports.getLogin = (req, res, next) => {
  res.render("auth/login", {
    path: "/login",
    pageTitle: "Login",
    isAuthenticated: false,
    errorMessage: req.flash("error"),
    oldInput: {
      email: "",
      password: "",
    },
    validationError: [],
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render("auth/login", {
      path: "/login",
      pageTitle: "Login",
      errorMessage: errors.array()[0].msg,
      oldInput: {
        email: email,
        password: password,
      },
      validationError: errors.array(),
    });
  }
  User.findOne({ email: email }).then((user) => {
    if (!user) {
      return res.render("auth/login", {
        path: "/login",
        pageTitle: "Login",
        errorMessage: "Email is not used !",
        oldInput: {
          email: email,
          password: password,
        },
        validationError: errors.array(),
      });
    }
    bcrypt
      .compare(password, user.password)
      .then((match) => {
        if (!match) {
          return res.render("auth/login", {
            path: "/login",
            pageTitle: "Login",
            errorMessage: "Password is wrong!",
            oldInput: {
              email: email,
              password: password,
            },
            validationError: errors.array(),
          });
        }
        req.session.isLoggedIn = true;
        req.session.user = user;
        return req.session.save((err) => {
          console.log(err);
          res.redirect("/");
        });
      })
      .catch((err) => res.redirect("/login"));
  });
};

exports.getSignup = (req, res, next) => {
  res.render("auth/signup", {
    path: "/sigup",
    pageTitle: "Sign up",
    errorMessage: req.flash("error"),
    oldInput: {
      email: "",
      password: "",
      confirmPassword: "",
    },
    validationError: [],
  });
};

exports.postSignup = (req, res, next) => {
  const name = req.body.name;
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;
  console.log(validationResult(req));
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render("auth/signup", {
      path: "/sigup",
      pageTitle: "Sign up",
      errorMessage: errors.array()[0].msg,
      oldInput: {
        email: email,
        password: password,
        confirmPassword: confirmPassword,
      },
      validationError: errors.array(),
    });
  }

  bcrypt
    .hash(password, 12)
    .then((hashedPassword) => {
      const user = new User({
        name,
        email,
        password: hashedPassword,
        cart: { items: [] },
      });
      return user.save();
    })

    .then((result) => {
      res.redirect("/login");
      return transporter.sendMail({
        to: email,
        from: "baotrung.jpvn@gmail.com",
        subject: "Signup succeeded!",
        html: "<h1>You successfully signed up!</h1>",
      });
    })
    .catch((error) => console.log(error));
};

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    console.log(err);
    res.redirect("/");
  });
};

exports.getReset = (req, res, next) => {
  res.render("auth/reset", {
    path: "/reset",
    pageTitle: "Reset Password",
    isAuthenticated: false,
    errorMessage: req.flash("error"),
  });
};

exports.postReset = (req, res, next) => {
  const email = req.body.email;
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
      return res.redirect("/");
    }
    const token = buffer.toString("hex");
    User.findOne({ email: email })
      .then((user) => {
        if (!user) {
          req.flash("error", "No account with that email");
          return res.redirect("/reset");
        }
        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 3600000;
        return user.save();
      })
      .then((result) => {
        console.log(`http://localhost:3000/reset/${token}`);
        res.redirect("/");
        transporter.sendMail({
          to: email,
          from: "baotrung.jpvn@gmail.com",
          subject: "Password reset!",
          html: `<h1>You requested a password!</h1>
                <p> Click this <a href="http://localhost:3000/reset/${token}"> Link</a> To reset a new password!`,
        });
      });
  });
};

exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;
  User.findOne({
    resetToken: token,
    resetTokenExpiration: {
      $gt: Date.now(),
    },
  })
    .then((user) => {
      res.render("auth/new-password", {
        path: "/new-password",
        pageTitle: "Update Password",
        errorMessage: req.flash("error"),
        userId: user._id.toString(),
        passwordToken: token,
      });
    })
    .catch((err) => console.error(err));
};

exports.postNewPassword = (req, res, next) => {
  const newPassword = req.body.password;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;
  let resetUser;

  User.findOne({
    resetToken: passwordToken,
    resetTokenExpiration: { $gt: Date.now() },
    _id: userId,
  })
    .then((user) => {
      resetUser = user;
      return bcrypt.hash(newPassword, 12);
    })
    .then((hashedPassword) => {
      resetUser.password = hashedPassword;
      resetUser.resetToken = undefined;
      resetUser.resetTokenExpiration = undefined;
      return resetUser.save();
    })
    .then((result) => {
      res.redirect("/login");
    })
    .catch((err) => {
      console.log(err);
    });
};
